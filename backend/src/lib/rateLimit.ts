import type { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  /** Fenêtre en millisecondes */
  windowMs: number;
  /** Nombre maximum de requêtes par clé dans la fenêtre */
  max: number;
  /** Message de la réponse 429 */
  message?: string;
}

// Limiteur de débit en mémoire (par adresse IP). Suffisant pour une instance unique ; derrière
// un proxy (nginx), `app.set('trust proxy', 1)` doit être actif pour que req.ip soit l'IP du client.
export function rateLimit({ windowMs, max, message = 'Trop de requêtes, réessayez plus tard.' }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? 'inconnue';
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      // Nettoyage occasionnel des entrées expirées
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, error: message });
    }
    next();
  };
}
