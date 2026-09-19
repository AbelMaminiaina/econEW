import { Testimonial } from '@/types';

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Nirina R.',
    location: 'Antananarivo — Grossiste emballage',
    avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="white"/%3E%3C/svg%3E',
    content: 'Depuis qu\'on commande sur All, on a divisé notre budget cartonnage par deux grâce aux paliers de prix. La validation du compte a pris deux jours et depuis, tout est simple.',
    rating: 5,
    date: '2026-02-15',
    productPurchased: 'Cartons d\'emballage (paliers de prix)',
  },
  {
    id: '2',
    name: 'Hery A.',
    location: 'Antsirabe — Hôtellerie',
    avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="white"/%3E%3C/svg%3E',
    content: 'Le paiement par Mobile Money est très pratique : on règle en quelques minutes, la confirmation arrive par email et la commande part sans attendre.',
    rating: 5,
    date: '2026-01-20',
    productPurchased: 'Fournitures d\'hygiène',
  },
  {
    id: '3',
    name: 'Andry L.',
    location: 'Antananarivo — Distribution',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    content: 'Le catalogue est large et les quantités minimum sont clairement indiquées sur chaque fiche produit, ce qui évite les mauvaises surprises au moment de la commande.',
    rating: 5,
    date: '2026-02-28',
    productPurchased: 'Quincaillerie en gros',
  },
  {
    id: '4',
    name: 'Fanja B.',
    location: 'Toamasina — Import-export',
    avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="white"/%3E%3C/svg%3E',
    content: 'La livraison est fiable et l\'espace "Mes commandes" nous permet de suivre le statut de paiement et de livraison de chaque commande sans avoir à relancer par email.',
    rating: 5,
    date: '2026-03-10',
    productPurchased: 'Livraison régulière',
  },
  {
    id: '5',
    name: 'Tojo G.',
    location: 'Antsirabe — BTP',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    content: 'Simple à mettre en place pour toute l\'équipe achats. Le rapport qualité-prix sur les gros volumes est excellent, et le support répond vite en cas de question.',
    rating: 4,
    date: '2026-01-05',
    productPurchased: 'Équipement professionnel',
  },
];

export function getRecentTestimonials(limit = 5): Testimonial[] {
  return testimonials
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function getAverageRating(): number {
  const total = testimonials.reduce((acc, t) => acc + t.rating, 0);
  return Math.round((total / testimonials.length) * 10) / 10;
}
