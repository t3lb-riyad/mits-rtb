export const API_BASE = import.meta.env.VITE_API_BASE || 'https://mits-rtb-backend.onrender.com/api';

export function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = API_BASE.replace(/\/api$/, '');
  return base + (url.startsWith('/') ? url : '/' + url);
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
};

export interface Product {
  id: number;
  category_id: number;
  brand_id: number | null;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  base_price: number;
  cost_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: number;
  best_of: string | null;
  image_url: string;
  image_urls: string;
  attributes: string;
  category_name: string;
  brand_name: string | null;
  discount_tier1_percent?: number;
  discount_tier2_percent?: number;
}

export interface ProductAttribute {
  id: number;
  product_id: number;
  attribute_name: string;
  attribute_value: string;
  price_modifier: number;
  stock_quantity: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}


