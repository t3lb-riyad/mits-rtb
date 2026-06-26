const API = '/api/admin';

function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${endpoint}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
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
