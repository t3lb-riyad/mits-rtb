export const API_BASE = import.meta.env.VITE_API_BASE || 'https://mits-rtb-backend.onrender.com/api/admin';
const API = API_BASE;

export function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = API_BASE.replace(/\/api\/admin$/, '');
  return base + (url.startsWith('/') ? url : '/' + url);
}

function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

async function safeParseJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const rawText = await res.text();
    console.error('Non-JSON response:', rawText);
    throw new Error(`Server returned non-JSON (${res.status}): check console for details`);
  }
  return res.json();
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${endpoint}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) {
    const err = await safeParseJson(res).catch(() => ({ error: res.statusText }));
    if (res.status === 401 || res.status === 403 || (err.error && (err.error.includes('token') || err.error.includes('expired')))) {
      localStorage.removeItem('admin_token');
      window.location.href = '/';
      throw new Error('Session expired');
    }
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return safeParseJson(res);
}

export const adminApi = {
  login: (username: string, password: string) =>
    request<{ token: string; admin: any }>('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
