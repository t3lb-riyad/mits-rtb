export const API_BASE = import.meta.env.VITE_API_BASE || 'https://mits-rtb-backend.onrender.com/api';

export function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
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
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
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
}

export interface ProductOffer {
  id: number;
  product_id: number;
  min_quantity: number;
  max_quantity: number | null;
  discount_percent: number;
  discount_amount: number;
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

export interface ShippingOffice {
  id: number;
  province: string;
  office_name: string;
  address: string;
  phone: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  order_status: string;
  shipping_status: string;
  shipping_method: string;
  tracking_number: string;
  courier_name: string;
  notes: string;
  created_at: string;
}
