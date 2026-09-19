'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useCategories, Category } from '@/hooks/useCategories';

interface ProductFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  productCounts: Record<string, number>;
}

export function ProductFilter({
  selectedCategory,
  onCategoryChange,
  productCounts,
}: ProductFilterProps) {
  const { categories, loading } = useCategories();

  // Construire la liste avec "Tous" en premier
  const filterCategories = [
    { slug: 'all', name: 'Tous' },
    ...categories.filter(c => c.isActive),
  ];

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="px-4 py-2 rounded-full bg-warm-100 animate-pulse w-24 h-10"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filterCategories.map((category) => {
        const count = category.slug === 'all'
          ? Object.values(productCounts).reduce((a, b) => a + b, 0)
          : productCounts[category.slug] || 0;

        return (
          <button
            key={category.slug}
            onClick={() => onCategoryChange(category.slug)}
            className={cn(
              'px-4 py-2 rounded-full font-medium transition-all duration-200',
              'flex items-center gap-2',
              selectedCategory === category.slug
                ? 'bg-prairie-600 text-white shadow-md'
                : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
            )}
          >
            {category.name}
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                selectedCategory === category.slug
                  ? 'bg-white/20 text-white'
                  : 'bg-warm-200 text-warm-600'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ProductFilter;
