'use client';

import { useSession } from 'next-auth/react';

export type CompanyAccessStatus =
  | 'loading'
  | 'unauthenticated'
  | 'customer'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'approved'
  | 'platform_admin';

/**
 * Résume l'accès de l'utilisateur courant.
 * - `isApproved` : accès grossiste (entreprise approuvée ou staff) → paliers de prix et MOQ.
 * - `isCustomer` : particulier connecté → prix de base, pas de quantité minimum.
 * - `canOrder` : faux uniquement pour une entreprise en attente / refusée / suspendue.
 *   Un visiteur non connecté peut remplir son panier ; la connexion est demandée au checkout.
 */
export function useCompanyAccess() {
  const { data: session, status } = useSession();

  let accessStatus: CompanyAccessStatus = 'loading';
  if (status === 'unauthenticated') {
    accessStatus = 'unauthenticated';
  } else if (status === 'authenticated') {
    if (session?.user?.role === 'platform_admin') {
      accessStatus = 'platform_admin';
    } else if (session?.user?.role === 'customer') {
      accessStatus = 'customer';
    } else {
      accessStatus = (session?.user?.companyStatus as CompanyAccessStatus) || 'pending';
    }
  }

  const isApproved = accessStatus === 'approved' || accessStatus === 'platform_admin';
  const isCustomer = accessStatus === 'customer';
  const canOrder = !['pending', 'rejected', 'suspended'].includes(accessStatus);

  return {
    status: accessStatus,
    isLoading: status === 'loading',
    isApproved,
    isCustomer,
    canOrder,
    session,
    accessToken: session?.accessToken,
  };
}
