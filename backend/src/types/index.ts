// Types pour les produits
export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  images: string[];
  inStock: boolean;
  stockQuantity?: number;
  badges: ProductBadge[];
  metadata?: ProductMetadata;
  characteristics?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProductBadge = 'bio' | 'plein-air' | 'nouveau' | 'promo' | 'populaire';

export interface ProductMetadata {
  weight?: string;
  dimensions?: string;
}

// Types pour le formulaire de contact
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  consent: boolean;
}

// Types pour la newsletter
export interface NewsletterFormData {
  email: string;
}

// Types pour le checkout
export interface CheckoutData {
  items: CheckoutItem[];
  customerEmail: string;
  shippingAddress: ShippingAddress;
  deliveryMethod: 'standard' | 'express' | 'retrait';
}

export interface CheckoutItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
}
