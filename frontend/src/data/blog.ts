import { BlogPost, Author } from '@/types';

const authors: Record<string, Author> = {
  equipe: {
    name: 'Équipe All',
    avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="%235b9a2d"/%3E%3C/svg%3E',
    bio: 'L\'équipe qui fait tourner la plateforme All au quotidien.',
  },
};

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Comment fonctionne la tarification dégressive sur All',
    slug: 'comment-fonctionne-la-tarification-degressive',
    excerpt: 'Sur All, le prix d\'un produit dépend de la quantité commandée. Voici comment lire et utiliser les paliers de prix pour optimiser vos achats.',
    content: `# Comment fonctionne la tarification dégressive sur All

La vente en gros repose sur un principe simple : plus vous commandez, moins vous payez à l'unité. Sur All, ce principe est appliqué produit par produit, avec des paliers de prix transparents.

## 1. Le prix de base

Chaque produit a un prix de base, appliqué jusqu'à un certain seuil de quantité. C'est le prix affiché par défaut sur la fiche produit.

## 2. Les paliers de prix

Au-delà de certains seuils de quantité, un prix unitaire réduit s'applique automatiquement. Par exemple, un carton d'emballage peut être vendu :
- 1 200 Ar l'unité jusqu'à 99 unités
- 1 050 Ar à partir de 100 unités
- 900 Ar à partir de 500 unités

Ces paliers sont affichés directement sur la fiche produit, avant même d'ajouter au panier.

## 3. Le calcul au moment de la commande

Le prix appliqué est toujours recalculé automatiquement en fonction de la quantité finale de votre commande, pour garantir que vous bénéficiez du bon tarif.

## 4. La quantité minimum de commande (MOQ)

Chaque produit a également une quantité minimum de commande (MOQ), en dessous de laquelle il n'est pas possible de commander. Elle est indiquée à côté du prix.

Ces deux mécanismes — MOQ et paliers de prix — sont propres à la vente en gros et permettent à All de proposer des prix compétitifs pour les professionnels.`,
    coverImage: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200',
    category: 'conseils',
    publishedAt: '2026-02-10',
    author: authors.equipe,
    tags: ['tarifs', 'paliers de prix', 'commande'],
    readingTime: 3,
  },
  {
    id: '2',
    title: 'Payer par Mobile Money : mode d\'emploi',
    slug: 'payer-par-mobile-money-mode-d-emploi',
    excerpt: 'MVola, Orange Money ou Airtel Money : voici comment régler votre commande sur All, avec ou sans compte.',
    content: `# Payer par Mobile Money : mode d'emploi

Sur All, le paiement se fait en ligne, par Mobile Money, au moment de la commande. C'est le même pour les particuliers, les entreprises et les visiteurs sans compte.

## Étape 1 — Choisir votre opérateur

À la dernière étape de la commande, sélectionnez MVola, Orange Money ou Airtel Money. Le paiement par carte bancaire n'est pas encore disponible.

## Étape 2 — Envoyer le montant

Une fois la commande validée, nous vous indiquons le montant exact et le numéro à créditer. Ces informations vous sont aussi envoyées par e-mail.

## Étape 3 — Saisir la référence

Après l'envoi, saisissez la référence de la transaction (reçue par SMS) et le numéro depuis lequel vous avez payé.

## Étape 4 — Vérification

Notre équipe vérifie le paiement et vous prévient par e-mail. Votre commande est alors traitée. Si un paiement ne peut pas être validé, le motif vous est indiqué et vous pouvez saisir une nouvelle référence.

## Un panier avec plusieurs vendeurs ?

Un seul paiement couvre toutes les commandes du panier : chaque vendeur prépare ensuite sa propre commande.`,
    coverImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
    category: 'conseils',
    publishedAt: '2026-02-20',
    author: authors.equipe,
    tags: ['paiement', 'mobile money', 'mvola'],
    readingTime: 3,
  },
  {
    id: '3',
    title: 'Créer votre compte professionnel : le guide en 4 étapes',
    slug: 'creer-votre-compte-professionnel-guide',
    excerpt: 'Avant d\'accéder au catalogue et aux tarifs de All, votre entreprise doit créer et faire valider un compte professionnel. Voici comment procéder.',
    content: `# Créer votre compte professionnel : le guide en 4 étapes

L'accès aux prix et à la commande sur All est réservé aux entreprises disposant d'un compte approuvé. Voici comment l'obtenir.

## Étape 1 — Renseignez votre entreprise

Depuis la page "Devenir client professionnel", indiquez la raison sociale, le numéro fiscal (NIF) et les coordonnées de contact de votre entreprise.

## Étape 2 — Créez votre compte utilisateur

Renseignez votre nom, votre email professionnel et un mot de passe. Ce compte sera celui du premier administrateur de l'entreprise sur la plateforme.

## Étape 3 — Validation par notre équipe

Votre dossier est examiné sous 1 à 2 jours ouvrés. Nous vérifions les informations transmises avant d'approuver le compte.

## Étape 4 — Confirmation de votre compte

Une fois approuvé, vous recevez un e-mail de confirmation. Vous pouvez alors vous connecter, consulter les tarifs et passer commande.

## Et après ?

Votre statut de compte (en attente, approuvé) est visible à tout moment dans le menu de votre compte, en haut du site.`,
    coverImage: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200',
    category: 'conseils',
    publishedAt: '2026-03-01',
    author: authors.equipe,
    tags: ['inscription', 'compte professionnel', 'onboarding'],
    readingTime: 2,
  },
  {
    id: '4',
    title: '5 bonnes pratiques pour optimiser vos commandes en gros',
    slug: '5-bonnes-pratiques-commandes-en-gros',
    excerpt: 'Quelques réflexes simples pour tirer le meilleur parti des tarifs dégressifs sur All.',
    content: `# 5 bonnes pratiques pour optimiser vos commandes en gros

Voici quelques conseils pour optimiser vos achats professionnels sur All.

## 1. Groupez vos commandes pour atteindre les paliers de prix

Regarder les paliers de prix d'un produit avant de commander permet parfois d'ajuster légèrement la quantité pour bénéficier d'un tarif unitaire plus avantageux.

## 2. Anticipez la quantité minimum de commande

Vérifiez le MOQ de chaque produit avant de planifier votre commande, surtout si vous combinez plusieurs références dans un même panier.

## 3. Réglez rapidement par Mobile Money

Votre commande n'est traitée qu'une fois le paiement vérifié : saisissez la référence de la transaction dès l'envoi pour accélérer la préparation.

## 4. Choisissez le bon mode de livraison

Le retrait sur place est gratuit ; la livraison standard ou express a un coût qui dépend du sous-total de votre commande. Comparez selon vos délais.

## 5. Centralisez les commandes de votre équipe

Si plusieurs personnes de votre entreprise commandent sur All, privilégiez un compte entreprise unique pour garder une vue d'ensemble sur les commandes et les paiements.`,
    coverImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200',
    category: 'conseils',
    publishedAt: '2026-03-15',
    author: authors.equipe,
    tags: ['bonnes pratiques', 'achats', 'gestion'],
    readingTime: 3,
  },
];

export function getRecentPosts(limit = 3): BlogPost[] {
  return blogPosts
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  if (category === 'all') return blogPosts;
  return blogPosts.filter((p) => p.category === category);
}

export function getRelatedPosts(postId: string, limit = 3): BlogPost[] {
  return blogPosts.filter((p) => p.id !== postId).slice(0, limit);
}
