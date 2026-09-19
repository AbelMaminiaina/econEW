import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Order, PaymentStatus } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { authenticate, optionalAuthenticate, requirePlatformAdmin } from '../middleware/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import { getPaymentMethod, getPaymentMethods, paymentMethodLabel } from '../lib/payments.js';
import { sendPaymentConfirmedEmail, sendPaymentRejectedEmail } from '../services/emailService.js';

const router = Router();

// Paiement Mobile Money vérifié manuellement : le client envoie l'argent au numéro marchand puis
// transmet la référence de la transaction ; un administrateur confirme ou refuse.
// Toutes les commandes d'un même panier (checkoutGroup) sont réglées par un seul paiement.

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Trop de tentatives. Réessayez dans quelques minutes.',
});

const submitSchema = z.object({
  orderNumber: z.string().trim().min(1),
  email: z.string().trim().email().optional(),
  reference: z
    .string()
    .trim()
    .min(4, 'Référence de transaction trop courte')
    .max(60, 'Référence de transaction trop longue')
    .regex(/^[A-Za-z0-9._\-/ ]+$/, 'Référence invalide'),
  payerPhone: z.string().trim().min(6, 'Numéro Mobile Money requis').max(30),
});

const rejectSchema = z.object({
  reason: z.string().trim().min(3, 'Motif requis').max(300),
});

type GroupOrder = Order & { seller?: { name: string } | null };

// Toutes les commandes du panier auquel appartient la commande donnée
async function loadGroup(orderNumber: string): Promise<GroupOrder[] | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { seller: { select: { name: true } } },
  });
  if (!order) return null;
  if (!order.checkoutGroup) return [order];
  return prisma.order.findMany({
    where: { checkoutGroup: order.checkoutGroup },
    include: { seller: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

// Propriétaire (compte connecté) ou visiteur ayant passé la commande (e-mail saisi à la commande)
function canAccess(req: Request, order: Order, email?: string): boolean {
  if (req.user) {
    if (req.user.role === 'platform_admin') return true;
    if (order.userId && order.userId === req.user.userId) return true;
    if (order.companyId && order.companyId === req.user.companyId) return true;
    return false;
  }
  return !!email && !!order.guestEmail && order.guestEmail.toLowerCase() === email.toLowerCase();
}

function aggregateStatus(orders: Order[]): PaymentStatus {
  const active = orders.filter((o) => o.status !== 'cancelled');
  if (active.length === 0) return 'awaiting';
  if (active.every((o) => o.paymentStatus === 'paid')) return 'paid';
  if (active.some((o) => o.paymentStatus === 'rejected')) return 'rejected';
  if (active.some((o) => o.paymentStatus === 'submitted')) return 'submitted';
  return 'awaiting';
}

function summarize(orders: GroupOrder[]) {
  const active = orders.filter((o) => o.status !== 'cancelled');
  const reference = orders.find((o) => o.paymentReference) ?? orders[0];
  const method = getPaymentMethod(orders[0].paymentMethod);
  return {
    paymentStatus: aggregateStatus(orders),
    method: orders[0].paymentMethod,
    methodLabel: paymentMethodLabel(orders[0].paymentMethod),
    // Numéro marchand toujours issu de la configuration courante
    number: method?.number ?? null,
    accountName: method?.accountName ?? null,
    totalAmount: active.reduce((sum, o) => sum + o.total, 0),
    reference: reference.paymentReference,
    payerPhone: reference.paymentPayerPhone,
    submittedAt: reference.paymentSubmittedAt,
    paidAt: orders.find((o) => o.paidAt)?.paidAt ?? null,
    rejectionReason: orders.find((o) => o.paymentRejectionReason)?.paymentRejectionReason ?? null,
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      sellerName: o.seller?.name ?? null,
      total: o.total,
      status: o.status,
      paymentStatus: o.paymentStatus,
    })),
  };
}

function buyerOf(order: Order & {
  company?: { name: string; contactEmail: string; contactPhone?: string | null } | null;
  user?: { firstName: string; lastName: string; email: string; phone?: string | null } | null;
}) {
  return {
    name: order.company?.name ?? (order.user ? `${order.user.firstName} ${order.user.lastName}` : order.guestName ?? 'N/A'),
    email: order.company?.contactEmail ?? order.user?.email ?? order.guestEmail ?? null,
    phone: order.company?.contactPhone ?? order.user?.phone ?? order.guestPhone ?? null,
  };
}

// Moyens de paiement proposés (numéros marchands)
router.get('/methods', (_req: Request, res: Response) => {
  res.json({ methods: getPaymentMethods() });
});

