import { ProductForm } from '@/components/seller/ProductForm';

export default function NewSellerProductPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-2xl font-semibold text-warm-800">Publier un produit</h2>
      <ProductForm />
    </div>
  );
}
