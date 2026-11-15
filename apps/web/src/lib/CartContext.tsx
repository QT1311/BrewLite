'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from './api';
import * as cart from './cart';
import { CartItem } from './cart';
import { SizeCode } from './options';

const STORAGE_KEY = 'brewlite.cart.v2';

interface CartValue {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Product, size: SizeCode | null, toppings: string[], qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Đọc giỏ từ localStorage sau khi mount (tránh lỗi hydration).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* localStorage không dùng được: bỏ qua */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, loaded]);

  const add = useCallback(
    (p: Product, size: SizeCode | null, toppings: string[], qty = 1) =>
      setItems((cur) => cart.addItem(cur, p, size, toppings, qty)),
    [],
  );
  const setQty = useCallback((key: string, qty: number) => setItems((cur) => cart.setQuantity(cur, key, qty)), []);
  const remove = useCallback((key: string) => setItems((cur) => cart.removeItem(cur, key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(
    () => ({ items, count: cart.cartCount(items), total: cart.cartTotal(items), add, setQty, remove, clear }),
    [items, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải được dùng bên trong CartProvider');
  return ctx;
}
