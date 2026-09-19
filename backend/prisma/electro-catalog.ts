import type { ProductBadge } from '@prisma/client';

// Catalogue de démonstration « Electro » : produits illustrés par les images du template
// (frontend/public/electro/img/product-N.png). Prix en Ariary, à titre d'exemple : à ajuster dans
// l'admin. Les noms sont génériques (pas de marque) car les images sont des visuels de démonstration.
// Les slugs de catégorie sont volontairement d'un seul mot (le backend stocke le slug avec des
// underscores et le renvoie avec des tirets).

export const ELECTRO_CATEGORIES = [
  { name: 'Accessoires', slug: 'accessoires', order: 1 },
  { name: 'Électronique & Photo', slug: 'electronique', order: 2 },
  { name: 'Ordinateurs & Écrans', slug: 'ordinateurs', order: 3 },
  { name: 'Mobiles & Tablettes', slug: 'mobiles', order: 4 },
  { name: 'Smartphones', slug: 'smartphones', order: 5 },
];

export interface CatalogProduct {
  name: string;
  slug: string;
  category: string;
  description: string;
  shortDescription: string;
  price: number;
  images: string[];
  inStock: boolean;
  stockQuantity: number;
  badges: ProductBadge[];
  characteristics: string[];
  moq: number;
  unit: string;
  estimatedWeightKg?: number;
  freeShipping?: boolean;
  priceTiers?: { minQty: number; unitPrice: number }[];
}

// Une ou plusieurs images du template : un nombre = product-N.png, une chaîne = chemin complet
const img = (...items: (number | string)[]) =>
  items.map((item) => (typeof item === 'string' ? item : `/electro/img/product-${item}.png`));

// Paliers dégressifs génériques, calculés d'après la quantité minimum : -5 % à 3 x le MOQ,
// -10 % à 10 x le MOQ.
const tiersFor = (price: number, moq: number) => [
  { minQty: moq * 3, unitPrice: Math.round((price * 0.95) / 1000) * 1000 },
  { minQty: moq * 10, unitPrice: Math.round((price * 0.9) / 1000) * 1000 },
];

