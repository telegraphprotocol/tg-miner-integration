const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const TOKEN_KEY = 'tg_access_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable — the session just won't persist
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Drop-in `fetch` for telegraph-backend: prefixes the base URL and attaches the Bearer token. */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${BACKEND_URL}${path}`, { ...init, headers });
}

export function apiPost(path: string, body?: unknown): Promise<Response> {
  return apiFetch(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
}

/** Nest errors arrive as `{ message: string | string[] }`; proxied validator errors as `{ error: string }`. */
export function errorMessage(data: unknown, fallback: string): string {
  const body = data as { message?: unknown; error?: unknown } | null;
  if (Array.isArray(body?.message)) return body.message.join(' ');
  if (typeof body?.message === 'string' && body.message) return body.message;
  if (typeof body?.error === 'string' && body.error) return body.error;
  return fallback;
}
