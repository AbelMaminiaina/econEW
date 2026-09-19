'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem } from '@/types';
import { useEffect, useState } from 'react';

const FALLBACK_IMAGE = '/electro/img/product-3.png';

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * Remet d'aplomb un panier relu depuis le navigateur. Le localStorage est partagé par toutes les
 * applications servies sur la même origine (ex. un autre projet sur localhost:3000) et peut contenir
 * des lignes d'un ancien format : sans cela, un seul champ manquant (paliers de prix, unité...)
 * ferait planter l'en-tête et la page panier. Les lignes inutilisables sont écartées.
 */
export function sanitizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): CartItem[] => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<CartItem>;
    if (
      typeof item.productId !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.slug !== 'string' ||
      !isNumber(item.price) ||
      !isNumber(item.quantity) ||
      item.quantity <= 0
    ) {
      return [];
    }

    // Les anciennes images (dossier /images supprimé) sont remplacées par un visuel par défaut
    const image =
      typeof item.image === 'string' && item.image && !item.image.startsWith('/images/')
        ? item.image
        : FALLBACK_IMAGE;

    return [
      {
        ...item,
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        price: item.price,
        quantity: item.quantity,
        image,
        moq: isNumber(item.moq) && item.moq > 0 ? item.moq : 1,
        unit: typeof item.unit === 'string' && item.unit ? item.unit : 'pièce',
        priceTiers: Array.isArray(item.priceTiers)
          ? item.priceTiers.filter((t) => t && isNumber(t.minQty) && isNumber(t.unitPrice))
          : [],
        sellerId: item.sellerId ?? null,
        sellerName: item.sellerName ?? null,
      },
    ];
  });
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find((i) => i.productId === item.productId);

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                : i
            ),
          });
        } else {
          set({
            items: [...items, { ...item, quantity: item.quantity || 1 }],
          });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((i) => i.productId !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'b2b-cart',
      storage: createJSONStorage(() => localStorage),
      // Nettoie le panier stocké à chaque lecture (voir sanitizeCartItems)
      merge: (persisted, current) => ({
        ...current,
        items: sanitizeCartItems((persisted as { items?: unknown } | undefined)?.items),
      }),
    }
  )
);

// Hook with hydration handling
export function useCart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return {
    items: isHydrated ? items : [],
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isHydrated,
  };
}
