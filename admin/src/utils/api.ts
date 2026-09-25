/**
 * Central API transport for the Admin ERP — axios edition.
 *
 * - Request interceptor attaches the staff access token to every request.
 * - Response interceptor: on a single 401, transparently rotates the session
 *   via the stored refresh token (single-flight) and retries once.
 * - Public endpoints work fine with no session (no token attached).
 *
 * Auth endpoints themselves (login/refresh/logout) must use `rawApi`,
 * never `api`, to avoid refresh loops.
 */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

const ACCESS_KEY = 'etoile_jwt_token';
const REFRESH_KEY = 'etoile_refresh_token';

let inflightRefresh: Promise<boolean> | null = null;

/** Raw axios — no auth, no retry. For login/refresh/logout only. */
export const rawApi: AxiosInstance = axios.create({ timeout: 15000 });

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setSessionTokens(access?: string | null, refresh?: string | null) {
  try {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // storage unavailable (private mode) — session simply won't persist
  }
}

export function clearSessionTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

/** Rotate the session using the stored refresh token. Single-flight. */
export async function refreshSession(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh;
  const refresh = getRefreshToken();
  if (!refresh) return false;

  inflightRefresh = (async () => {
    try {
      const res = await rawApi.post('/api/auth/refresh', { refreshToken: refresh });
      const data = res.data;
      if (!data?.access_token) return false;
      setSessionTokens(data.access_token, data.refresh_token);
      return true;
    } catch (err) {
      // Refresh rejected (expired/revoked/theft) — drop the dead session.
      if (axios.isAxiosError(err) && err.response?.status === 401) clearSessionTokens();
      return false;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

/** Authenticated axios instance used by every admin call site. */
export const api: AxiosInstance = axios.create({ timeout: 15000 });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? ({} as never);
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried && getRefreshToken()) {
      original._retried = true;
      const rotated = await refreshSession();
      if (rotated) {
        const token = getAccessToken();
        if (token) {
          original.headers = { ...(original.headers as Record<string, string>), Authorization: `Bearer ${token}` };
        }
        return api.request(original);
      }
    }
    throw error;
  },
);

/** Manual auth headers for the few call sites that still need them. */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** Human-readable message from any axios/network error. */
export function errMsg(e: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { message?: string; error?: string; reason?: string } | string | undefined;
    if (typeof data === 'string' && data) return data.slice(0, 180);
    const m = typeof data === 'object' && data !== null ? data.message || data.reason || data.error : undefined;
    if (m) return String(m).slice(0, 180);
    if (e.code === 'ECONNABORTED') return 'Request timed out — check connection.';
    if (!e.response) return 'Network connection failed.';
    return `HTTP ${e.response.status}`;
  }
  return String((e as Error)?.message || fallback).slice(0, 180);
}

/** Keep long desk sessions alive; call once per app boot. Returns a stopper. */
export function startSilentRefresh(intervalMs = 15 * 60 * 1000): () => void {
  const id = setInterval(() => {
    if (getAccessToken() && getRefreshToken()) void refreshSession();
  }, intervalMs);
  return () => clearInterval(id);
}

/** Revoke the server-side refresh token, then drop local session keys. */
export async function revokeSession(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await rawApi.post('/api/auth/logout', { refreshToken: refresh });
    } catch {
      // logout is best-effort; local keys are cleared regardless
    }
  }
  clearSessionTokens();
}
