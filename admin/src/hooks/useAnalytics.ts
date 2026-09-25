import { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';

async function getJson<T>(url: string, fallback: T): Promise<T> {
  return api.get(url).then((r) => r.data as T).catch(() => fallback);
}

export interface AnalyticsOverview {
  generatedAt: string;
  counts: { students: number; activePackages: number; attendanceEvents: number; leads: number; sessions: number; orders: number };
  money: { tuitionRecognized: number; retail: number; inflow: number; opex: number; payroll: number; outflow: number; net: number; margin: number; arDebt: number; unpaidInvoices: number };
  engagement: { quotaMax: number; quotaUsed: number; utilization: number; conversion: number; funnel: Record<string, number>; slaBreached: number };
  programMix: Record<string, number>;
}

export function useAnalyticsOverview(pollMs = 30000) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const d = await getJson<AnalyticsOverview | null>('/api/analytics/overview', null);
    if (d) setData(d);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    if (!pollMs) return;
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);
  return { data, loading, refresh };
}

export function useAnalyticsTrend(range: '30D' | '90D' | '12M', metric: 'revenue' | 'attendance' | 'enrollment') {
  const [points, setPoints] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let alive = true;
    getJson<{ points: number[]; total: number }>(`/api/analytics/trend?range=${range}&metric=${metric}`, { points: [], total: 0 }).then((d) => {
      if (alive && d.points.length) { setPoints(d.points); setTotal(d.total); }
    });
    return () => { alive = false; };
  }, [range, metric]);
  return { points, total };
}

export interface AttentionData {
  lowQuota: { id: string; name: string; phone: string; left: number }[];
  debtors: { id: string; name: string; phone: string; debt: number }[];
  expiringSoon: { id: string; name: string; endDate: string }[];
  sla: { id: string; dancer: string; stage: string; phone: string }[];
  pendingReminders: number;
}

export function useAttention(pollMs = 45000) {
  const [data, setData] = useState<AttentionData | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const d = await getJson<AttentionData | null>('/api/analytics/attention', null);
      if (alive && d) setData(d);
    };
    load();
    const t = setInterval(load, pollMs);
    return () => { alive = false; clearInterval(t); };
  }, [pollMs]);
  return data;
}

export function useOps(pollMs = 60000) {
  const [renewals, setRenewals] = useState<{ total: number; queue: unknown[] } | null>(null);
  const [conflicts, setConflicts] = useState<{ total: number; conflicts: unknown[]; sessionsChecked: number } | null>(null);
  const [sla, setSla] = useState<{ total: number; breached: number } | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [r, c, s] = await Promise.all([
        getJson('/api/ops/renewal-queue', null),
        getJson('/api/ops/schedule-conflicts', null),
        getJson('/api/ops/funnel-sla', null),
      ]);
      if (!alive) return;
      if (r) setRenewals(r as { total: number; queue: unknown[] });
      if (c) setConflicts(c as { total: number; conflicts: unknown[]; sessionsChecked: number });
      if (s) setSla(s as { total: number; breached: number });
    };
    load();
    const t = setInterval(load, pollMs);
    return () => { alive = false; clearInterval(t); };
  }, [pollMs]);
  return { renewals, conflicts, sla };
}
