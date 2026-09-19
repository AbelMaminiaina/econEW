'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import {
  formatDate,
  formatPrice,
  formatQuantity,
  formatWeight,
  getShippingCost,
  groupBySeller,
  isUpcoming,
  resolveUnitPrice,
  FREE_SHIPPING_THRESHOLD,
} from '@/lib/utils';
import { PageHeader } from '@/components/electro/PageHeader';

type Item = ReturnType<typeof useCart>['items'][number];

// Page panier du template Electro (cart.html) : tableau produits + « Cart Total ».
export default function CartPage() {
  const cart = useCart();
  const { isApproved } = useCompanyAccess();

  // MOQ pour tous ; paliers dégressifs réservés aux comptes pro approuvés (les autres paient le
  // prix de base). Le prix facturé est recalculé côté backend à la commande.
  const unitPrice = (item: Item) =>
    isApproved ? resolveUnitPrice(item.price, item.priceTiers, item.quantity) : item.price;

  const subtotal = cart.items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0);
  // Une commande (et des frais de livraison) par vendeur
  const sellerGroups = groupBySeller(cart.items);
  const hasFreeShippingItem = sellerGroups.every((group) => group.items.some((item) => item.freeShipping));
  const shippingCost = sellerGroups.reduce(
    (sum, group) =>
      sum +
      getShippingCost(
        'standard',
        group.items.reduce((acc, item) => acc + unitPrice(item) * item.quantity, 0),
        group.items.some((item) => item.freeShipping)
      ),
    0
  );
  const total = subtotal + shippingCost;

  if (cart.items.length === 0) {
    return (
      <>
        <PageHeader title="Mon panier" crumbs={[{ label: 'Panier' }]} />
        <div className="container-fluid py-5">
          <div className="container py-5 text-center">
            <div className="row justify-content-center">
              <div className="col-lg-6">
                <i className="fas fa-shopping-bag display-1 text-secondary mb-4 d-block"></i>
                <h2 className="mb-3">Votre panier est vide</h2>
                <p className="mb-4">Découvrez nos produits et commencez vos achats !</p>
                <Link href="/produits" className="btn btn-primary rounded-pill py-3 px-5">
                  Voir nos produits
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const quantityControls = (item: Item) => (
    <div className="input-group quantity" style={{ width: 150 }}>
      <div className="input-group-btn">
        <button
          type="button"
          className="btn btn-sm btn-minus rounded-circle bg-light border"
          onClick={() => cart.updateQuantity(item.productId, item.quantity - 1 < item.moq ? 0 : item.quantity - 1)}
          aria-label="Diminuer la quantité"
        >
          <i className="fa fa-minus"></i>
        </button>
      </div>
      <span className="form-control form-control-sm text-center border-0 bg-transparent d-flex align-items-center justify-content-center">
        {item.quantity}
      </span>
      <div className="input-group-btn">
        <button
          type="button"
          className="btn btn-sm btn-plus rounded-circle bg-light border"
          onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
          aria-label="Augmenter la quantité"
        >
          <i className="fa fa-plus"></i>
        </button>
      </div>
    </div>
  );

  const removeButton = (item: Item) => (
    <button
      type="button"
      className="btn btn-md rounded-circle bg-light border"
      onClick={() => cart.removeItem(item.productId)}
      aria-label="Supprimer"
    >
      <i className="fa fa-times text-danger"></i>
    </button>
  );

  const notes = (item: Item) => (
    <small className="d-block">
      {item.sellerName && (
        <span className="text-dark">
          Vendu par{' '}
          {item.sellerId ? <Link href={`/vendeurs/${item.sellerId}`} className="text-primary">{item.sellerName}</Link> : item.sellerName}
          {' · '}
        </span>
      )}
      Quantité minimum&nbsp;: {formatQuantity(item.moq, item.unit)}
      {item.estimatedWeightKg ? <> · Poids estimé&nbsp;: {formatWeight(item.estimatedWeightKg)}</> : null}
      {item.freeShipping && <span className="text-primary"> · Livraison offerte</span>}
      {isUpcoming(item.availableFrom) && (
        <span className="text-warning"> · Réservation — disponible le {formatDate(item.availableFrom!)}</span>
      )}
    </small>
  );

  return (
    <>
      <PageHeader
        title="Mon panier"
        crumbs={[{ label: 'Panier' }]}
        description={`${cart.items.reduce((sum, item) => sum + item.quantity, 0)} article(s) dans votre panier`}
      />

      <div className="container-fluid py-5">
        <div className="container py-5">
          <div className="table-responsive d-none d-md-block">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th scope="col">Produit</th>
                  <th scope="col">Prix</th>
                  <th scope="col">Quantité</th>
                  <th scope="col">Total</th>
                  <th scope="col"><span className="visually-hidden">Supprimer</span></th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.productId}>
                    <th scope="row">
                      <div className="d-flex align-items-center py-2">
                        <Link href={`/produits/${item.slug}`} className="me-3 flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={90}
                            height={90}
                            className="rounded bg-light"
                            style={{ objectFit: 'cover' }}
                          />
                        </Link>
                        <div>
                          <Link href={`/produits/${item.slug}`} className="text-dark h6 d-block mb-1">{item.name}</Link>
                          {notes(item)}
                        </div>
                      </div>
                    </th>
                    <td><p className="mb-0">{formatPrice(unitPrice(item))} / {item.unit}</p></td>
                    <td>{quantityControls(item)}</td>
                    <td><p className="mb-0 text-dark fw-bold">{formatPrice(unitPrice(item) * item.quantity)}</p></td>
                    <td>{removeButton(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="list-unstyled d-md-none">
            {cart.items.map((item) => (
              <li key={item.productId} className="border rounded p-3 mb-3">
                <div className="d-flex">
                  <Link href={`/produits/${item.slug}`} className="me-3 flex-shrink-0">
                    <Image src={item.image} alt={item.name} width={72} height={72} className="rounded bg-light" style={{ objectFit: 'cover' }} />
                  </Link>
                  <div className="flex-grow-1">
                    <Link href={`/produits/${item.slug}`} className="text-dark h6 d-block mb-1">{item.name}</Link>
                    <span className="text-primary">{formatPrice(unitPrice(item))} / {item.unit}</span>
                    {notes(item)}
                  </div>
                  {removeButton(item)}
                </div>
                <div className="d-flex justify-content-between align-items-center mt-3">
                  {quantityControls(item)}
                  <span className="text-dark fw-bold">{formatPrice(unitPrice(item) * item.quantity)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <Link href="/produits" className="btn btn-light rounded-pill py-3 px-4">
              <i className="fas fa-arrow-left me-2"></i>Continuer mes achats
            </Link>
          </div>

          <div className="row g-4 justify-content-end mt-2">
            <div className="col-sm-8 col-md-7 col-lg-6 col-xl-4">
              <div className="bg-light rounded">
                <div className="p-4">
                  <h1 className="display-6 mb-4">
                    Total <span className="fw-normal">du panier</span>
                  </h1>
                  <div className="d-flex justify-content-between mb-4">
                    <h5 className="mb-0 me-4">Sous-total :</h5>
                    <p className="mb-0">{formatPrice(subtotal)}</p>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h5 className="mb-0 me-4">Livraison</h5>
                    <p className="mb-0">{shippingCost === 0 ? <span className="text-primary">Gratuite</span> : formatPrice(shippingCost)}</p>
                  </div>
                  {sellerGroups.length > 1 && (
                    <p className="mb-0 text-end small mt-2">
                      <i className="fas fa-store text-primary me-1"></i>
                      Votre panier sera scindé en {sellerGroups.length} commandes, une par vendeur.
                    </p>
                  )}
                  {hasFreeShippingItem ? (
                    <p className="mb-0 text-end text-primary small mt-2">Votre panier contient un produit à livraison offerte 🎉</p>
                  ) : (
                    sellerGroups.length === 1 &&
                    subtotal < FREE_SHIPPING_THRESHOLD && (
                      <p className="mb-0 text-end small mt-2">
                        Plus que {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} pour la livraison gratuite
                      </p>
                    )
                  )}
                </div>
                <div className="py-4 mb-4 border-top border-bottom d-flex justify-content-between">
                  <h5 className="mb-0 ps-4 me-4">Total</h5>
                  <p className="mb-0 pe-4 text-primary fs-4">{formatPrice(total)}</p>
                </div>
                <div className="px-4 pb-4">
                  <Link href="/checkout" className="btn btn-primary rounded-pill py-3 px-4 w-100 text-uppercase">
                    <i className="fas fa-credit-card me-2"></i>Passer commande
                  </Link>
                  <ul className="list-unstyled small mt-4 mb-0">
                    <li className="mb-1"><i className="fas fa-shield-alt text-primary me-2"></i>Paiement sécurisé</li>
                    <li><i className="fas fa-truck text-primary me-2"></i>Livraison sous 24-48h</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
