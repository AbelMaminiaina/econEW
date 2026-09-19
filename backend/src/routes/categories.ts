import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requirePlatformAdmin } from '../middleware/auth.js';

const router = Router();

// Product.category is stored with underscores (historical), Category.slug uses dashes
const slugToProductCategory = (slug: string) => slug.replace(/-/g, '_');

// Get all categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
    });

    // Count products using the category field
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await prisma.product.count({
          where: { category: slugToProductCategory(cat.slug) },
        });
        return {
          ...cat,
          _count: { products: productCount }
        };
      })
    );

    res.json({
      categories: categoriesWithCount,
      total: categoriesWithCount.length,
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      details: error?.message || 'Unknown error'
    });
  }
});

// Get active categories only (for frontend) - sorted by stock availability
router.get('/active', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    // Get stock counts for each category
    const categoriesWithStock = await Promise.all(
      categories.map(async (cat) => {
        const inStockCount = await prisma.product.count({
          where: { category: slugToProductCategory(cat.slug), inStock: true },
        });
        return { ...cat, inStockCount };
      })
    );

    // Sort: categories with stock first, then by order
    categoriesWithStock.sort((a, b) => {
      if (a.inStockCount > 0 && b.inStockCount === 0) return -1;
      if (a.inStockCount === 0 && b.inStockCount > 0) return 1;
      return a.order - b.order;
    });

    res.json(categoriesWithStock);
  } catch (error: any) {
    console.error('Error fetching active categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get category by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error: any) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Create category
router.post('/', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, image, order, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        order: order ?? 0,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json({ success: true, category });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, image, order, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    // Check if category exists
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Generate new slug if name changed
    let slug = existing.slug;
    if (name !== existing.name) {
      slug = generateSlug(name);
      const slugExists = await prisma.category.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        order: order ?? existing.order,
        isActive: isActive ?? existing.isActive,
      },
    });

    res.json({ success: true, category });
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Check if category has products
    const productCount = await prisma.product.count({
      where: { category: slugToProductCategory(existing.slug) },
    });

    if (productCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer : ${productCount} produit(s) dans cette catégorie`,
      });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Reorder categories
router.post('/reorder', authenticate, requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id, order }

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    await Promise.all(
      orders.map(({ id, order }: { id: string; order: number }) =>
        prisma.category.update({
          where: { id },
          data: { order },
        })
      )
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering categories:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

export default router;
