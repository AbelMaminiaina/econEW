'use client';

import { useEffect } from 'react';
import { loadElectroPlugins } from './plugins';

// Charge jQuery / Bootstrap JS / Owl / WOW du template et démarre WOW (animations à l'apparition).
// `live: true` (défaut de WOW) anime aussi les éléments ajoutés plus tard par React.
export function ElectroEffects() {
  useEffect(() => {
    let cancelled = false;
    loadElectroPlugins()
      .then(() => {
        if (!cancelled && window.WOW) new window.WOW().init();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export default ElectroEffects;
