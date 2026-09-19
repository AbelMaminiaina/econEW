import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { withCache, CACHE_TTL, CACHE_KEYS, invalidateProductCache } from '../lib/cache.js';
import { authenticate, requirePlatformAdmin } from '../middleware/auth.js';

const router = Router();

// Transform product for frontend
function transformProduct(p: any) {
  return {
    ...p,
    category: p.category.replace('_', '-'),
    isActive: p.isActive ?? true,
    moq: p.moq ?? 1,
    unit: p.unit ?? 'piece',
    estimatedWeightKg: p.estimatedWeightKg ?? null,
    freeShipping: p.freeShipping ?? false,
    availableFrom: p.availableFrom ?? null,
    priceTiers: p.priceTiers ?? [],
    metadata: {
      dimensions: p.dimensions,
      weight: p.weight,
    },
  };
}

// Get all products with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, inStock, includeInactive } = req.query;

    // Build cache key based on query params
    const cacheKey = `${CACHE_KEYS.PRODUCTS}:list:${category || 'all'}:${search || ''}:${inStock || ''}:${includeInactive || ''}`;

    const result = await withCache(
      cacheKey,
      CACHE_TTL.PRODUCTS,
      async () => {
        const where: any = {};

        // Filter by category (slugs are dash-separated, stored values use underscores)
        if (category && category !== 'all') {
          where.category = (category as string).replace(/-/g, '_');
        }

        // Filter by search term
        if (search && typeof search === 'string') {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }

        // Filter by stock status (afficher tous les produits par défaut, y compris épuisés)
        if (inStock === 'true') {
          where.inStock = true;
        } else if (inStock === 'false') {
          where.inStock = false;
        }

        // Filter by active status (masquer les produits inactifs par défaut)
        if (includeInactive !== 'true') {
          where.isActive = true;
        }

        const products = await prisma.product.findMany({
          where,
          include: { priceTiers: { orderBy: { minQty: 'asc' } } },
          orderBy: [
            { inStock: 'desc' },  // En stock en premier
            { createdAt: 'desc' },
          ],
        });

        const transformedProducts = products.map(transformProduct);

        return {
          products: transformedProducts,
          total: transformedProducts.length,
        };
      }
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      details: error?.message || 'Unknown error'
    });
  }
});

// Get product by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const cacheKey = `${CACHE_KEYS.PRODUCT}:${slug}`;

    const product = await withCache(
      cacheKey,
      CACHE_TTL.PRODUCT,
      async () => {
        const p = await prisma.product.findUnique({
          where: { slug },
          include: { priceTiers: { orderBy: { minQty: 'asc' } } },
        });

        if (!p) return null;
        return transformProduct(p);
      }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get related products
router.get('/:slug/related', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit as string) || 4;
    const cacheKey = `${CACHE_KEYS.RELATED}:${slug}:${limit}`;

    const result = await withCache(
      cacheKey,
      CACHE_TTL.RELATED,
      async () => {
        const product = await prisma.product.findUnique({
          where: { slug },
        });

        if (!product) return null;

        const relatedProducts = await prisma.product.findMany({
          where: {
            category: product.category,
            slug: { not: slug },
          },
          include: { priceTiers: { orderBy: { minQty: 'asc' } } },
          take: limit,
        });

        return relatedProducts.map(transformProduct);
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching related products:', error);
    res.status(500).json({ error: 'Failed to fetch related products' });
  }
});

// Admin: Update product stock
router.patch('/:productId/stock', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { stockQuantity } = req.body;

    if (typeof stockQuantity !== 'number' || stockQuantity < 0) {
      return res.status(400).json({ error: 'Quantité de stock invalide' });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity,
        inStock: stockQuantity > 0,
      },
    });

    await invalidateProductCache();
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error updating product stock:', error);
    res.status(500).json({ error: 'Failed to update product stock' });
  }
});

