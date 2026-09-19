import { PrismaClient } from '@prisma/client';
import { ELECTRO_CATEGORIES, ELECTRO_PRODUCTS, DEMO_COMPANY_NAME, DEMO_SELLER_SLUGS } from './electro-catalog.js';

// Remplace UNIQUEMENT le catalogue : supprime les produits (et leurs paliers de prix et avis, en
// cascade) et les catégories, puis crée le catalogue Electro. Les comptes, entreprises et
// commandes ne sont pas touchés. Refuse de s'exécuter si des commandes référencent des produits
// (leurs lignes de commande seraient perdues) : dans ce cas, supprimez d'abord ces commandes.
const prisma = new PrismaClient();

async function main() {
  const orderItems = await prisma.orderItem.count();
  if (orderItems > 0) {
    throw new Error(
      `${orderItems} ligne(s) de commande référencent des produits : suppression du catalogue annulée.`
    );
  }

  const before = {
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    reviews: await prisma.review.count(),
  };

  await prisma.$transaction(async (tx) => {
    await tx.review.deleteMany();
    await tx.priceTier.deleteMany();
    await tx.product.deleteMany();
    await tx.category.deleteMany();

    for (const category of ELECTRO_CATEGORIES) {
      await tx.category.create({ data: { ...category, isActive: true } });
    }
    for (const { priceTiers, ...product } of ELECTRO_PRODUCTS) {
      await tx.product.create({
        data: { ...product, ...(priceTiers ? { priceTiers: { create: priceTiers } } : {}) },
      });
    }
  });

  // Si l'entreprise de démonstration existe, elle « publie » quelques produits (place de marché)
  const demoCompany = await prisma.company.findFirst({ where: { name: DEMO_COMPANY_NAME } });
  if (demoCompany) {
    await prisma.product.updateMany({
      where: { slug: { in: DEMO_SELLER_SLUGS } },
      data: { sellerId: demoCompany.id },
    });
  }

  console.log(
    `Supprimé : ${before.products} produits, ${before.categories} catégories, ${before.reviews} avis. ` +
      `Créé : ${ELECTRO_PRODUCTS.length} produits, ${ELECTRO_CATEGORIES.length} catégories.`
  );

  try {
    const { invalidateProductCache } = await import('../src/lib/cache.js');
    await invalidateProductCache();
  } catch {
    console.log('Cache produits non vidé (Redis indisponible) : les changements apparaîtront à expiration du cache.');
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    // La connexion Redis (invalidation du cache) garderait le processus ouvert
    process.exit(process.exitCode ?? 0);
  });