// État du paiement d'une commande (et des commandes de son panier)
router.get('/status', optionalAuthenticate, paymentLimiter, async (req: Request, res: Response) => {
  try {
    const orderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber.trim() : '';
    const email = typeof req.query.email === 'string' ? req.query.email.trim() : undefined;
    if (!orderNumber) return res.status(400).json({ error: 'Numéro de commande requis' });

    const orders = await loadGroup(orderNumber);
    // Même réponse pour « introuvable » et « pas la vôtre »
    if (!orders || !canAccess(req, orders[0], email)) {
      return res.status(404).json({ error: 'Aucune commande ne correspond à ces informations' });
    }
    res.json(summarize(orders));
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

// Le client transmet la référence de sa transaction Mobile Money
router.post('/submit', optionalAuthenticate, paymentLimiter, async (req: Request, res: Response) => {
  try {
    const data = submitSchema.parse(req.body);

    const orders = await loadGroup(data.orderNumber);
    if (!orders || !canAccess(req, orders[0], data.email)) {
      return res.status(404).json({ success: false, error: 'Aucune commande ne correspond à ces informations' });
    }

    const active = orders.filter((o) => o.status !== 'cancelled');
    if (active.length === 0) {
      return res.status(400).json({ success: false, error: 'Cette commande est annulée' });
    }
    if (active.every((o) => o.paymentStatus === 'paid')) {
      return res.status(409).json({ success: false, error: 'Cette commande est déjà payée' });
    }

    // Une même transaction ne peut pas justifier deux paniers différents
    const groupIds = orders.map((o) => o.id);
    const reused = await prisma.order.findFirst({
      where: {
        paymentReference: { equals: data.reference, mode: 'insensitive' },
        paymentStatus: { in: ['submitted', 'paid'] },
        id: { notIn: groupIds },
      },
      select: { id: true },
    });
    if (reused) {
      return res.status(409).json({
        success: false,
        error: 'Cette référence de transaction est déjà utilisée pour une autre commande',
      });
    }

    await prisma.order.updateMany({
      where: { id: { in: active.filter((o) => o.paymentStatus !== 'paid').map((o) => o.id) } },
      data: {
        paymentStatus: 'submitted',
        paymentReference: data.reference,
        paymentPayerPhone: data.payerPhone,
        paymentSubmittedAt: new Date(),
        paymentRejectionReason: null,
      },
    });

    res.json({
      success: true,
      message: 'Référence reçue. Votre paiement va être vérifié.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0]?.message ?? 'Données invalides',
        details: error.errors,
      });
    }
    console.error('Error submitting payment:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de l’enregistrement du paiement' });
  }
});

// Admin : paiements à vérifier (par défaut) ou filtrés par statut, regroupés par panier
router.get('/admin', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const filter = typeof req.query.status === 'string' ? req.query.status : 'submitted';
    const statusWhere =
      filter === 'all'
        ? {}
        : { paymentStatus: (['awaiting', 'submitted', 'paid', 'rejected'].includes(filter) ? filter : 'submitted') as PaymentStatus };

    const orders = await prisma.order.findMany({
      where: { ...statusWhere, ...(filter === 'paid' ? {} : { status: { not: 'cancelled' } }) },
      include: {
        seller: { select: { name: true } },
        company: { select: { name: true, contactEmail: true, contactPhone: true } },
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const groups = new Map<string, typeof orders>();
    for (const order of orders) {
      const key = order.checkoutGroup ?? order.id;
      groups.set(key, [...(groups.get(key) ?? []), order]);
    }

    res.json({
      payments: [...groups.values()].map((group) => {
        const first = group[0];
        return {
          id: first.id,
          buyer: buyerOf(first),
          ...summarize(group),
          // Total de ce qui est affiché dans le groupe (les commandes filtrées uniquement)
          totalAmount: group.reduce((sum, o) => sum + o.total, 0),
          createdAt: first.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

async function loadGroupForAdmin(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  return prisma.order.findMany({
    where: order.checkoutGroup ? { checkoutGroup: order.checkoutGroup } : { id: order.id },
    include: {
      company: { select: { name: true, contactEmail: true, contactPhone: true } },
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });
}

// Admin : le paiement est arrivé -> les commandes du panier passent en traitement
router.patch('/admin/:orderId/confirm', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const orders = await loadGroupForAdmin(req.params.orderId);
    if (!orders) return res.status(404).json({ error: 'Commande non trouvée' });

    const toConfirm = orders.filter((o) => o.status !== 'cancelled' && o.paymentStatus !== 'paid');
    if (toConfirm.length === 0) {
      return res.status(409).json({ error: 'Aucun paiement à confirmer pour cette commande' });
    }

    const now = new Date();
    for (const order of toConfirm) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          paidAt: now,
          paymentRejectionReason: null,
          // Stock déjà réservé : la commande peut être préparée immédiatement
          ...(order.status === 'pending' && order.stockReserved ? { status: 'processing' } : {}),
        },
      });
    }

    const buyer = buyerOf(orders[0]);
    if (buyer.email) {
      sendPaymentConfirmedEmail({
        orderNumbers: toConfirm.map((o) => o.orderNumber),
        companyName: buyer.name,
        contactEmail: buyer.email,
        totalAmount: toConfirm.reduce((sum, o) => sum + o.total, 0),
      }).catch((err) => console.error('Failed to send payment confirmation email:', err));
    }

    res.json({ success: true, confirmed: toConfirm.length });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Admin : paiement introuvable/incorrect -> le client peut saisir une nouvelle référence
router.patch('/admin/:orderId/reject', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { reason } = rejectSchema.parse(req.body);

    const orders = await loadGroupForAdmin(req.params.orderId);
    if (!orders) return res.status(404).json({ error: 'Commande non trouvée' });

    const toReject = orders.filter((o) => o.status !== 'cancelled' && o.paymentStatus !== 'paid');
    if (toReject.length === 0) {
      return res.status(409).json({ error: 'Aucun paiement à refuser pour cette commande' });
    }

    await prisma.order.updateMany({
      where: { id: { in: toReject.map((o) => o.id) } },
      data: { paymentStatus: 'rejected', paymentRejectionReason: reason },
    });

    const buyer = buyerOf(orders[0]);
    if (buyer.email) {
      sendPaymentRejectedEmail({
        orderNumbers: toReject.map((o) => o.orderNumber),
        companyName: buyer.name,
        contactEmail: buyer.email,
        totalAmount: toReject.reduce((sum, o) => sum + o.total, 0),
        reason,
      }).catch((err) => console.error('Failed to send payment rejection email:', err));
    }

    res.json({ success: true, rejected: toReject.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message ?? 'Motif requis' });
    }
    console.error('Error rejecting payment:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

export default router;
