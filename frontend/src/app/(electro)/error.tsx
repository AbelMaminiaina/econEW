'use client';

import { useEffect } from 'react';

// Filet de sécurité des pages Electro : au lieu d'un écran d'erreur brut, un message et deux issues.
// Le panier étant conservé dans le navigateur, un panier corrompu ou périmé est une cause possible.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const clearCartAndRetry = () => {
    try {
      localStorage.removeItem('b2b-cart');
    } catch {
      // stockage indisponible : on réessaie simplement
    }
    reset();
  };

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 640 }}>
      <i className="fas fa-exclamation-triangle display-1 text-secondary mb-4 d-block"></i>
      <h1 className="mb-3">Une erreur est survenue</h1>
      <p className="mb-4">
        La page n&apos;a pas pu s&apos;afficher. Vous pouvez réessayer ; si le problème vient de votre panier,
        videz-le puis recommencez vos achats.
      </p>
      <div className="d-flex flex-wrap justify-content-center gap-3">
        <button type="button" className="btn btn-primary rounded-pill py-3 px-5" onClick={reset}>
          Réessayer
        </button>
        <button type="button" className="btn btn-light rounded-pill py-3 px-5" onClick={clearCartAndRetry}>
          Vider le panier et réessayer
        </button>
      </div>
    </div>
  );
}
