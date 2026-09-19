import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';

// Annuaire public des vendeurs : les entreprises approuvées qui ont au moins un produit publié.
// Seules des informations publiques sortent (nom, ancienneté, responsable du compte réduit à
// « Prénom N. ») : pas d'e-mail, de téléphone ni d'adresse.
const router = Router();

const PUBLISHED = { status: 'approved' as const, isActive: true };

function toPublicSeller(company: any) {
  const person = company.users?.[0];
  return {
    id: company.id,
    name: company.name,
    legalName: company.legalName && company.legalName !== company.name ? company.legalName : null,
    memberSince: company.createdAt,
    productCount: company._count?.products ?? 0,
    contactPerson: person ? `${person.firstName} ${person.lastName.charAt(0)}.` : null,
  };
}

const sellerSelect = {
  id: true,
  name: true,
  legalName: true,
  createdAt: true,
  // Le responsable du compte : l'administrateur de l'entreprise en priorité
  users: {
    select: { firstName: true, lastName: true },
    orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }],
    take: 1,
  },
  _count: { select: { products: { where: PUBLISHED } } },
};

router.get('/', async (_req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      where: { status: 'approved', products: { some: PUBLISHED } },
      select: sellerSelect,
      orderBy: { name: 'asc' },
    });
    res.json({ sellers: (companies ?? []).map(toPublicSeller) });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, status: 'approved', products: { some: PUBLISHED } },
      select: sellerSelect,
    });

    if (!company) {
      return res.status(404).json({ error: 'Vendeur introuvable' });
    }
    res.json(toPublicSeller(company));
  } catch (error) {
    console.error('Error fetching seller:', error);
    res.status(500).json({ error: 'Failed to fetch seller' });
  }
});

export default router;