// Admin: Replace a product's price tiers (paliers de prix dégressifs)
router.put('/:productId/price-tiers', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { tiers } = req.body;

    if (!Array.isArray(tiers) || !tiers.every((t) =>
      typeof t.minQty === 'number' && t.minQty > 0 &&
      typeof t.unitPrice === 'number' && t.unitPrice > 0
    )) {
      return res.status(400).json({ error: 'Paliers de prix invalides' });
    }

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    await prisma.$transaction([
      prisma.priceTier.deleteMany({ where: { productId } }),
      prisma.priceTier.createMany({
        data: tiers.map((t: { minQty: number; unitPrice: number }) => ({
          productId,
          minQty: t.minQty,
          unitPrice: t.unitPrice,
        })),
      }),
    ]);

    await invalidateProductCache();

    const priceTiers = await prisma.priceTier.findMany({
      where: { productId },
      orderBy: { minQty: 'asc' },
    });

    res.json({ success: true, priceTiers });
  } catch (error) {
    console.error('Error updating price tiers:', error);
    res.status(500).json({ error: 'Failed to update price tiers' });
  }
});

// A product's category must match an existing entry in the dynamic categories table
// (categories are managed freely from /admin/categories; slugs use dashes there, but are
// stored on Product with underscores for historical reasons).
async function isValidProductCategory(category: unknown): Promise<boolean> {
  if (typeof category !== 'string' || !category) return false;
  const match = await prisma.category.findFirst({
    where: { slug: category.replace(/_/g, '-') },
  });
  return Boolean(match);
}

// Validate the optional "vente en gros + logistique" fields shared by create/update.
// Returns an error message, or null when the payload is acceptable.
function validateProductExtras(body: any): string | null {
  const { moq, unit, estimatedWeightKg, freeShipping } = body;

  if (moq !== undefined && (typeof moq !== 'number' || !Number.isInteger(moq) || moq < 1)) {
    return 'Quantité minimum de commande invalide';
  }
  if (unit !== undefined && (typeof unit !== 'string' || !unit.trim())) {
    return 'Unité de vente invalide';
  }
  if (
    estimatedWeightKg !== undefined &&
    estimatedWeightKg !== null &&
    (typeof estimatedWeightKg !== 'number' ||
      !Number.isFinite(estimatedWeightKg) ||
      estimatedWeightKg <= 0 ||
      estimatedWeightKg > 500)
  ) {
    return 'Poids estimé invalide (entre 0 et 500 kg)';
  }
  if (freeShipping !== undefined && typeof freeShipping !== 'boolean') {
    return 'Valeur de livraison gratuite invalide';
  }

  const { availableFrom } = body;
  if (
    availableFrom !== undefined &&
    availableFrom !== null &&
    availableFrom !== '' &&
    Number.isNaN(new Date(availableFrom).getTime())
  ) {
    return 'Date de disponibilité invalide';
  }

  return validateImages(body.images);
}

// Chaque image est stockée en data: URI dans le produit ; on plafonne la taille
// pour éviter des réponses API géantes (Next.js tronque > 2 Mo côté rendu).
const MAX_IMAGE_LENGTH = 1_500_000; // ~1,1 Mo binaire une fois décodé

function validateImages(images: unknown): string | null {
  if (images === undefined) return null;
  if (!Array.isArray(images) || !images.every((img) => typeof img === 'string')) {
    return 'Images invalides';
  }
  if (images.some((img) => img.length > MAX_IMAGE_LENGTH)) {
    return 'Une image est trop lourde. Réduisez sa taille (max ~1 Mo) avant de l’ajouter.';
  }
  return null;
}

// Normalise la date de disponibilité reçue du client (string ISO / '' / null) en Date | null.
function parseAvailableFrom(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  return new Date(value as string);
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Admin: Create new product
router.post('/', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, category, price, stockQuantity, images,
      moq, unit, estimatedWeightKg, freeShipping, availableFrom } = req.body;

    if (!name || !category || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Données invalides' });
    }

    const extrasError = validateProductExtras(req.body);
    if (extrasError) {
      return res.status(400).json({ error: extrasError });
    }

    if (!(await isValidProductCategory(category))) {
      return res.status(400).json({
        error: `Catégorie "${category}" introuvable. Créez-la d'abord dans la gestion des catégories.`,
      });
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) {
      slug = `${slug}-${Date.now()}`;
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || '',
        shortDescription: description ? description.substring(0, 100) : '',
        category,
        price,
        stockQuantity: stockQuantity || 0,
        inStock: (stockQuantity || 0) > 0,
        images: images || [],
        moq: moq ?? 1,
        unit: unit ?? 'piece',
        estimatedWeightKg: estimatedWeightKg ?? null,
        freeShipping: freeShipping ?? false,
        availableFrom: parseAvailableFrom(availableFrom),
      },
    });

    await invalidateProductCache();
    res.status(201).json({ success: true, product: transformProduct(product) });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Admin: Update product