const RAW_PRODUCTS: CatalogProduct[] = [
  {
    name: 'Appareil photo instantané',
    slug: 'appareil-photo-instantane',
    category: 'electronique',
    description:
      "Appareil photo à impression instantanée, simple d'utilisation, avec flash intégré. Idéal pour les événements, les boutiques et les cadeaux.",
    shortDescription: 'Appareil photo à impression instantanée avec flash.',
    price: 690000,
    images: img(1, 7, 6),
    inStock: true,
    stockQuantity: 60,
    badges: ['nouveau'],
    characteristics: ['Impression instantanée', 'Flash intégré', 'Livré avec sa bandoulière'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 0.6,
  },
  {
    name: 'Bracelet connecté sport',
    slug: 'bracelet-connecte-sport',
    category: 'accessoires',
    description:
      'Bracelet d\'activité avec écran couleur : pas, sommeil, notifications. Bracelet silicone souple et fermoir sécurisé.',
    shortDescription: "Bracelet d'activité avec écran couleur.",
    price: 250000,
    images: img(2, 13),
    inStock: true,
    stockQuantity: 120,
    badges: ['populaire'],
    characteristics: ['Écran couleur', 'Suivi du sommeil', 'Bracelet silicone'],
    moq: 20,
    unit: 'pièce',
    estimatedWeightKg: 0.1,
  },
  {
    name: 'Smartphone 4,7 pouces',
    slug: 'smartphone-4-7-pouces',
    category: 'mobiles',
    description:
      'Smartphone compact 4,7 pouces, appareil photo arrière haute définition, idéal pour un usage quotidien et professionnel.',
    shortDescription: 'Smartphone compact 4,7 pouces.',
    price: 1450000,
    images: img(3, 18, 17),
    inStock: true,
    stockQuantity: 50,
    badges: ['nouveau'],
    characteristics: ['Écran 4,7 pouces', 'Appareil photo HD', 'Chargeur inclus'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 0.2,
    freeShipping: true,
  },
  {
    name: 'Appareil photo reflex numérique',
    slug: 'appareil-photo-reflex-numerique',
    category: 'electronique',
    description:
      'Reflex numérique avec objectif interchangeable, viseur optique et enregistrement vidéo Full HD. Pour photographes et studios.',
    shortDescription: 'Reflex numérique à objectif interchangeable.',
    price: 3200000,
    images: img(4, 5, 6),
    inStock: true,
    stockQuantity: 50,
    badges: ['populaire'],
    characteristics: ['Objectif interchangeable', 'Vidéo Full HD', 'Viseur optique'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 1.2,
    freeShipping: true,
  },
  {
    name: 'Objectif photo zoom',
    slug: 'objectif-photo-zoom',
    category: 'accessoires',
    description: 'Objectif zoom pour reflex numérique, ouverture lumineuse et mise au point rapide.',
    shortDescription: 'Objectif zoom lumineux pour reflex.',
    price: 1800000,
    images: img(5, 4),
    inStock: true,
    stockQuantity: 50,
    badges: [],
    characteristics: ['Zoom lumineux', 'Mise au point rapide', 'Pare-soleil fourni'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 0.9,
  },
  {
    name: 'Mini caméra Wi-Fi',
    slug: 'mini-camera-wifi',
    category: 'accessoires',
    description: 'Mini caméra de surveillance discrète, connexion Wi-Fi et fixation magnétique.',
    shortDescription: 'Mini caméra discrète en Wi-Fi.',
    price: 180000,
    images: img(6, 1, 7),
    inStock: true,
    stockQuantity: 150,
    badges: [],
    characteristics: ['Connexion Wi-Fi', 'Fixation magnétique', 'Très compacte'],
    moq: 20,
    unit: 'pièce',
    estimatedWeightKg: 0.1,
  },
  {
    name: 'Casque audio circum-aural',
    slug: 'casque-audio-circum-aural',
    category: 'accessoires',
    description: 'Casque audio fermé avec coussinets moelleux, son riche et confortable pour de longues sessions.',
    shortDescription: 'Casque audio fermé, coussinets moelleux.',
    price: 520000,
    images: img(8),
    inStock: true,
    stockQuantity: 80,
    badges: ['populaire'],
    characteristics: ['Coussinets moelleux', 'Arceau ajustable', 'Câble détachable'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 0.4,
  },
  {
    name: 'Pack bureau tout-en-un',
    slug: 'pack-bureau-tout-en-un',
    category: 'ordinateurs',
    description: 'Ordinateur de bureau tout-en-un, tablette, clavier et souris sans fil : le pack complet pour équiper un poste.',
    shortDescription: 'Ordinateur, tablette, clavier et souris.',
    price: 4800000,
    images: img(9, 11, 12),
    inStock: true,
    stockQuantity: 50,
    badges: [],
    characteristics: ['Ordinateur tout-en-un', 'Tablette incluse', 'Clavier et souris sans fil'],
    moq: 10,
    unit: 'pack',
    estimatedWeightKg: 9,
    freeShipping: true,
  },
  {
    name: 'Smartphone gamme pro',
    slug: 'smartphone-gamme-pro',
    category: 'mobiles',
    description: 'Smartphone haut de gamme, écran net et fluide, pensé pour la productivité et la photo.',
    shortDescription: 'Smartphone haut de gamme pour pros.',
    price: 2100000,
    images: img(10, 15, 3),
    inStock: true,
    stockQuantity: 50,
    badges: [],
    characteristics: ['Écran haute définition', 'Double capteur photo', 'Charge rapide'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 0.2,
  },
  {
    name: 'Ordinateur portable 15,6 pouces',
    slug: 'ordinateur-portable-15-6-pouces',
    category: 'ordinateurs',
    description: 'Ordinateur portable 15,6 pouces pour la bureautique et la navigation, clavier complet avec pavé numérique.',
    shortDescription: 'Portable 15,6 pouces, clavier complet.',
    price: 2600000,
    images: img(11, 12, 9),
    inStock: true,
    stockQuantity: 50,
    badges: ['populaire'],
    characteristics: ['Écran 15,6 pouces', 'Clavier avec pavé numérique', 'Chargeur inclus'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 2.4,
    freeShipping: true,
  },
  {
    name: 'Écran 24 pouces Full HD',
    slug: 'ecran-24-pouces-full-hd',
    category: 'ordinateurs',
    description: 'Moniteur 24 pouces Full HD, fins contours et pied réglable, pour le bureau et la vidéosurveillance.',
    shortDescription: 'Moniteur 24 pouces Full HD.',
    price: 780000,
    images: img(12, 9, 11),
    inStock: true,
    stockQuantity: 55,
    badges: [],
    characteristics: ['24 pouces Full HD', 'Pied réglable', 'Entrées HDMI et VGA'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 3.5,
  },
  {
    name: 'Montre connectée',
    slug: 'montre-connectee',
    category: 'accessoires',
    description: 'Montre connectée légère avec écran tactile, suivi d\'activité et notifications du téléphone.',
    shortDescription: 'Montre connectée à écran tactile.',
    price: 320000,
    images: img(13, 2),
    inStock: true,
    stockQuantity: 100,
    badges: ['nouveau'],
    characteristics: ['Écran tactile', 'Notifications', 'Bracelet interchangeable'],
    moq: 20,
    unit: 'pièce',
    estimatedWeightKg: 0.1,
  },
  {
    name: 'Drone caméra pliable',
    slug: 'drone-camera-pliable',
    category: 'electronique',
    description: 'Drone à quatre hélices avec caméra stabilisée, pliable pour le transport. Prises de vue aériennes pour pros.',
    shortDescription: 'Drone quadricoptère avec caméra.',
    price: 3500000,
    images: img(14, '/electro/img/product-banner-3.jpg'),
    inStock: true,
    stockQuantity: 50,
    badges: ['populaire'],
    characteristics: ['Caméra stabilisée', 'Pliable', 'Deux batteries fournies'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 1.6,
    freeShipping: true,
  },
  {
    name: 'Smartphone écran AMOLED',
    slug: 'smartphone-ecran-amoled',
    category: 'smartphones',
    description: 'Smartphone à grand écran AMOLED et triple capteur photo, finition dégradé bleu-vert.',
    shortDescription: 'Smartphone AMOLED, triple capteur photo.',
    price: 2900000,
    images: img(15, 16, 10),
    inStock: true,
    stockQuantity: 50,
    badges: ['nouveau'],
    characteristics: ['Écran AMOLED', 'Triple capteur photo', 'Charge rapide'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 0.2,
    freeShipping: true,
  },
  {
    name: 'Smartphone à stylet',
    slug: 'smartphone-a-stylet',
    category: 'mobiles',
    description: 'Grand smartphone livré avec un stylet pour noter, annoter et dessiner. Idéal pour la prise de notes.',
    shortDescription: 'Grand smartphone avec stylet inclus.',
    price: 3100000,
    images: img(16, 15, 3),
    inStock: true,
    stockQuantity: 50,
    badges: [],
    characteristics: ['Stylet inclus', 'Grand écran', 'Prise de notes rapide'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 0.25,
    freeShipping: true,
  },
  {
    name: 'Coque de protection smartphone',
    slug: 'coque-protection-smartphone',
    category: 'accessoires',
    description: 'Coque souple antichoc pour smartphone, finition mate. Vendue par pièce, idéale pour les revendeurs.',
    shortDescription: 'Coque souple antichoc, finition mate.',
    price: 45000,
    images: img(17, 18, 3),
    inStock: true,
    stockQuantity: 400,
    badges: [],
    characteristics: ['Antichoc', 'Finition mate', 'Découpes précises'],
    moq: 50,
    unit: 'pièce',
    estimatedWeightKg: 0.05,
    priceTiers: [
      { minQty: 150, unitPrice: 40000 },
      { minQty: 500, unitPrice: 35000 },
    ],
  },
  {
    name: 'Smartphone compact noir',
    slug: 'smartphone-compact-noir',
    category: 'smartphones',
    description: 'Smartphone compact noir, robuste et simple à prendre en main. Un bon appareil d\'entrée de gamme.',
    shortDescription: 'Smartphone compact et robuste.',
    price: 950000,
    images: img(18, 17, 3),
    inStock: true,
    stockQuantity: 70,
    badges: [],
    characteristics: ['Format compact', 'Finition noire', 'Chargeur inclus'],
    moq: 10,
    unit: 'pièce',
    estimatedWeightKg: 0.15,
  },
];

// Produits sans paliers explicites : paliers génériques d'après le MOQ
export const ELECTRO_PRODUCTS: CatalogProduct[] = RAW_PRODUCTS.map((product) => ({
  ...product,
  priceTiers: product.priceTiers ?? tiersFor(product.price, product.moq),
}));

// Produits « publiés » par l'entreprise de démonstration (Grossiste Demo SARL) pour illustrer la
// place de marché : ils sont rattachés à cette entreprise une fois qu'elle existe.
export const DEMO_COMPANY_NAME = 'Grossiste Demo SARL';
export const DEMO_SELLER_SLUGS = [
  'bracelet-connecte-sport',
  'montre-connectee',
  'coque-protection-smartphone',
  'mini-camera-wifi',
];
