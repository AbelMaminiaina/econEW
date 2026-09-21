import type { Request } from 'express';
import type { Order } from '@prisma/client';
import prisma from './prisma.js';

// Un paiement porte sur tout un panier : une commande par vendeur, réunies par le même checkoutGroup.

export type GroupOrder = Order & { seller?: { name: string } | null };

// Toutes les commandes du panier auquel appartient la commande donnée
export async function loadGroup(orderNumber: string): Promise<GroupOrder[] | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { seller: { select: { name: true } } },
  });
  if (!order) return null;
  if (!order.checkoutGroup) return [order];
  return prisma.order.findMany({
    where: { checkoutGroup: order.checkoutGroup },
    include: { seller: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

// Propriétaire (compte connecté) ou visiteur ayant passé la commande (e-mail saisi à la commande)
export function canAccess(req: Request, order: Order, email?: string): boolean {
  if (req.user) {
    if (req.user.role === 'platform_admin') return true;
    if (order.userId && order.userId === req.user.userId) return true;
    if (order.companyId && order.companyId === req.user.companyId) return true;
    return false;
  }
  return !!email && !!order.guestEmail && order.guestEmail.toLowerCase() === email.toLowerCase();
}
