import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from './useCart';
import type { CartItem } from '@/types';

const item1: CartItem = {
  productId: 'p1',
  name: 'Carton emballage',
  price: 1200,
  quantity: 1,
  image: '/img.jpg',
  slug: 'carton-emballage',
  moq: 1,
  unit: 'piece',
  priceTiers: [],
};

const item2: CartItem = {
  productId: 'p2',
  name: 'Ramette papier A4',
  price: 5000,
  quantity: 2,
  image: '/img2.jpg',
  slug: 'ramette-papier-a4',
  moq: 1,
  unit: 'piece',
  priceTiers: [],
};

beforeEach(() => {
  const { result } = renderHook(() => useCart());
  act(() => {
    result.current.clearCart();
  });
  localStorage.clear();
});

describe('useCart', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([]);
  });

  it('adds a new item defaulting quantity to 1', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({ ...item1, quantity: 0 as unknown as number });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(1);
  });

  it('increments the quantity when adding an already-present item', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(item1);
      result.current.addItem({ ...item1, quantity: 2 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it('keeps distinct products as separate lines', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(item1);
      result.current.addItem(item2);
    });

    expect(result.current.items).toHaveLength(2);
  });

  it('removes an item by productId', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(item1);
      result.current.addItem(item2);
      result.current.removeItem('p1');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe('p2');
  });

  it('updates the quantity of an existing item', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(item1);
      result.current.updateQuantity('p1', 5);
    });

    expect(result.current.items[0].quantity).toBe(5);
  });

  it('removes the item when the updated quantity is zero or less', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(item1);
      result.current.updateQuantity('p1', 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('clears the cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(item1);
      result.current.addItem(item2);
      result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
  });

  it('reports isHydrated as true after mount', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.isHydrated).toBe(true);
  });
});
