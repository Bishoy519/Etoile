/**
 * Central API transport for the Client portal — axios edition.
 *
 * Two independent portal sessions can coexist (family + instructor), each
 * with its own access/refresh pair:
 * - Request interceptor attaches whichever access token exists (family first).
 * - Response interceptor: on a single 401, rotates via the stored refresh
 *   token (single-flight per slot) and retries once. A rejected refresh drops
 *   that slot only.
 * - Public endpoints work with no session attached.
 *
 * Login / password / OTP endpoints must use `rawApi` (no interceptors),
 * never `api`, to avoid refresh loops.
 */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

type Slot = 'family' | 'instructor';

const SLOTS: Record<Slot, { access: string; refresh: string }> = {
  family: { access: 'etoile_family_token', refresh: 'etoile_family_refresh' },
  instructor: { access: 'etoile_instructor_token', refresh: 'etoile_instructor_refresh' },
};

const inflightRefresh: Partial<Record<Slot, Promise<boolean> | null>> = {};

/** Raw axios — no auth, no retry. For login/refresh/logout only. */
export const rawApi: AxiosInstance = axios.create({ timeout: 15000 });

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return storageGet(SLOTS.family.access) || storageGet(SLOTS.instructor.access);
}

function slotOfAccessToken(token: string | null): Slot | null {
  if (!token) return null;
  try {
    if (localStorage.getItem(SLOTS.family.access) === token) return 'family';
    if (localStorage.getItem(SLOTS.instructor.access) === token) return 'instructor';
  } catch {
    // ignore
  }
  return null;
}

export function setSessionTokens(access?: string | null, refresh?: string | null, slot?: Slot) {
  try {
    if (access && slot) localStorage.setItem(SLOTS[slot].access, access);
    if (refresh && slot) localStorage.setItem(SLOTS[slot].refresh, refresh);
  } catch {
    // ignore
  }
}

export function clearClientSession(slot?: Slot | 'all') {
  try {
    const slots: Slot[] = !slot || slot === 'all' ? ['family', 'instructor'] : [slot];
    for (const s of slots) {
      localStorage.removeItem(SLOTS[s].access);
      localStorage.removeItem(SLOTS[s].refresh);
    }
  } catch {
    // ignore
  }
}

async function rotateSlot(slot: Slot): Promise<boolean> {
  if (inflightRefresh[slot]) return inflightRefresh[slot] as Promise<boolean>;
  const refresh = storageGet(SLOTS[slot].refresh);
  if (!refresh) return false;

  const run = (async (): Promise<boolean> => {
    try {
      const res = await rawApi.post('/api/auth/refresh', { refreshToken: refresh });
      const data = res.data;
      if (!data?.access_token) return false;
      try {
        localStorage.setItem(SLOTS[slot].access, data.access_token);
        if (data.refresh_token) localStorage.setItem(SLOTS[slot].refresh, data.refresh_token);
      } catch {
        // ignore
      }
      return true;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) clearClientSession(slot);
      return false;
    } finally {
      inflightRefresh[slot] = null;
    }
  })();

  inflightRefresh[slot] = run;
  return run;
}

/** Rotate any slot holding a refresh token (family first). */
export async function refreshSession(): Promise<boolean> {
  const order: Slot[] = ['family', 'instructor'];
  for (const slot of order) {
    if (storageGet(SLOTS[slot].refresh)) {
      if (await rotateSlot(slot)) return true;
    }
  }
  return false;
}

/** Authenticated axios instance used by every portal call site. */
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
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      const rejectedToken =
        (original.headers as Record<string, string> | undefined)?.Authorization?.replace(
          /^Bearer\s+/,
          '',
        ) ?? getAccessToken();
      const slot = slotOfAccessToken(rejectedToken);
      const rotated = slot ? await rotateSlot(slot) : await refreshSession();
      if (rotated) {
        const nextToken = getAccessToken();
        if (nextToken) {
          original.headers = { ...(original.headers as Record<string, string>), Authorization: `Bearer ${nextToken}` };
        }
        return api.request(original);
      }
    }
    throw error;
  },
);

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

/** Keep portal sessions alive while the app is open. Call once per boot. */
export function startSilentRefresh(intervalMs = 15 * 60 * 1000): () => void {
  const id = setInterval(() => {
    void refreshSession();
  }, intervalMs);
  return () => clearInterval(id);
}

/** Revoke the slot's server-side refresh token, then drop its local keys. */
export async function revokeClientSession(slot: Slot | 'all' = 'all'): Promise<void> {
  const slots: Slot[] = slot === 'all' ? ['family', 'instructor'] : [slot];
  for (const s of slots) {
    const refresh = storageGet(SLOTS[s].refresh);
    if (refresh) {
      try {
        await rawApi.post('/api/auth/logout', { refreshToken: refresh });
      } catch {
        // logout is best-effort; local keys are cleared regardless
      }
    }
  }
  clearClientSession(slot);
}
