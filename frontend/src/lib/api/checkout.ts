import { fetchAPI } from './config';
import { CompanyOrder, DeliveryMethod } from '@/types';

interface CheckoutData {
  items: { productId: string; quantity: number }[];
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  deliveryMethod: DeliveryMethod;
  notes?: string;
}

interface CheckoutResponse {
  success: boolean;
  message: string;
  orderId?: string;
  orderNumber?: string;
  total?: number;
  invoiceNumber?: string;
  dueDate?: string;
}

export async function createOrder(data: CheckoutData, token: string): Promise<CheckoutResponse> {
  return fetchAPI<CheckoutResponse>('/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export async function getOrderByNumber(orderNumber: string, token: string): Promise<CompanyOrder> {
  return fetchAPI<CompanyOrder>(`/checkout/${orderNumber}`, { token });
}

export async function getMyOrders(token: string): Promise<{ orders: CompanyOrder[] }> {
  return fetchAPI<{ orders: CompanyOrder[] }>('/checkout/orders/mine', { token });
}
