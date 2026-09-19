'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatPrice, formatQuantity, getProductImage } from '@/lib/utils';
import {
  deleteSellerProduct,
  getSellerProducts,
  setSellerProductActive,
  updateSellerStock,
} from '@/lib/api/seller';
import type { Product, ProductStatus } from '@/types';

const statusStyle: Record<ProductStatus, { label: string; className: string }> = {
  pending: { label: 'En attente de validation', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Publié', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refusé', className: 'bg-red-100 text-red-800' },
};

function SellerProducts() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get('saved') ? 'Produit enregistré : il sera visible dès sa validation par un administrateur.' : null
  );

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setProducts((await getSellerProducts(token)).products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos produits');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, message?: string) => {
    try {
      await action();
      if (message) setNotice(message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-white" />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-warm-600">
          {products.length} produit{products.length > 1 ? 's' : ''}. Vente en gros uniquement.
        </p>
        <Link href="/vendeur/produits/nouveau">
          <Button icon={<Plus className="h-4 w-4" />}>Publier un produit</Button>
        </Link>
      </div>

      {notice && (
        <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center text-warm-600">
          Vous n&apos;avez encore publié aucun produit.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const st = statusStyle[product.status ?? 'approved'];
            return (
              <div key={product.id} className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-warm-50">
                  <Image src={getProductImage(product)} alt={product.name} fill sizes="96px" className="object-cover" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-warm-800">{product.name}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                    {product.status === 'approved' && product.isActive === false && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">Retiré de la vente</span>
                    )}
                  </div>
                  <p className="text-sm text-warm-600">
                    {formatPrice(product.price)} / {product.unit} · minimum {formatQuantity(product.moq, product.unit)}
                    {product.priceTiers.length > 0 && ` · ${product.priceTiers.length} palier(s)`}
                  </p>
                  {product.status === 'rejected' && product.rejectionReason && (
                    <p className="mt-1 text-sm text-red-600">Motif du refus : {product.rejectionReason}</p>
                  )}
                </div>

                <StockEditor product={product} onSave={(qty) => run(() => updateSellerStock(product.id, qty, token!), 'Stock mis à jour')} />

                <div className="flex items-center gap-1">
                  <Link
                    href={`/vendeur/produits/${product.id}`}
                    className="rounded-full p-2 text-warm-600 hover:bg-warm-100"
                    aria-label={`Modifier ${product.name}`}
                    title="Modifier (repasse en validation)"
                  >
                    <Pencil className="h-5 w-5" />
                  </Link>
                  {product.status === 'approved' && (
                    <button
                      type="button"
                      className="rounded-full p-2 text-warm-600 hover:bg-warm-100"
                      aria-label={product.isActive === false ? `Remettre ${product.name} en vente` : `Retirer ${product.name} de la vente`}
                      title={product.isActive === false ? 'Remettre en vente' : 'Retirer de la vente'}
                      onClick={() => run(() => setSellerProductActive(product.id, product.isActive === false, token!))}
                    >
                      {product.isActive === false ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-full p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Supprimer ${product.name}`}
                    onClick={() => {
                      if (window.confirm(`Supprimer « ${product.name} » ?`)) {
                        run(async () => {
                          const res = await deleteSellerProduct(product.id, token!);
                          setNotice(res.message);
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StockEditor({ product, onSave }: { product: Product; onSave: (qty: number) => void }) {
  const [value, setValue] = useState(String(product.stockQuantity ?? 0));
  const dirty = value !== String(product.stockQuantity ?? 0);

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-warm-600" htmlFor={`stock-${product.id}`}>Stock</label>
      <input
        id={`stock-${product.id}`}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 rounded-lg border border-warm-300 px-3 py-1.5 text-sm"
      />
      {dirty && (
        <button
          type="button"
          onClick={() => onSave(Number(value))}
          className="rounded-lg bg-prairie-500 px-3 py-1.5 text-sm font-medium text-white"
        >
          OK
        </button>
      )}
    </div>
  );
}

export default function SellerProductsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white" />}>
      <SellerProducts />
    </Suspense>
  );
}
