import { PrismaClient, ProductBadge } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ELECTRO_CATEGORIES, ELECTRO_PRODUCTS, DEMO_SELLER_SLUGS } from './electro-catalog.js';

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
  const categories = ELECTRO_CATEGORIES;

  for (const cat of categories) {
    await prisma.category.create({ data: { ...cat, isActive: true } });
  }
  console.log(`Created ${categories.length} categories`);

  // ==================== PRODUITS ====================
  const products = ELECTRO_PRODUCTS;

  for (const { priceTiers, ...product } of products) {
    await prisma.product.create({
      data: {
        ...product,
        ...(priceTiers ? { priceTiers: { create: priceTiers } } : {}),
      },
    });
  }
  console.log(`Created ${products.length} products`);

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
  // Quelques produits sont « publiés » par l'entreprise de démonstration (place de marché)
  await prisma.product.updateMany({
    where: { slug: { in: DEMO_SELLER_SLUGS } },
    data: { sellerId: demoCompany.id },
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
