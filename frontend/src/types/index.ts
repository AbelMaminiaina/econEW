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
  moq: number;
  unit: string;
  priceTiers: PriceTier[];
  estimatedWeightKg?: number | null;
  freeShipping: boolean;
  availableFrom?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProductBadge = 'bio' | 'plein_air' | 'nouveau' | 'promo' | 'populaire';

export interface PriceTier {
  id?: string;
  minQty: number;
  unitPrice: number;
}

export interface ProductMetadata {
  weight?: string;
  dimensions?: string;
}

// Types pour le panier
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  slug: string;
  metadata?: ProductMetadata;
  freeShipping?: boolean;
  estimatedWeightKg?: number | null;
  availableFrom?: string | null;
  moq: number;
  unit: string;
  priceTiers: PriceTier[];
}

// Types pour les témoignages
export interface Testimonial {
  id: string;
  name: string;
  location: string;
  avatar?: string;
  content: string;
  rating: number;
  date: string;
  productPurchased?: string;
}

// Types pour les services
export interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  icon: string;
  features: string[];
  pricing?: string;
  available: boolean;
}

// Types pour le blog
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: BlogCategory;
  publishedAt: string;
  updatedAt?: string;
  author: Author;
  tags: string[];
  readingTime: number;
}

export type BlogCategory = 'conseils' | 'produits' | 'actualites' | 'evenements';

export interface Author {
  name: string;
  avatar: string;
  bio?: string;
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
  consent: boolean;
}

// Types pour les commandes B2B
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type InvoiceStatus = 'sent' | 'paid' | 'overdue' | 'cancelled';

export type PaymentTerms = 'net_30' | 'net_60';

export type DeliveryMethod = 'standard' | 'express' | 'retrait';

export interface OrderAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  price: number;
  availableFrom?: string | null;
}

export interface CompanyOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  deliveryMethod: DeliveryMethod;
  paymentTerms?: PaymentTerms | null;
  dueDate?: string | null;
  invoiceNumber?: string | null;
  invoiceStatus?: InvoiceStatus | null;
  cancelReason?: string | null;
  createdAt: string;
  address?: OrderAddress | null;
  items: OrderItemSummary[];
}

// Types pour les comptes professionnels
export type CompanyStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type UserRole = 'platform_admin' | 'company_admin' | 'buyer' | 'customer';

export interface Company {
  id: string;
  name: string;
  legalName?: string | null;
  taxId: string;
  status: CompanyStatus;
  paymentTerms?: PaymentTerms | null;
  creditLimit?: number | null;
  contactEmail: string;
  contactPhone?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
}

// Types pour les valeurs de la ferme
export interface Value {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// Types pour la FAQ
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}
