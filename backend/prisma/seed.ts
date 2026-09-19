import { PrismaClient, ProductBadge } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { MEAT_CATEGORIES, MEAT_PRODUCTS } from './meat-catalog.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.priceTier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.contactMessage.deleteMany();

  // ==================== CATÉGORIES ====================
  const categories = [
    { name: 'Emballage & Conditionnement', slug: 'emballage', order: 1 },
    { name: 'Fournitures de bureau', slug: 'fournitures-bureau', order: 2 },
    { name: 'Hygiène & Nettoyage', slug: 'hygiene-nettoyage', order: 3 },
    { name: 'Quincaillerie', slug: 'quincaillerie', order: 4 },
    { name: 'Électronique & Informatique', slug: 'electronique', order: 5 },
    { name: 'Textile professionnel', slug: 'textile', order: 6 },
    ...MEAT_CATEGORIES,
  ];

  for (const cat of categories) {
    await prisma.category.create({ data: { ...cat, isActive: true } });
  }
  console.log(`Created ${categories.length} categories`);

  // ==================== PRODUITS ====================
  const products: Array<{
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
    weight?: string;
    dimensions?: string;
    priceTiers?: { minQty: number; unitPrice: number }[];
  }> = [
    {
      name: 'Carton d\'emballage double cannelure (40x30x30cm)',
      slug: 'carton-emballage-double-cannelure-40x30x30',
      category: 'emballage',
      description: 'Carton robuste double cannelure, idéal pour l\'expédition de marchandises volumineuses. Vendu par lot de 25.',
      shortDescription: 'Carton double cannelure, lot de 25.',
      price: 1200,
      images: [],
      inStock: true,
      stockQuantity: 5000,
      badges: ['populaire'] as ProductBadge[],
      characteristics: ['Double cannelure', 'Résistant à l\'humidité', 'Format standard 40x30x30cm'],
      moq: 25,
      unit: 'carton',
      dimensions: '40x30x30 cm',
      priceTiers: [
        { minQty: 100, unitPrice: 1050 },
        { minQty: 500, unitPrice: 900 },
        { minQty: 2000, unitPrice: 750 },
      ],
    },
    {
      name: 'Film étirable palette 500mm',
      slug: 'film-etirable-palette-500mm',
      category: 'emballage',
      description: 'Film étirable professionnel pour la stabilisation de palettes, rouleau de 500mm x 300m.',
      shortDescription: 'Rouleau de film étirable 500mm x 300m.',
      price: 8500,
      images: [],
      inStock: true,
      stockQuantity: 800,
      badges: [] as ProductBadge[],
      characteristics: ['Épaisseur 17 microns', 'Haute résistance à la déchirure'],
      moq: 6,
      unit: 'rouleau',
      priceTiers: [
        { minQty: 24, unitPrice: 7800 },
        { minQty: 96, unitPrice: 7000 },
      ],
    },
    {
      name: 'Ramette papier A4 80g',
      slug: 'ramette-papier-a4-80g',
      category: 'fournitures-bureau',
      description: 'Papier blanc A4 80g/m² pour impression bureautique, carton de 5 ramettes (2500 feuilles).',
      shortDescription: 'Carton de 5 ramettes A4 80g.',
      price: 45000,
      images: [],
      inStock: true,
      stockQuantity: 300,
      badges: ['populaire'] as ProductBadge[],
      characteristics: ['Blancheur 96%', 'Compatible tous types d\'imprimantes'],
      moq: 1,
      unit: 'carton',
      priceTiers: [
        { minQty: 10, unitPrice: 42000 },
        { minQty: 50, unitPrice: 38000 },
      ],
    },
    {
      name: 'Stylo bille bleu (boîte de 50)',
      slug: 'stylo-bille-bleu-boite-50',
      category: 'fournitures-bureau',
      description: 'Stylos à bille pointe fine, encre bleue, boîte de 50 unités.',
      shortDescription: 'Boîte de 50 stylos bille bleus.',
      price: 25000,
      images: [],
      inStock: true,
      stockQuantity: 400,
      badges: ['nouveau'] as ProductBadge[],
      characteristics: ['Pointe 1.0mm', 'Encre longue durée'],
      moq: 2,
      unit: 'boîte',
    },
    {
      name: 'Gel hydroalcoolique 5L',
      slug: 'gel-hydroalcoolique-5l',
      category: 'hygiene-nettoyage',
      description: 'Gel hydroalcoolique professionnel en bidon de 5 litres, avec robinet doseur.',
      shortDescription: 'Bidon de 5L de gel hydroalcoolique.',
      price: 55000,
      images: [],
      inStock: true,
      stockQuantity: 200,
      badges: ['populaire'] as ProductBadge[],
      characteristics: ['70% d\'alcool', 'Norme EN 14476'],
      moq: 4,
      unit: 'bidon',
      priceTiers: [
        { minQty: 20, unitPrice: 50000 },
        { minQty: 60, unitPrice: 45000 },
      ],
    },
    {
      name: 'Essuie-tout industriel (lot de 6 rouleaux)',
      slug: 'essuie-tout-industriel-lot-6',
      category: 'hygiene-nettoyage',
      description: 'Bobines d\'essuyage industriel haute absorption, lot de 6 rouleaux de 1000 feuilles.',
      shortDescription: 'Lot de 6 bobines d\'essuyage industriel.',
      price: 32000,
      images: [],
      inStock: true,
      stockQuantity: 350,
      badges: [] as ProductBadge[],
      characteristics: ['Double épaisseur', 'Haute absorption'],
      moq: 3,
      unit: 'lot',
    },
    {
      name: 'Vis à bois inox (boîte de 200)',
      slug: 'vis-a-bois-inox-boite-200',
      category: 'quincaillerie',
      description: 'Vis à bois tête fraisée en acier inoxydable, 4x40mm, boîte de 200 unités.',
      shortDescription: 'Boîte de 200 vis à bois inox 4x40mm.',
      price: 18000,
      images: [],
      inStock: true,
      stockQuantity: 600,
      badges: [] as ProductBadge[],
      characteristics: ['Acier inoxydable A2', 'Tête fraisée cruciforme'],
      moq: 5,
      unit: 'boîte',
      priceTiers: [
        { minQty: 30, unitPrice: 16500 },
      ],
    },
    {
      name: 'Cadenas de sécurité laiton 40mm',
      slug: 'cadenas-securite-laiton-40mm',
      category: 'quincaillerie',
      description: 'Cadenas laiton massif, anse acier trempé, diamètre 40mm.',
      shortDescription: 'Cadenas laiton massif 40mm.',
      price: 12000,
      images: [],
      inStock: true,
      stockQuantity: 250,
      badges: ['nouveau'] as ProductBadge[],
      characteristics: ['Laiton massif', 'Anse acier trempé anti-sciage'],
      moq: 10,
      unit: 'pièce',
    },
    {
      name: 'Câble réseau Ethernet Cat6 (touret 305m)',
      slug: 'cable-reseau-ethernet-cat6-305m',
      category: 'electronique',
      description: 'Câble réseau Cat6 U/UTP, touret de 305 mètres, pour installation professionnelle.',
      shortDescription: 'Touret de 305m de câble Cat6.',
      price: 320000,
      images: [],
      inStock: true,
      stockQuantity: 40,
      badges: ['populaire'] as ProductBadge[],
      characteristics: ['Cat6 U/UTP', 'Gaine PVC', 'Bande passante 250 MHz'],
      moq: 1,
      unit: 'touret',
      priceTiers: [
        { minQty: 5, unitPrice: 295000 },
      ],
    },
    {
      name: 'Multiprise professionnelle 6 prises + parafoudre',
      slug: 'multiprise-professionnelle-6-prises',
      category: 'electronique',
      description: 'Multiprise 6 prises avec protection parafoudre, câble 3m, pour équipement de bureau.',
      shortDescription: 'Multiprise 6 prises avec parafoudre.',
      price: 28000,
      images: [],
      inStock: true,
      stockQuantity: 150,
      badges: [] as ProductBadge[],
      characteristics: ['6 prises', 'Protection parafoudre', 'Câble 3m'],
      moq: 5,
      unit: 'pièce',
    },
    {
      name: 'Polo professionnel brodable (lot de 20)',
      slug: 'polo-professionnel-brodable-lot-20',
      category: 'textile',
      description: 'Polos 100% coton, coloris assortis, prêts à broder pour vos équipes. Lot de 20 pièces (tailles mixtes).',
      shortDescription: 'Lot de 20 polos professionnels brodables.',
      price: 480000,
      images: [],
      inStock: true,
      stockQuantity: 30,
      badges: ['nouveau'] as ProductBadge[],
      characteristics: ['100% coton', 'Grammage 220g/m²', 'Tailles S à XXL'],
      moq: 1,
      unit: 'lot',
      priceTiers: [
        { minQty: 5, unitPrice: 440000 },
      ],
    },
    {
      name: 'Gants de travail renforcés (paire, carton de 100)',
      slug: 'gants-travail-renforces-carton-100',
      category: 'textile',
      description: 'Gants de manutention renforcés paume PVC, carton de 100 paires.',
      shortDescription: 'Carton de 100 paires de gants renforcés.',
      price: 150000,
      images: [],
      inStock: true,
      stockQuantity: 60,
      badges: ['populaire'] as ProductBadge[],
      characteristics: ['Paume enduite PVC', 'Poignet élastiqué', 'Norme EN 388'],
      moq: 1,
      unit: 'carton',
      priceTiers: [
        { minQty: 5, unitPrice: 138000 },
        { minQty: 20, unitPrice: 125000 },
      ],
    },
  ];

  for (const { priceTiers, ...product } of [...products, ...MEAT_PRODUCTS]) {
    await prisma.product.create({
      data: {
        ...product,
        ...(priceTiers ? { priceTiers: { create: priceTiers } } : {}),
      },
    });
  }
  console.log(`Created ${products.length + MEAT_PRODUCTS.length} products`);

  // ==================== COMPTES DE DÉMONSTRATION ====================
  const platformAdminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'admin123';
  const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'admin@example.com';

  await prisma.user.create({
    data: {
      email: platformAdminEmail,
      passwordHash: await bcrypt.hash(platformAdminPassword, 10),
      firstName: 'Admin',
      lastName: 'Plateforme',
      role: 'platform_admin',
    },
  });
  console.log(`Created platform_admin: ${platformAdminEmail} / ${platformAdminPassword}`);

  const demoCompany = await prisma.company.create({
    data: {
      name: 'Grossiste Demo SARL',
      legalName: 'Grossiste Demo SARL',
      taxId: 'DEMO-0001',
      status: 'approved',
      paymentTerms: 'net_30',
      creditLimit: 5_000_000,
      contactEmail: 'contact@grossiste-demo.example',
      contactPhone: '0340000000',
      users: {
        create: {
          email: 'buyer@grossiste-demo.example',
          passwordHash: await bcrypt.hash('demo1234', 10),
          firstName: 'Jean',
          lastName: 'Acheteur',
          role: 'company_admin',
        },
      },
    },
  });
  console.log(`Created demo company: ${demoCompany.name} (buyer@grossiste-demo.example / demo1234)`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
