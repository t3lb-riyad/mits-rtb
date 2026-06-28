import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export function getProductDiscountPercent(qty: number, t1p: number, t2p: number): number {
  if (qty >= 10 && t2p > 0) return Number(t2p);
  if (qty >= 5 && t1p > 0) return Number(t1p);
  return 0;
}

export function getProductTierHints(t1p: number, t2p: number): { tier1: string | null; tier2: string | null } {
  return {
    tier1: t1p > 0 ? `${t1p}% for +5 pieces` : null,
    tier2: t2p > 0 ? `${t2p}% for 10+ pieces` : null,
  };
}

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
  selectedHdd: string;
  discountTier1Percent: number;
  discountTier2Percent: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'cartId'>) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'mits_cart';

export function createCartItem(
  product: { id: number; name: string; slug: string; image_url?: string; base_price: number; discount_tier1_percent?: number; discount_tier2_percent?: number },
  overrides?: Partial<Omit<CartItem, 'cartId' | 'productId' | 'productName' | 'productSlug' | 'productImage' | 'unitPrice'>>
): Omit<CartItem, 'cartId'> {
  return {
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    productImage: product.image_url || '',
    unitPrice: Number(product.base_price),
    quantity: 1,
    selectedRam: '',
    selectedStorage: '',
    selectedHdd: '',
    discountTier1Percent: Number(product.discount_tier1_percent) || 0,
    discountTier2Percent: Number(product.discount_tier2_percent) || 0,
    ...overrides,
  };
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function generateCartId(item: Omit<CartItem, 'cartId'>): string {
  return `${item.productId}_${item.selectedRam}_${item.selectedStorage}_${item.selectedHdd}`;
}

function calcItemDiscount(item: CartItem): number {
  const pct = getProductDiscountPercent(item.quantity, item.discountTier1Percent, item.discountTier2Percent);
  return pct > 0 ? Math.round(item.unitPrice * item.quantity * pct / 100) : 0;
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

  const { totalItems, totalPrice, discountPercent, discountAmount, finalTotal } = useMemo(() => {
    const ti = items.reduce((sum, i) => sum + i.quantity, 0);
    const tp = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) || 0;
    const da = items.reduce((sum, i) => sum + calcItemDiscount(i), 0) || 0;
    const dp = tp > 0 ? Math.round(da / tp * 100) : 0;
    const ft = Math.max(0, tp - da);
    return { totalItems: ti, totalPrice: tp, discountPercent: dp, discountAmount: da, finalTotal: ft };
  }, [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, discountPercent, discountAmount, finalTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
