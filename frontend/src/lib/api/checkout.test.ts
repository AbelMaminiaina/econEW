import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder, getOrderByNumber, getMyOrders } from './checkout';

function mockFetchJson(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('createOrder', () => {
  it('POSTs the checkout payload as JSON with the bearer token', async () => {
    const fetchMock = mockFetchJson({ success: true, message: 'ok' });

    await createOrder(
      {
        items: [{ productId: 'p1', quantity: 5 }],
        shippingAddress: { street: 'rue', city: 'Tana', postalCode: '101' },
        deliveryMethod: 'standard',
      },
      'jwt-token'
    );

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/checkout');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer jwt-token' })
    );
    expect(JSON.parse(options.body)).toMatchObject({ deliveryMethod: 'standard' });
  });
});

describe('getOrderByNumber', () => {
  it('requests the order by its number with the bearer token', async () => {
    const fetchMock = mockFetchJson({ id: '1' });

    await getOrderByNumber('ORD-123', 'jwt-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/checkout/ORD-123',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }) })
    );
  });
});

describe('getMyOrders', () => {
  it('requests the caller company orders with the bearer token', async () => {
    const fetchMock = mockFetchJson({ orders: [] });

    await getMyOrders('jwt-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/checkout/orders/mine',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }) })
    );
  });
});