router.put('/:productId', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { name, description, category, price, stockQuantity, images,
      moq, unit, estimatedWeightKg, freeShipping, availableFrom } = req.body;

    if (!name || !category || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Données invalides' });
    }

    const extrasError = validateProductExtras(req.body);
    if (extrasError) {
      return res.status(400).json({ error: extrasError });
    }

    if (!(await isValidProductCategory(category))) {
      return res.status(400).json({
        error: `Catégorie "${category}" introuvable. Créez-la d'abord dans la gestion des catégories.`,
      });
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Un produit lié à des commandes reste entièrement modifiable, sauf son nom :
    // les historiques de commandes affichent le nom du produit en direct.
    if (name !== existingProduct.name) {
      const linkedOrderItem = await prisma.orderItem.findFirst({
        where: { productId },
        select: { id: true },
      });
      if (linkedOrderItem) {
        return res.status(400).json({
          error: "Le nom d'un produit lié à des commandes ne peut pas être modifié.",
        });
      }
    }

    // Generate new slug if name changed
    let slug = existingProduct.slug;
    if (name !== existingProduct.name) {
      slug = generateSlug(name);
      const slugExists = await prisma.product.findFirst({
        where: { slug, id: { not: productId } },
      });
      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        slug,
        description: description || '',
        shortDescription: description ? description.substring(0, 100) : '',
        category,
        price,
        stockQuantity: stockQuantity ?? existingProduct.stockQuantity,
        inStock: (stockQuantity ?? existingProduct.stockQuantity) > 0,
        images: images || existingProduct.images,
        moq: moq ?? existingProduct.moq,
        unit: unit ?? existingProduct.unit,
        estimatedWeightKg:
          estimatedWeightKg === undefined ? existingProduct.estimatedWeightKg : estimatedWeightKg,
        freeShipping:
          freeShipping === undefined ? existingProduct.freeShipping : freeShipping,
        availableFrom:
          availableFrom === undefined ? existingProduct.availableFrom : parseAvailableFrom(availableFrom),
      },
    });

    await invalidateProductCache();
    res.json({ success: true, product: transformProduct(product) });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Admin: Update product images only (allowed even if product has orders,
// since changing the photo doesn't affect order history integrity)
router.patch('/:productId/images', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { images } = req.body;

    if (!Array.isArray(images)) {
      return res.status(400).json({ error: 'Images invalides' });
    }
    const imagesError = validateImages(images);
    if (imagesError) {
      return res.status(400).json({ error: imagesError });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { images },
    });

    await invalidateProductCache();
    res.json({ success: true, product: transformProduct(product) });
  } catch (error) {
    console.error('Error updating product images:', error);
    res.status(500).json({ error: 'Failed to update product images' });
  }
});

// Toggle product visibility (isActive)
router.patch('/:productId/visibility', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { isActive } = req.body;

    const product = await prisma.product.update({
      where: { id: productId },
      data: { isActive: isActive ?? false },
    });

    await invalidateProductCache();
    res.json({
      success: true,
      isActive: product.isActive,
      message: product.isActive ? 'Produit visible dans le catalogue' : 'Produit masqué du catalogue'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Check if product has orders (for delete warning)
router.get('/:productId/has-orders', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const orderItem = await prisma.orderItem.findFirst({
      where: { productId },
      include: {
        order: {
          select: { orderNumber: true, createdAt: true }
        }
      }
    });

    const ordersCount = await prisma.orderItem.count({
      where: { productId }
    });

    res.json({
      hasOrders: !!orderItem,
      ordersCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: Delete product
router.delete('/:productId', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Check if product has orders
    const orderItems = await prisma.orderItem.findFirst({
      where: { productId },
    });

    if (orderItems) {
      // Soft delete - just mark as out of stock instead of deleting
      await prisma.product.update({
        where: { id: productId },
        data: { inStock: false, stockQuantity: 0 },
      });
      await invalidateProductCache();
      return res.json({
        success: true,
        message: 'Produit désactivé (conservé car lié à des commandes)'
      });
    }

    await prisma.product.delete({ where: { id: productId } });
    await invalidateProductCache();
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
