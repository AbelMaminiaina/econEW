import { PrismaClient } from '@prisma/client';
import { MEAT_CATEGORIES, MEAT_PRODUCTS } from './meat-catalog.js';

// Ajoute (sans rien effacer) les catégories et produits porc / volaille. Relançable : ce qui existe
// déjà (y compris modifié dans l'admin) n'est pas touché.
const prisma = new PrismaClient();

async function main() {
  for (const cat of MEAT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true },
    });
  }

  let created = 0;
  for (const { priceTiers, ...product } of MEAT_PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    if (existing) continue;
    await prisma.product.create({ data: { ...product, priceTiers: { create: priceTiers } } });
    created++;
  }
  console.log(`Catégories : ${MEAT_CATEGORIES.length} vérifiées. Produits créés : ${created}/${MEAT_PRODUCTS.length}.`);

  try {
    const { invalidateProductCache } = await import('../src/lib/cache.js');
    await invalidateProductCache();
  } catch {
    console.log('Cache produits non vidé (Redis indisponible) : les nouveaux produits apparaîtront à expiration du cache.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
