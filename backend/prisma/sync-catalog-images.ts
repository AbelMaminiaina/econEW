import { PrismaClient } from '@prisma/client';
import { ELECTRO_PRODUCTS } from './electro-catalog.js';

// Met à jour UNIQUEMENT les photos des produits du catalogue de démonstration (par slug).
// Ne supprime ni ne crée rien : les produits publiés par les vendeurs et le reste de la base
// ne sont pas touchés. Relançable sans risque.
const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  for (const product of ELECTRO_PRODUCTS) {
    const result = await prisma.product.updateMany({
      where: { slug: product.slug },
      data: { images: product.images },
    });
    updated += result.count;
  }
  console.log(`Photos mises à jour : ${updated} produit(s) sur ${ELECTRO_PRODUCTS.length}.`);

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
