/**
 * The game's own HTTP API (server/admin.mjs, served by the relay): branding,
 * analytics and the admin panel. Same origin by default (the relay serves the
 * built game; in development Vite proxies /api to it). A different server can
 * be set from the admin login screen.
 */
const KEY = 'paintland.api';

export function apiBase(): string {
  try {
    return (localStorage.getItem(KEY) ?? '').replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function setApiBase(url: string): void {
  try {
    if (url.trim()) localStorage.setItem(KEY, url.trim().replace(/\/$/, ''));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}

/** Absolute URL for an API path or an uploaded image path (/api/brand/…). */
export function apiUrl(path: string): string {
  return /^https?:|^data:/.test(path) ? path : `${apiBase()}${path}`;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  reason?: string;
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string | null; timeout?: number } = {}): Promise<ApiResult<T>> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeout ?? 8000);
  try {
    const res = await fetch(apiUrl(path), {
      method: opts.method ?? 'GET',
      headers: { ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctl.signal,
    });
    const type = res.headers.get('content-type') ?? '';
    const data = type.includes('json') ? ((await res.json()) as T & { reason?: string }) : null;
    if (!data) return { ok: false, status: res.status, data: null, reason: 'The admin server is not reachable. Start it with npm run server.' };
    return { ok: res.ok, status: res.status, data, reason: (data as { reason?: string }).reason };
  } catch {
    return { ok: false, status: 0, data: null, reason: 'The admin server is not reachable. Start it with npm run server.' };
  } finally {
    clearTimeout(timer);
  }
}
