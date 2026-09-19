import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { DeliveryMethod, PaymentTerms } from '@prisma/client';
import {
  sendOrderConfirmationEmail,
  sendOrderCancellationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
} from '../services/emailService.js';
import { invalidateProductCache } from '../lib/cache.js';
import { computeShippingCost } from '../lib/shipping.js';
import { resolveUnitPrice } from '../lib/pricing.js';
import { authenticate, requirePlatformAdmin, requireCanOrder } from '../middleware/auth.js';

const router = Router();

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().min(1),
    })
  ).min(1),
  shippingAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      postalCode: z.string(),
      country: z.string().optional(),
    })
    .optional(),
  deliveryMethod: z.enum(['standard', 'express', 'retrait']),
  notes: z.string().optional(),
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp}-${randomStr}`.toUpperCase();
}

function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `INV-${timestamp}-${randomStr}`.toUpperCase();
}

function dueDateFor(paymentTerms: PaymentTerms): Date {
  const days = paymentTerms === 'net_60' ? 60 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// Passer commande — particuliers (prix de base, paiement à la livraison) ou entreprises
// approuvées (prix dégressifs, facture différée). Le MOQ s'applique à tous : vente en gros.
// Le prix n'est JAMAIS pris depuis le client : il est recalculé serveur.
router.post('/', authenticate, requireCanOrder, async (req: Request, res: Response) => {
  try {
    const validatedData = checkoutSchema.parse(req.body);

    if (validatedData.deliveryMethod !== 'retrait' && !validatedData.shippingAddress) {
      return res.status(400).json({ success: false, error: 'Adresse de livraison requise' });
    }

    const isCustomer = req.user!.role === 'customer';

    const company = isCustomer
      ? null
      : await prisma.company.findUnique({ where: { id: req.user!.companyId! } });
    if (!isCustomer && !company) {
      return res.status(404).json({ success: false, error: 'Entreprise introuvable' });
    }

    const customerUser = isCustomer
      ? await prisma.user.findUnique({ where: { id: req.user!.userId } })
      : null;
    if (isCustomer && !customerUser) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    const productIds = validatedData.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { priceTiers: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Vérifie l'existence des produits et le respect du MOQ avant tout calcul
    for (const item of validatedData.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(400).json({ success: false, error: `Produit ${item.productId} introuvable` });
      }
      if (item.quantity < product.moq) {
        return res.status(400).json({
          success: false,
          error: `Quantité minimum pour "${product.name}" : ${product.moq} ${product.unit}(s)`,
        });
      }
    }

    // Prix serveur, résolu depuis les paliers de prix
    const pricedItems = validatedData.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const price = isCustomer
        ? product.price
        : resolveUnitPrice(product.price, product.priceTiers, item.quantity);
      return { productId: item.productId, quantity: item.quantity, price, product };
    });

    const subtotal = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create address (liée à l'entreprise) si fournie
    let address = null;
    if (validatedData.shippingAddress) {
      address = await prisma.address.create({
        data: {
          ...(company ? { companyId: company.id } : { userId: req.user!.userId }),
          street: validatedData.shippingAddress.street,
          city: validatedData.shippingAddress.city,
          postalCode: validatedData.shippingAddress.postalCode,
          country: validatedData.shippingAddress.country || 'Madagascar',
        },
      });
    }

    const freeShippingProductIds = new Set(
      pricedItems.filter((item) => item.product.freeShipping).map((item) => item.productId)
    );
    const shippingCost = computeShippingCost(
      validatedData.deliveryMethod,
      subtotal,
      freeShippingProductIds,
      pricedItems,
    );
    const total = subtotal + shippingCost;

    let allInStock = true;
    const stockUpdates: { id: string; newQuantity: number }[] = [];

    for (const item of pricedItems) {
      if (item.product.stockQuantity < item.quantity) {
        allInStock = false;
        break;
      }
      stockUpdates.push({
        id: item.productId,
        newQuantity: item.product.stockQuantity - item.quantity,
      });
    }

    const orderStatus = allInStock ? 'processing' : 'pending';
    // Facturation différée réservée aux entreprises ; les particuliers paient à la livraison/retrait
    const paymentTerms: PaymentTerms | null = company ? company.paymentTerms ?? 'net_30' : null;
    const dueDate = paymentTerms ? dueDateFor(paymentTerms) : null;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        companyId: company?.id ?? null,
        userId: req.user!.userId,
        addressId: address?.id,
        deliveryMethod: validatedData.deliveryMethod as DeliveryMethod,
        status: orderStatus,
        subtotal,
        shippingCost,
        total,
        paymentTerms,
        dueDate,
        notes: validatedData.notes,
        items: {
          create: pricedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            availableFrom: item.product.availableFrom ?? null,
          })),
        },
      },
      include: { items: true },
    });

    const invoice =
      company && dueDate
        ? await prisma.invoice.create({
            data: {
              invoiceNumber: generateInvoiceNumber(),
              orderId: order.id,
              companyId: company.id,
              amount: total,
              dueDate,
              status: 'sent',
            },
          })
        : null;

    if (allInStock) {
      await Promise.all(
        stockUpdates.map((update) =>
          prisma.product.update({
            where: { id: update.id },
            data: {
              stockQuantity: update.newQuantity,
              inStock: update.newQuantity > 0,
            },
          })
        )
      );
      await invalidateProductCache();
    }

    const emailData = {
      orderNumber: order.orderNumber,
      companyName: company ? company.name : `${customerUser!.firstName} ${customerUser!.lastName}`,
      contactEmail: company ? company.contactEmail : customerUser!.email,
      contactPhone: (company ? company.contactPhone : customerUser!.phone) ?? undefined,
      address: address
        ? {
            street: address.street,
            city: address.city,
            postalCode: address.postalCode,
            country: address.country,
          }
        : null,
      deliveryMethod: validatedData.deliveryMethod,
      items: pricedItems.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        availableFrom: item.product.availableFrom ?? null,
      })),
      subtotal,
      shippingCost,
      total,
      status: orderStatus,
      invoiceNumber: invoice?.invoiceNumber,
      dueDate: dueDate ?? undefined,
      paymentTerms: paymentTerms ?? undefined,
      createdAt: new Date(),
    };

    // Envoi asynchrone (ne bloque pas la réponse)
    sendOrderConfirmationEmail(emailData).catch((err) =>
      console.error('Failed to send email:', err)
    );

    res.json({
      success: true,
      message: allInStock
        ? 'Commande confirmée et en préparation'
        : 'Commande en attente de stock',
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: orderStatus,
      total,
      invoiceNumber: invoice?.invoiceNumber ?? null,
      dueDate,
    });
  } catch (error) {
    console.error('Checkout error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la commande',
    });
  }
});

// Admin: Get all orders (MUST be before /:orderNumber)
router.get('/orders', authenticate, requirePlatformAdmin, async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        company: true,
        user: true,
        customer: true,
        address: true,
        invoice: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      companyName: order.company?.name ?? (order.user ? `${order.user.firstName} ${order.user.lastName}` : order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'N/A'),
      customerType: order.companyId ? 'professionnel' : 'particulier',
      contactEmail: order.company?.contactEmail ?? order.user?.email ?? order.customer?.email ?? null,
      contactPhone: order.company?.contactPhone ?? order.user?.phone ?? order.customer?.phone ?? null,
      status: order.status,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      deliveryMethod: order.deliveryMethod,
      paymentTerms: order.paymentTerms,
      dueDate: order.dueDate,
      invoiceNumber: order.invoice?.invoiceNumber ?? null,
      invoiceStatus: order.invoice?.status ?? null,
      notes: order.notes,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      address: order.address
        ? {
            street: order.address.street,
            city: order.address.city,
            postalCode: order.address.postalCode,
            country: order.address.country,
          }
        : null,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        availableFrom: item.availableFrom,
      })),
    }));

    res.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Client (entreprise ou particulier) : ses propres commandes
router.get('/orders/mine', authenticate, requireCanOrder, async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: req.user!.role === 'customer'
        ? { userId: req.user!.userId }
        : { companyId: req.user!.companyId! },
      include: {
        address: true,
        invoice: true,
        items: {
          include: { product: { select: { name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      deliveryMethod: order.deliveryMethod,
      paymentTerms: order.paymentTerms,
      dueDate: order.dueDate,
      invoiceNumber: order.invoice?.invoiceNumber ?? null,
      invoiceStatus: order.invoice?.status ?? null,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      address: order.address
        ? {
            street: order.address.street,
            city: order.address.city,
            postalCode: order.address.postalCode,
            country: order.address.country,
          }
        : null,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        availableFrom: item.availableFrom,
      })),
    }));

    res.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Error fetching company orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin: Update order status
router.patch('/orders/:orderId/status', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    if (existingOrder.status === 'cancelled') {
      return res.status(400).json({ error: 'Cette commande est déjà annulée' });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === 'cancelled' ? { cancelReason: reason || null } : {}),
      },
      include: {
        company: true,
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        customer: true,
        address: true,
        invoice: true,
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    // Une commande "pending" n'a jamais décrémenté le stock (stock insuffisant au moment
    // de la commande) : rien à restaurer. Pour toute autre commande annulée, le stock avait
    // été décrémenté à la création, on le restitue.
    if (status === 'cancelled' && existingOrder.status !== 'pending') {
      await Promise.all(
        existingOrder.items.map((item) =>
          prisma.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { increment: item.quantity },
              inStock: true,
            },
          })
        )
      );
      await invalidateProductCache();
    }

    // Annuler la commande annule aussi la facture associée
    if (status === 'cancelled' && order.invoice) {
      await prisma.invoice.update({
        where: { id: order.invoice.id },
        data: { status: 'cancelled' },
      });
    }

    const companyName = order.company?.name ?? (order.user ? `${order.user.firstName} ${order.user.lastName}` : order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'N/A');
    const contactEmail = order.company?.contactEmail ?? order.user?.email ?? order.customer?.email ?? null;

    // Envoi asynchrone des emails de notification (ne bloque pas la réponse)
    if (status === 'cancelled' && contactEmail) {
      sendOrderCancellationEmail({
        orderNumber: order.orderNumber,
        companyName,
        contactEmail,
        reason: reason || undefined,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          availableFrom: item.availableFrom,
        })),
        total: order.total,
        cancelledAt: new Date(),
      }).catch((err) => console.error('Failed to send cancellation email:', err));
    } else if ((status === 'shipped' || status === 'delivered') && contactEmail) {
      const emailData = {
        orderNumber: order.orderNumber,
        companyName,
        contactEmail,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          availableFrom: item.availableFrom,
        })),
        total: order.total,
        deliveryMethod: order.deliveryMethod,
        address: order.address
          ? {
              street: order.address.street,
              city: order.address.city,
              postalCode: order.address.postalCode,
              country: order.address.country,
            }
          : null,
        updatedAt: new Date(),
      };

      const sendFn = status === 'shipped' ? sendOrderShippedEmail : sendOrderDeliveredEmail;
      sendFn(emailData).catch((err) =>
        console.error(`Failed to send ${status} email:`, err)
      );
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get order by number — accessible par l'entreprise propriétaire ou un admin plateforme
router.get('/:orderNumber', authenticate, async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        company: true,
        customer: true,
        address: true,
        invoice: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const isOwner =
      (order.companyId && order.companyId === req.user!.companyId) ||
      (order.userId && order.userId === req.user!.userId);
    const isAdmin = req.user!.role === 'platform_admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

export default router;
