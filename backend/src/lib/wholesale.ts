// Vente en gros uniquement : la plateforme impose un plancher à la quantité minimum de commande
// (MOQ) de chaque produit. Un vendeur peut fixer un MOQ plus élevé, jamais plus bas.
// Le frontend en garde un miroir dans frontend/src/lib/utils.ts (MIN_WHOLESALE_QTY).
export const MIN_WHOLESALE_QTY = 10;
