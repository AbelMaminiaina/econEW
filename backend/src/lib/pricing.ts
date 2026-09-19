// Résolution du prix unitaire dégressif — source unique de vérité côté backend.
// Le prix envoyé par le client n'est jamais utilisé : le serveur recalcule tout depuis
// le produit + ses paliers pour éviter qu'un client falsifie le prix au checkout.

interface Tier {
  minQty: number;
  unitPrice: number;
}

/**
 * Prix unitaire applicable pour une quantité donnée : le palier avec le minQty le plus élevé
 * encore atteint par la quantité, sinon le prix de base du produit.
 */
export function resolveUnitPrice(basePrice: number, priceTiers: Tier[], quantity: number): number {
  const applicable = priceTiers
    .filter((tier) => quantity >= tier.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];

  return applicable ? applicable.unitPrice : basePrice;
}
