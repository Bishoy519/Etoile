import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, errMsg } from '../../utils/api';
import { Bell, CheckCheck, BellRing, BellOff } from 'lucide-react';

interface FeedItem {
  id: string;
  kind: 'message' | 'quota' | 'invoice' | 'session';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  titleAr: string;
  body: string;
  createdAt: string;
}

const SEEN_KEY = 'etoile_notif_seen';

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return new Uint8Array(Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0))));
}

export const NotificationBell: React.FC = () => {
  const { language, instructorUser, currentFamilyId, setActiveView, showToast } = useApp();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [seen, setSeen] = useState<Set<string>>(loadSeen);
  const [open, setOpen] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  const ref = useRef<HTMLDivElement>(null);
  const loggedIn = Boolean(instructorUser || currentFamilyId);

  const fetchFeed = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const { data } = await api.get('/api/notifications/mine');
      if (Array.isArray(data.items)) setItems(data.items);
    } catch {
      // offline — keep last
    }
  }, [loggedIn]);

  useEffect(() => {
    fetchFeed();
    if (!loggedIn) return;
    const t = setInterval(fetchFeed, 60000);
    return () => clearInterval(t);
  }, [fetchFeed, loggedIn]);

  useEffect(() => {
    if (!loggedIn || !pushSupported) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushOn(!!sub);
      } catch {
        // push unavailable — bell still works as inbox
      }
    })();
  }, [loggedIn, pushSupported]);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await api.post('/api/notifications/push/unsubscribe', { endpoint: existing.endpoint }).catch(() => null);
        await existing.unsubscribe().catch(() => null);
        setPushOn(false);
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        showToast(language === 'ar' ? 'التنبيهات مرفوضة' : 'Notifications blocked', language === 'ar' ? 'اسمحي من إعدادات المتصفح.' : 'Allow from browser settings.', 'warning');
        return;
      }
      const { data } = await api.get('/api/notifications/push/vapid-key');
      const { publicKey, configured } = data;
      if (!configured || !publicKey) {
        showToast(language === 'ar' ? 'الخدمة غير مفعلة' : 'Push not configured', language === 'ar' ? 'تواصلي مع الإدارة لتفعيل المفاتيح.' : 'Ask management to configure VAPID keys.', 'warning');
        return;
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await api.post('/api/notifications/push/subscribe', { endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))) } });
      setPushOn(true);
      showToast(language === 'ar' ? 'تم تفعيل التنبيهات' : 'Push enabled', language === 'ar' ? 'ستصلك الإيصالات على الشاشة.' : 'Receipts will reach your lock screen.', 'success');
    } catch (e) {
      showToast(language === 'ar' ? 'تعذر التفعيل' : 'Enable failed', errMsg(e), 'error');
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!loggedIn) return null;

  const unread = items.filter((i) => !seen.has(i.id));
  const markAll = () => {
    const all = new Set([...seen, ...items.map((i) => i.id)]);
    setSeen(all);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(all).slice(-200)));
    } catch {
      // ignore
    }
  };

  const dot = (s: FeedItem['severity']) =>
    s === 'urgent' ? 'bg-rose-400' : s === 'warning' ? 'bg-amber-300' : 'bg-sky-300';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full border border-brand-gold/30 bg-[#121617]/80 text-brand-gold hover:border-brand-gold transition"
        aria-label={language === 'ar' ? 'الإشعارات' : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div role="status" aria-live="polite" className="absolute end-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto rounded-2xl bg-[#101314] border border-brand-gold/30 shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gold/20 sticky top-0 bg-[#101314]">
            <span className="text-xs font-bold text-brand-gold">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
            <span className="flex items-center gap-2">
              {pushSupported && (
                <button
                  onClick={togglePush}
                  disabled={pushBusy}
                  className={`p-1.5 rounded-lg border transition ${pushOn ? 'border-emerald-500/40 text-emerald-300' : 'border-white/10 text-brand-muted/60 hover:text-brand-gold'}`}
                  title={pushOn ? (language === 'ar' ? 'إيقاف تنبيهات الشاشة' : 'Disable lock-screen alerts') : (language === 'ar' ? 'تفعيل تنبيهات الشاشة' : 'Enable lock-screen alerts')}
                  aria-label="Toggle push notifications"
                  aria-pressed={pushOn}
                >
                  {pushOn ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>
              )}
              <button onClick={markAll} className="text-[11px] text-brand-muted/70 hover:text-brand-gold flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> {language === 'ar' ? 'تعيين الكل كمقروء' : 'Mark all read'}
              </button>
            </span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-brand-muted/70">
              {language === 'ar' ? 'لا إشعارات — كل شيء هادئ.' : 'No notifications — all quiet.'}
            </p>
          ) : (
            items.map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  if (i.kind === 'invoice') setActiveView('client_portal');
                  setOpen(false);
                }}
                className={`w-full text-start px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] flex gap-2.5 ${seen.has(i.id) ? 'opacity-60' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot(i.severity)}`} />
                <span>
                  <span className="block text-xs font-semibold text-white">{language === 'ar' ? i.titleAr : i.title}</span>
                  <span className="block text-[11px] text-brand-muted/70 mt-0.5 line-clamp-2">{i.body}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
