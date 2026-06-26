import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  cartId: string;
  productId: number;
  productName: string;
  productSlug: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  selectedRam: string;
  selectedStorage: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'cartId'>) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'mits_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function generateCartId(item: Omit<CartItem, 'cartId'>): string {
  return `${item.productId}_${item.selectedRam}_${item.selectedStorage}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, 'cartId'>) => {
    const cartId = generateCartId(item);
    setItems(prev => {
      const existing = prev.find(i => i.cartId === cartId);
      if (existing) {
        return prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, { ...item, cartId }];
    });
  };

  const removeItem = (cartId: string) => {
    setItems(prev => prev.filter(i => i.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(i => i.cartId === cartId ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
