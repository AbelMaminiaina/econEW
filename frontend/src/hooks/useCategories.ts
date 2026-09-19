'use client';

import { useState, useEffect } from 'react';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  order: number;
  isActive: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Cache pour éviter les requêtes multiples
let cachedCategories: Category[] | null = null;
let cachePromise: Promise<Category[]> | null = null;

async function fetchCategories(): Promise<Category[]> {
  if (cachedCategories) return cachedCategories;

  if (cachePromise) return cachePromise;

  cachePromise = fetch(`${API_URL}/categories`)
    .then(res => res.json())
    .then(data => {
      cachedCategories = data.categories || [];
      return cachedCategories as Category[];
    })
    .catch(() => {
      cachePromise = null;
      return [] as Category[];
    });

  return cachePromise;
}

export function useCategories() {
  // Always start with empty array to avoid hydration mismatch
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use cached data immediately if available (client-side only)
    if (cachedCategories) {
      setCategories(cachedCategories);
      setLoading(false);
      return;
    }

    fetchCategories().then(cats => {
      setCategories(cats);
      setLoading(false);
    });
  }, []);

  return { categories, loading };
}

// Fonction utilitaire pour obtenir les catégories de produits (pour filtres)
export function useProductCategories() {
  const { categories, loading } = useCategories();

  // Filtrer uniquement les catégories de produits (exclure poules, accessoires, etc.)
  const productCategories = categories.filter(c =>
    ['porc', 'poulet', 'poisson', 'akanga', 'caille', 'transformes', 'oeufs-frais', 'oeufs-fecondes'].includes(c.slug)
  );

  return { categories: productCategories, loading };
}

// Fonction pour invalider le cache (après modification admin)
export function invalidateCategoriesCache() {
  cachedCategories = null;
  cachePromise = null;
}

export default useCategories;
