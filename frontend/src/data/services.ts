import { Service, FAQItem } from '@/types';

export const services: Service[] = [
  {
    id: 'livraison',
    title: 'Livraison à Antananarivo et environs',
    slug: 'livraison',
    description: 'Recevez vos commandes directement chez vous. Nous livrons dans toute la région d\'Antananarivo et ses environs.',
    longDescription: `Notre service de livraison vous permet de recevoir vos commandes professionnelles sans vous déplacer, avec un suivi de bout en bout depuis votre espace client.

**Zones de livraison :**
- Antananarivo centre : livraison sous 24-48h
- Banlieue d'Antananarivo : livraison sous 48h
- Autres régions : nous consulter

**Frais de livraison :**
- Gratuit dès 100 000 Ar de sous-total
- Forfait standard ou express sinon, calculé au checkout
- Retrait sur place toujours gratuit

Chaque commande est accompagnée d'un suivi de statut consultable dans "Mes commandes".`,
    icon: 'Truck',
    features: [
      'Livraison sous 24-48h',
      'Gratuit dès 100 000 Ar de sous-total',
      'Suivi de commande dans l\'espace client',
      'Retrait sur place disponible',
      'Livraison express disponible',
    ],
    pricing: 'Gratuit dès 100 000 Ar / forfait sinon',
    available: true,
  },
  {
    id: 'facturation',
    title: 'Facturation & paiement différé',
    slug: 'facturation',
    description: 'Commandez maintenant, payez à 30 ou 60 jours. Les conditions de paiement sont fixées lors de l\'approbation de votre compte.',
    longDescription: `All propose la facturation à terme aux entreprises dont le compte a été approuvé par notre équipe.

**Comment ça marche :**
- Vos conditions de paiement (Net 30 ou Net 60) sont définies à l'approbation de votre compte
- Chaque commande génère automatiquement une facture avec sa date d'échéance
- Vous retrouvez toutes vos factures et leur statut dans "Mes commandes"

**Avantages :**
- Meilleure gestion de trésorerie pour votre entreprise
- Pas de paiement à passer au moment de la commande
- Historique de facturation centralisé

Un plafond de crédit peut être associé à votre compte selon votre profil.`,
    icon: 'CreditCard',
    features: [
      'Facturation Net 30 ou Net 60',
      'Facture générée automatiquement',
      'Historique centralisé',
      'Plafond de crédit personnalisé',
    ],
    pricing: 'Selon conditions accordées à votre compte',
    available: true,
  },
  {
    id: 'compte-pro',
    title: 'Compte professionnel',
    slug: 'compte-pro',
    description: 'Inscrivez votre entreprise, faites valider votre compte par notre équipe, et accédez à nos tarifs dégressifs par quantité.',
    longDescription: `L'accès à notre catalogue et à nos tarifs est réservé aux entreprises disposant d'un compte approuvé.

**Étapes d'inscription :**
1. Renseignez les informations de votre entreprise (raison sociale, numéro fiscal, contact)
2. Créez le compte du premier utilisateur administrateur
3. Notre équipe valide votre dossier sous 1 à 2 jours ouvrés
4. Vous recevez un e-mail de confirmation avec vos conditions de paiement

**Une fois approuvé :**
- Accès aux prix et aux paliers de quantité sur tout le catalogue
- Passage de commande avec facturation différée
- Suivi des commandes et factures dans votre espace client`,
    icon: 'Building2',
    features: [
      'Validation sous 1-2 jours ouvrés',
      'Accès aux tarifs dégressifs',
      'Un ou plusieurs utilisateurs par entreprise',
      'Conditions de paiement personnalisées',
    ],
    pricing: 'Inscription gratuite',
    available: true,
  },
  {
    id: 'support',
    title: 'Support & conseils',
    slug: 'support',
    description: 'Une question sur une commande, une facture ou un produit ? Notre équipe accompagne les entreprises clientes de All.',
    longDescription: `Nous accompagnons nos clients professionnels à chaque étape, de l'inscription au suivi des commandes.

**Nos services de support :**

*Avant votre première commande :*
- Aide à l'inscription et à la constitution du dossier entreprise
- Explication des paliers de prix et quantités minimum

*Une fois client :*
- Suivi de commandes et de facturation
- Questions produits et disponibilité
- Demandes de tarifs pour de gros volumes

**Contact :**
- Par email ou téléphone, du lundi au samedi
- Réponse sous 24h ouvrées en moyenne`,
    icon: 'MessageCircle',
    features: [
      'Accompagnement à l\'inscription',
      'Support commandes et facturation',
      'Réponse sous 24h ouvrées',
      'Demandes de tarifs volumes',
    ],
    pricing: 'Inclus pour tous les comptes approuvés',
    available: true,
  },
];

export const faqItems: FAQItem[] = [
  {
    id: '1',
    question: 'Comment créer un compte professionnel sur All ?',
    answer: 'Rendez-vous sur la page "Devenir client professionnel", renseignez les informations de votre entreprise (raison sociale, numéro fiscal, contact) ainsi que celles du premier utilisateur. Notre équipe valide ensuite votre dossier sous 1 à 2 jours ouvrés.',
    category: 'compte',
  },
  {
    id: '2',
    question: 'Combien de temps prend la validation de mon compte ?',
    answer: 'La validation prend généralement 1 à 2 jours ouvrés. Vous recevez un e-mail de confirmation dès que votre compte est approuvé, avec vos conditions de paiement (Net 30 ou Net 60).',
    category: 'compte',
  },
  {
    id: '3',
    question: 'Qu\'est-ce que la quantité minimum de commande (MOQ) ?',
    answer: 'Chaque produit a une quantité minimum de commande, indiquée sur sa fiche produit (par exemple 25 cartons ou 6 rouleaux). Impossible de commander en dessous de ce seuil, propre à la vente en gros.',
    category: 'commande',
  },
  {
    id: '4',
    question: 'Comment fonctionnent les tarifs dégressifs ?',
    answer: 'Chaque produit peut avoir plusieurs paliers de prix : plus la quantité commandée est élevée, plus le prix unitaire baisse. Les paliers sont affichés directement sur la fiche produit.',
    category: 'commande',
  },
  {
    id: '5',
    question: 'Comment fonctionne le paiement à 30/60 jours ?',
    answer: 'Une fois votre compte approuvé, chaque commande génère automatiquement une facture avec une échéance à 30 ou 60 jours selon les conditions accordées à votre entreprise. Vous retrouvez vos factures dans "Mes commandes".',
    category: 'facturation',
  },
  {
    id: '6',
    question: 'Où puis-je consulter mes factures ?',
    answer: 'Toutes vos commandes et factures (numéro, montant, échéance, statut) sont consultables dans votre espace "Mes commandes", accessible depuis le menu de votre compte.',
    category: 'facturation',
  },
  {
    id: '7',
    question: 'Quelles sont les zones de livraison ?',
    answer: 'Nous livrons à Antananarivo et ses environs. Le retrait sur place est également disponible gratuitement. Pour les autres régions, contactez-nous pour vérifier la faisabilité.',
    category: 'livraison',
  },
  {
    id: '8',
    question: 'Que faire si un produit reçu est non conforme ?',
    answer: 'Contactez-nous dans les 48h suivant la réception avec des photos du produit concerné. Nous étudierons un avoir ou un remplacement selon la situation.',
    category: 'general',
  },
];

export function getFAQByCategory(category: string): FAQItem[] {
  if (category === 'all') return faqItems;
  return faqItems.filter((item) => item.category === category);
}

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
