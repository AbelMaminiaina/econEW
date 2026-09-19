import type { ProductBadge } from '@prisma/client';

// Catalogue viande & volaille vendu en gros : porc à partir de 90 kg, volaille à partir de 500 pièces.
// Prix en Ariary (démo, à ajuster dans l'admin). Les images sont des photos de l'élevage,
// à remplacer par des photos des produits finis quand elles seront disponibles.

export const MEAT_CATEGORIES = [
  { name: 'Porc', slug: 'porc', order: 7 },
  { name: 'Volaille', slug: 'volaille', order: 8 },
];

interface CatalogProduct {
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
  priceTiers: { minQty: number; unitPrice: number }[];
}

export const MEAT_PRODUCTS: CatalogProduct[] = [
  {
    name: 'Porc sur pied (au poids vif)',
    slug: 'porc-sur-pied-poids-vif',
    category: 'porc',
    description:
      "Porcs d'élevage vendus au kilo de poids vif, pour restaurateurs, charcutiers et revendeurs. Commande à partir de 90 kg (environ un porc).",
    shortDescription: 'Porc vivant vendu au kg, à partir de 90 kg.',
    price: 11000,
    images: ['/images/porc/Accueil.jpeg', '/images/porc/Porc_rouge_29.jpeg'],
    inStock: true,
    stockQuantity: 3000,
    badges: ['populaire'],
    characteristics: ['Élevage local', 'Vendu au kg de poids vif', 'Minimum 90 kg par commande'],
    moq: 90,
    unit: 'kg',
    priceTiers: [
      { minQty: 270, unitPrice: 10600 },
      { minQty: 900, unitPrice: 10200 },
    ],
  },
  {
    name: 'Carcasse de porc entière',
    slug: 'carcasse-porc-entiere',
    category: 'porc',
    description:
      'Carcasse de porc entière, abattue et refroidie, prête pour la découpe. Vendue au kilo, à partir de 90 kg.',
    shortDescription: 'Carcasse entière refroidie, à partir de 90 kg.',
    price: 15000,
    images: ['/images/porc/Porc_rouge_2_29.jpeg', '/images/porc/Porc_noir_29.jpeg'],
    inStock: true,
    stockQuantity: 2500,
    badges: [],
    characteristics: ['Abattage contrôlé', 'Chaîne du froid respectée', 'Minimum 90 kg par commande'],
    moq: 90,
    unit: 'kg',
    priceTiers: [
      { minQty: 270, unitPrice: 14400 },
      { minQty: 900, unitPrice: 13800 },
    ],
  },
  {
    name: 'Porc découpé : échine et côtes',
    slug: 'porc-decoupe-echine-cotes',
    category: 'porc',
    description:
      'Échine et côtes de porc découpées, conditionnées en cartons, pour la restauration et la charcuterie. Vendues au kilo, à partir de 90 kg.',
    shortDescription: 'Échine et côtes en carton, à partir de 90 kg.',
    price: 17000,
    images: ['/images/porc/Porc_blanc_29.jpeg'],
    inStock: true,
    stockQuantity: 1800,
    badges: ['nouveau'],
    characteristics: ['Découpe professionnelle', 'Conditionnement en carton', 'Minimum 90 kg par commande'],
    moq: 90,
    unit: 'kg',
    priceTiers: [
      { minQty: 270, unitPrice: 16300 },
      { minQty: 900, unitPrice: 15600 },
    ],
  },
  {
    name: 'Poulet de chair (lot de 500)',
    slug: 'poulet-de-chair-500-pieces',
    category: 'volaille',
    description:
      'Poulets de chair calibrés, vendus à la pièce par lot minimum de 500, pour grossistes, traiteurs et collectivités.',
    shortDescription: 'Poulet de chair, à partir de 500 pièces.',
    price: 16000,
    images: ['/images/chickens/Poule_29.jpeg'],
    inStock: true,
    stockQuantity: 5000,
    badges: ['populaire'],
    characteristics: ['Calibrage régulier', 'Vendu à la pièce', 'Minimum 500 pièces par commande'],
    moq: 500,
    unit: 'pièce',
    priceTiers: [
      { minQty: 1000, unitPrice: 15400 },
      { minQty: 3000, unitPrice: 14800 },
    ],
  },
  {
    name: 'Poulet fermier gasy (lot de 500)',
    slug: 'poulet-fermier-gasy-500-pieces',
    category: 'volaille',
    description:
      'Poulets fermiers gasy (akoho gasy), élevés en plein air, vendus à la pièce par lot minimum de 500.',
    shortDescription: 'Poulet fermier gasy, à partir de 500 pièces.',
    price: 28000,
    images: ['/images/chickens/akoho-gasy.jpeg'],
    inStock: true,
    stockQuantity: 3000,
    badges: ['plein_air'],
    characteristics: ['Élevage en plein air', 'Race locale', 'Minimum 500 pièces par commande'],
    moq: 500,
    unit: 'pièce',
    priceTiers: [
      { minQty: 1000, unitPrice: 27000 },
      { minQty: 2500, unitPrice: 26000 },
    ],
  },
  {
    name: 'Canard de chair (lot de 500)',
    slug: 'canard-de-chair-500-pieces',
    category: 'volaille',
    description: 'Canards de chair vendus à la pièce par lot minimum de 500, pour la restauration et les revendeurs.',
    shortDescription: 'Canard de chair, à partir de 500 pièces.',
    price: 30000,
    images: ['/images/chickens/Canard_29.jpeg'],
    inStock: true,
    stockQuantity: 2000,
    badges: [],
    characteristics: ['Vendu à la pièce', 'Minimum 500 pièces par commande'],
    moq: 500,
    unit: 'pièce',
    priceTiers: [
      { minQty: 1000, unitPrice: 29000 },
      { minQty: 2000, unitPrice: 28000 },
    ],
  },
  {
    name: 'Caille (lot de 500)',
    slug: 'caille-500-pieces',
    category: 'volaille',
    description: 'Cailles vendues à la pièce par lot minimum de 500, pour la restauration et les revendeurs.',
    shortDescription: 'Caille, à partir de 500 pièces.',
    price: 4500,
    images: ['/images/caille/caille1.jpeg'],
    inStock: true,
    stockQuantity: 20000,
    badges: ['nouveau'],
    characteristics: ['Vendue à la pièce', 'Minimum 500 pièces par commande'],
    moq: 500,
    unit: 'pièce',
    priceTiers: [
      { minQty: 2000, unitPrice: 4300 },
      { minQty: 10000, unitPrice: 4100 },
    ],
  },
];
