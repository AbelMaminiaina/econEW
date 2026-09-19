'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WishlistStore {
  ids: string[];
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

// Favoris : simple liste d'ids de produits, conservée dans le navigateur (comme le panier).
export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) => {
        const ids = get().ids;
        set({ ids: ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId] });
      },
      remove: (productId) => set({ ids: get().ids.filter((id) => id !== productId) }),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'b2b-wishlist',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Hook avec gestion de l'hydratation : côté serveur et au premier rendu, la liste est vide.
export function useWishlist() {
  const ids = useWishlistStore((state) => state.ids);
  const toggle = useWishlistStore((state) => state.toggle);
  const remove = useWishlistStore((state) => state.remove);
  const clear = useWishlistStore((state) => state.clear);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const current = isHydrated ? ids : [];

  return {
    ids: current,
    count: current.length,
    has: (productId: string) => current.includes(productId),
    toggle,
    remove,
    clear,
    isHydrated,
  };
}
