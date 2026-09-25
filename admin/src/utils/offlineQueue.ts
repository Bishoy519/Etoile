/**
 * Offline kiosk queue — survives LAN/WAN drops.
 * Queues check-ins in localStorage with idempotencyKey, auto-flushes when online.
 * Server dedupes by idempotencyKey (10 min) + 60s double-scan guard.
 */

export interface QueuedCheckin {
  key: string;
  barcode: string;
  method: string;
  at: string;
  tries: number;
}

const LS_KEY = 'etoile_offline_checkin_queue_v1';

export function makeKey(): string {
  return `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadQueue(): QueuedCheckin[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveQueue(q: QueuedCheckin[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(q.slice(0, 200)));
  } catch { /* quota */ }
}

export function enqueue(barcode: string, method: string): QueuedCheckin {
  const item: QueuedCheckin = { key: makeKey(), barcode: barcode.trim().toUpperCase(), method, at: new Date().toISOString(), tries: 0 };
  saveQueue([...loadQueue(), item]);
  return item;
}

import { api } from './api';

export async function flushQueue(
  onResult?: (item: QueuedCheckin, ok: boolean, res?: unknown) => void,
): Promise<{ flushed: number; remaining: number }> {
  const q = loadQueue();
  if (!q.length) return { flushed: 0, remaining: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { flushed: 0, remaining: q.length };

  let flushed = 0;
  const remaining: QueuedCheckin[] = [];
  let networkDown = false;

  for (const item of q) {
    if (networkDown) {
      remaining.push(item);
      continue;
    }
    try {
      const res = await api.post('/api/attendance/checkin', { barcode: item.barcode, method: item.method, idempotencyKey: item.key });
      flushed += 1;
      onResult?.(item, true, res.data);
    } catch (e: unknown) {
      const hasResponse = !!(e as { response?: unknown })?.response;
      if (hasResponse) {
        const resData = (e as { response?: { data?: unknown } })?.response?.data ?? {};
        const next = { ...item, tries: item.tries + 1 };
        if (next.tries < 3) remaining.push(next);
        else onResult?.(item, false, resData);
      } else {
        networkDown = true;
        remaining.push(item);
      }
    }
  }

  saveQueue(remaining);
  return { flushed, remaining: remaining.length };
}

export function queueLength(): number {
  try {
    return loadQueue().length;
  } catch {
    return 0;
  }
}
