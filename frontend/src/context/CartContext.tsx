import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { api } from '../utils/api';

export interface DiscountSettings {
  tier1_threshold: number;
  tier1_percent: number;
  tier2_threshold: number;
  tier2_percent: number;
}

export interface DiscountTier {
  minQty: number;
  percent: number;
  label: string;
}

export const DEFAULT_DISCOUNT_TIERS: DiscountTier[] = [
  { minQty: 11, percent: 8, label: '8%' },
  { minQty: 6, percent: 5, label: '5%' },
];

export function buildTiers(settings: DiscountSettings): DiscountTier[] {
  const t2t = Number(settings.tier2_threshold) || 0;
  const t2p = Number(settings.tier2_percent) || 0;
  const t1t = Number(settings.tier1_threshold) || 0;
  const t1p = Number(settings.tier1_percent) || 0;
  const tiers: DiscountTier[] = [];
  if (t2t > 0 && t2p > 0) tiers.push({ minQty: t2t, percent: t2p, label: `${t2p}%` });
  if (t1t > 0 && t1p > 0) tiers.push({ minQty: t1t, percent: t1p, label: `${t1p}%` });
  return tiers.sort((a, b) => b.minQty - a.minQty);
}

export function getDiscountPercent(totalQty: number, tiers: DiscountTier[] = DEFAULT_DISCOUNT_TIERS): number {
  for (const tier of tiers) {
    if (totalQty >= tier.minQty) return tier.percent;
  }
  return 0;
}

export function getDiscountLabel(totalQty: number, tiers: DiscountTier[] = DEFAULT_DISCOUNT_TIERS): string | null {
  for (const tier of tiers) {
    if (totalQty >= tier.minQty) return `${tier.percent}% OFF`;
  }
  return null;
}

export function getNextTierHint(totalQty: number, tiers: DiscountTier[] = DEFAULT_DISCOUNT_TIERS): string | null {
  for (const tier of tiers) {
    if (totalQty < tier.minQty) {
      return `Order ${tier.minQty}+ items for ${tier.percent}% off`;
    }
  }
  return null;
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
  discountTiers: DiscountTier[];
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'mits_cart';

export function createCartItem(
  product: { id: number; name: string; slug: string; image_url?: string; base_price: number },
  overrides?: Partial<Omit<CartItem, 'cartId' | 'productId' | 'productName' | 'productSlug' | 'productImage' | 'unitPrice'>>
): Omit<CartItem, 'cartId'> {
  return {
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    productImage: product.image_url || '',
    unitPrice: product.base_price,
    quantity: 1,
    selectedRam: '',
    selectedStorage: '',
    selectedHdd: '',
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [discountSettings, setDiscountSettings] = useState<DiscountSettings | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    api.get<{ settings: DiscountSettings }>('/settings/discount')
      .then(r => setDiscountSettings(r.settings))
      .catch(() => setDiscountSettings(null));
  }, []);

  const discountTiers = useMemo(() => {
    if (discountSettings) return buildTiers(discountSettings);
    return DEFAULT_DISCOUNT_TIERS;
  }, [discountSettings]);

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
    const dp = getDiscountPercent(ti, discountTiers) || 0;
    const da = tp > 0 && dp > 0 ? Math.round((tp * dp) / 100) : 0;
    const ft = Math.max(0, tp - da);
    return { totalItems: ti, totalPrice: tp, discountPercent: dp, discountAmount: da, finalTotal: ft };
  }, [items, discountTiers]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, discountPercent, discountAmount, finalTotal, discountTiers }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
