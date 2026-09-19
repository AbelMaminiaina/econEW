import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requirePlatformAdmin } from '../middleware/auth.js';
import { sendCompanyApprovedEmail, sendCompanyRejectedEmail } from '../services/emailService.js';

const router = Router();

// Admin: liste des entreprises (filtrable par statut, ex: ?status=pending pour la file d'attente)
router.get('/', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const companies = await prisma.company.findMany({
      where: status ? { status: status as any } : undefined,
      include: { users: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ companies, total: companies.length });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Entreprise elle-même (self-service) ou admin
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user!.role !== 'platform_admin' && req.user!.companyId !== id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const company = await prisma.company.findUnique({
      where: { id },
      include: { users: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Admin: approuver une entreprise (fixe les conditions de paiement)
router.patch('/:id/approve', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentTerms, creditLimit } = req.body;

    if (paymentTerms !== undefined && paymentTerms !== 'net_30' && paymentTerms !== 'net_60') {
      return res.status(400).json({ error: 'Conditions de paiement invalides' });
    }

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        status: 'approved',
        paymentTerms: paymentTerms ?? existing.paymentTerms ?? 'net_30',
        creditLimit: creditLimit ?? existing.creditLimit,
        rejectionReason: null,
      },
    });

    sendCompanyApprovedEmail({
      companyName: company.name,
      contactEmail: company.contactEmail,
      paymentTerms: company.paymentTerms!,
    }).catch((err) => console.error('Failed to send company approval email:', err));

    res.json({ success: true, company });
  } catch (error) {
    console.error('Error approving company:', error);
    res.status(500).json({ error: 'Failed to approve company' });
  }
});

// Admin: rejeter une entreprise (avec motif)
router.patch('/:id/reject', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    const company = await prisma.company.update({
      where: { id },
      data: { status: 'rejected', rejectionReason: reason || null },
    });

    sendCompanyRejectedEmail({
      companyName: company.name,
      contactEmail: company.contactEmail,
      reason: reason || undefined,
    }).catch((err) => console.error('Failed to send company rejection email:', err));

    res.json({ success: true, company });
  } catch (error) {
    console.error('Error rejecting company:', error);
    res.status(500).json({ error: 'Failed to reject company' });
  }
});

export default router;
