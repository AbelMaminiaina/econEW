import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProducts, getProductBySlug, getRelatedProducts } from './products';

function mockFetchJson(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('getProducts', () => {
  it('requests the plain endpoint when called without params', async () => {
    const fetchMock = mockFetchJson({ products: [], total: 0 });

    await getProducts();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/products',
      expect.anything()
    );
  });

  it('builds a query string from category, search and inStock', async () => {
    const fetchMock = mockFetchJson({ products: [], total: 0 });

    await getProducts({ category: 'poulet', search: 'bio', inStock: true });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/products?');
    expect(url).toContain('category=poulet');
    expect(url).toContain('search=bio');
    expect(url).toContain('inStock=true');
  });

  it('omits inStock from the query string when false', async () => {
    const fetchMock = mockFetchJson({ products: [], total: 0 });

    await getProducts({ inStock: false });

    const [url] = fetchMock.mock.calls[0];
    expect(url).not.toContain('inStock');
  });
});

describe('getProductBySlug', () => {
  it('requests the product by its slug', async () => {
    const fetchMock = mockFetchJson({ id: '1', slug: 'poulet-fermier' });

    await getProductBySlug('poulet-fermier');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/products/poulet-fermier',
      expect.anything()
    );
  });
});

describe('getRelatedProducts', () => {
  it('defaults the limit to 4', async () => {
    const fetchMock = mockFetchJson([]);

    await getRelatedProducts('poulet-fermier');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/products/poulet-fermier/related?limit=4',
      expect.anything()
    );
  });

  it('forwards a custom limit', async () => {
    const fetchMock = mockFetchJson([]);

    await getRelatedProducts('poulet-fermier', 8);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/products/poulet-fermier/related?limit=8',
      expect.anything()
    );
  });
});
