import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminTabId, AdminNotification } from '../types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Trash2,
  Search,
  Scan,
  Users,
  DollarSign,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Sparkles,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';

interface NotificationHistoryPageProps {
  onNavigate?: (tab: AdminTabId) => void;
}

type CategoryFilter = 'all' | 'unread' | 'attendance' | 'crm' | 'finance' | 'whatsapp' | 'system';
type SeverityFilter = 'all' | 'urgent' | 'warning' | 'info' | 'success';
type SortOrder = 'newest' | 'oldest' | 'severity';

export const NotificationHistoryPage: React.FC<NotificationHistoryPageProps> = ({ onNavigate }) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markNotificationAsUnread,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllReadNotifications,
    language,
    direction,
  } = useAdmin();

  const isRtl = direction === 'rtl';

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Stats calculation
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = unreadNotificationsCount;
    const attendance = notifications.filter((n) => n.category === 'attendance').length;
    const crm = notifications.filter((n) => n.category === 'crm').length;
    const finance = notifications.filter((n) => n.category === 'finance').length;
    const whatsapp = notifications.filter((n) => n.category === 'whatsapp').length;
    const system = notifications.filter((n) => n.category === 'system').length;

    // Count today's notifications
    const today = new Date().toDateString();
    const todayCount = notifications.filter(
      (n) => n.timestamp && new Date(n.timestamp).toDateString() === today
    ).length;

    return { total, unread, attendance, crm, finance, whatsapp, system, todayCount };
  }, [notifications, unreadNotificationsCount]);

  // Filtering and sorting
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((n) => {
        // Category filter
        if (selectedCategory === 'unread') {
          if (!n.unread) return false;
        } else if (selectedCategory !== 'all') {
          if (n.category !== selectedCategory) return false;
        }

        // Severity filter
        if (selectedSeverity !== 'all' && n.severity !== selectedSeverity) {
          return false;
        }

        // Search text filter
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase();
          const matchTitle = (n.title || '').toLowerCase().includes(q);
          const matchTitleAr = (n.titleAr || '').toLowerCase().includes(q);
          const matchMsg = (n.message || '').toLowerCase().includes(q);
          const matchMsgAr = (n.messageAr || '').toLowerCase().includes(q);
          const matchCat = (n.category || '').toLowerCase().includes(q);
          if (!matchTitle && !matchTitleAr && !matchMsg && !matchMsgAr && !matchCat) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'oldest') {
          return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
        }
        if (sortOrder === 'severity') {
          const rank = { urgent: 4, warning: 3, success: 2, info: 1 };
          return (rank[b.severity] || 0) - (rank[a.severity] || 0);
        }
        // Default newest
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      });
  }, [notifications, selectedCategory, selectedSeverity, debouncedSearch, sortOrder]);

  // Group notifications by date bucket
  const groupedNotifications = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    const groups: { labelEn: string; labelAr: string; items: AdminNotification[] }[] = [
      { labelEn: 'Today', labelAr: 'اليوم', items: [] },
      { labelEn: 'Yesterday', labelAr: 'أمس', items: [] },
      { labelEn: 'Earlier', labelAr: 'سابقاً', items: [] },
    ];

    filteredNotifications.forEach((n) => {
      const d = n.timestamp ? new Date(n.timestamp).toDateString() : '';
      if (d === today) {
        groups[0].items.push(n);
      } else if (d === yesterday) {
        groups[1].items.push(n);
      } else {
        groups[2].items.push(n);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  }, [filteredNotifications]);

  const getCategoryMeta = (cat: AdminNotification['category']) => {
    switch (cat) {
      case 'attendance':
        return {
          icon: <Scan className="w-4 h-4" />,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          labelEn: 'Attendance',
          labelAr: 'الحضور',
        };
      case 'crm':
        return {
          icon: <Users className="w-4 h-4" />,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
          labelEn: 'CRM & Quota',
          labelAr: 'الطلاب والحصص',
        };
      case 'finance':
        return {
          icon: <DollarSign className="w-4 h-4" />,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          labelEn: 'Finance & POS',
          labelAr: 'المالية والمتجر',
        };
      case 'whatsapp':
        return {
          icon: <MessageSquare className="w-4 h-4" />,
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
          labelEn: 'WhatsApp',
          labelAr: 'واتساب',
        };
      default:
        return {
          icon: <ShieldCheck className="w-4 h-4" />,
          color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
          labelEn: 'System',
          labelAr: 'النظام',
        };
    }
  };

  const getSeverityBadge = (sev: AdminNotification['severity']) => {
    switch (sev) {
      case 'urgent':
        return <span className="status-pill-rose px-2 py-0.5 rounded text-[10px] font-bold uppercase">{language === 'ar' ? 'عاجل' : 'Urgent'}</span>;
      case 'warning':
        return <span className="status-pill-amber px-2 py-0.5 rounded text-[10px] font-bold uppercase">{language === 'ar' ? 'تنبيه' : 'Warning'}</span>;
      case 'success':
        return <span className="status-pill-emerald px-2 py-0.5 rounded text-[10px] font-bold uppercase">{language === 'ar' ? 'نجاح' : 'Success'}</span>;
      default:
        return <span className="status-pill-blue px-2 py-0.5 rounded text-[10px] font-bold uppercase">{language === 'ar' ? 'معلومة' : 'Info'}</span>;
    }
  };

  const formatItemTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* 4 KPI metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="premium-card p-4 sm:p-5 flex items-center justify-between border-white/10 hover:border-white/20 transition">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              {language === 'ar' ? 'إجمالي الإشعارات المسجلة' : 'Total Notifications'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
                {stats.total}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {language === 'ar' ? 'حدث محفوظ' : 'in history'}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 flex-shrink-0">
            <Bell className="w-5 h-5 text-rose-300" />
          </div>
        </div>

        <div className={`premium-card p-4 sm:p-5 flex items-center justify-between transition ${
          stats.unread > 0 ? 'border-rose-500/30 bg-rose-500/[0.03]' : 'border-white/10'
        }`}>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              {language === 'ar' ? 'تنبيهات غير مقروءة' : 'Unread Alerts'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`font-heading text-2xl sm:text-3xl font-extrabold ${stats.unread > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {stats.unread}
              </span>
              {stats.unread > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 flex-shrink-0">
            <AlertTriangle className={`w-5 h-5 ${stats.unread > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5 flex items-center justify-between border-white/10 hover:border-white/20 transition">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              {language === 'ar' ? 'نشاط اليوم' : "Today's Activity"}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-heading text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {stats.todayCount}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {language === 'ar' ? 'خلال 24 ساعة' : 'last 24h'}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5 flex items-center justify-between border-white/10 hover:border-white/20 transition">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              {language === 'ar' ? 'حضور وتواصل' : 'Attendance & CRM'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-heading text-2xl sm:text-3xl font-extrabold text-sky-400">
                {stats.attendance + stats.crm + stats.whatsapp}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {language === 'ar' ? 'عملية' : 'actions'}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 flex-shrink-0">
            <Users className="w-5 h-5 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="premium-card p-4 sm:p-6 border-white/10 space-y-5">
        {/* Top Action & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-white/10">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className={`w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث في العنوان، التفاصيل، الفئة…' : 'Search by title, details, category…'}
              className={`w-full py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-rose-400/40 transition ${
                isRtl ? 'pr-9 pl-8' : 'pl-9 pr-8'
              }`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-500 hover:text-white ${isRtl ? 'left-3' : 'right-3'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={markAllNotificationsAsRead}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white transition flex items-center gap-1.5 active:scale-95"
              title={language === 'ar' ? 'تعيين جميع الإشعارات كمقروءة وحفظ الحالة' : 'Mark all notifications as read and persist'}
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span>{language === 'ar' ? 'تعيين الكل كمقروء' : 'Mark all read'}</span>
            </button>

            <button
              onClick={clearAllReadNotifications}
              className="px-3 py-2.5 rounded-xl text-xs font-bold bg-white/[0.02] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 transition flex items-center gap-1.5 active:scale-95"
              title={language === 'ar' ? 'مسح الإشعارات المقروءة من السجل' : 'Clear all read notifications'}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'ar' ? 'مسح المقروء' : 'Clear read'}</span>
            </button>

          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {(
            [
              { id: 'all', labelEn: 'All History', labelAr: 'كل السجل', count: stats.total },
              { id: 'unread', labelEn: 'Unread', labelAr: 'غير مقروء', count: stats.unread, highlight: stats.unread > 0 },
              { id: 'attendance', labelEn: 'Attendance', labelAr: 'الحضور', count: stats.attendance },
              { id: 'crm', labelEn: 'CRM & Quota', labelAr: 'الطلاب والحصص', count: stats.crm },
              { id: 'finance', labelEn: 'Finance & Store', labelAr: 'المالية والمتجر', count: stats.finance },
              { id: 'whatsapp', labelEn: 'WhatsApp', labelAr: 'واتساب', count: stats.whatsapp },
              { id: 'system', labelEn: 'System', labelAr: 'النظام', count: stats.system },
            ] as const
          ).map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as CategoryFilter)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition border cursor-pointer ${
                  active
                    ? 'nav-pill-active font-bold text-slate-950 border-white'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    active
                      ? 'bg-slate-900/20 text-slate-900 font-bold'
                      : (tab as any).highlight
                      ? 'bg-rose-500/20 text-rose-300 font-bold'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters and sorting row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              {language === 'ar' ? 'الأهمية:' : 'Severity:'}
            </span>
            {(['all', 'urgent', 'warning', 'info', 'success'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2 py-1 rounded-lg text-[11px] transition ${
                  selectedSeverity === sev
                    ? 'bg-white/10 text-white font-bold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {sev === 'all'
                  ? language === 'ar'
                    ? 'الكل'
                    : 'All'
                  : sev === 'urgent'
                  ? language === 'ar'
                    ? 'عاجل'
                    : 'Urgent'
                  : sev === 'warning'
                  ? language === 'ar'
                    ? 'تنبيه'
                    : 'Warning'
                  : sev === 'success'
                  ? language === 'ar'
                    ? 'نجاح'
                    : 'Success'
                  : language === 'ar'
                  ? 'معلومة'
                  : 'Info'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">{language === 'ar' ? 'الترتيب:' : 'Sort:'}</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="bg-white/[0.04] border border-white/10 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none"
            >
              <option value="newest" className="bg-[#121829] text-white">
                {language === 'ar' ? 'الأحدث أولاً' : 'Newest First'}
              </option>
              <option value="oldest" className="bg-[#121829] text-white">
                {language === 'ar' ? 'الأقدم أولاً' : 'Oldest First'}
              </option>
              <option value="severity" className="bg-[#121829] text-white">
                {language === 'ar' ? 'الأعلى أهمية' : 'Highest Severity'}
              </option>
            </select>
          </div>
        </div>

        {/* Notifications Timeline Feed */}
        {groupedNotifications.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <CheckCircle2 className="w-7 h-7 text-emerald-400/80" />
            </div>
            <h4 className="font-heading text-base font-bold text-white">
              {language === 'ar' ? 'لا توجد تنبيهات مطابقة' : 'No notifications match filters'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {language === 'ar'
                ? 'جميع الأحداث المسجلة تم الاطلاع عليها، أو لا توجد نتائج للبحث الحالي.'
                : 'All academy activities are peaceful or no events match your current criteria.'}
            </p>
            {(search || selectedCategory !== 'all' || selectedSeverity !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedSeverity('all');
                }}
                className="mt-2 text-xs font-bold text-rose-300 hover:text-white transition"
              >
                {language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {groupedNotifications.map((group) => (
              <div key={group.labelEn} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
                  <span>{language === 'ar' ? group.labelAr : group.labelEn}</span>
                  <span className="text-[10px] font-mono text-slate-600">({group.items.length})</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <div className="space-y-2">
                  {group.items.map((item) => {
                    const catMeta = getCategoryMeta(item.category);
                    return (
                      <div
                        key={item.id}
                        className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                          item.unread
                            ? 'bg-gradient-to-r from-rose-500/[0.05] via-white/[0.03] to-white/[0.02] border-white/20 shadow-lg shadow-black/20'
                            : 'bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Category Icon */}
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${catMeta.color}`}
                          >
                            {catMeta.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <h4
                                  className={`text-xs sm:text-sm font-bold truncate ${
                                    item.unread ? 'text-white' : 'text-slate-300'
                                  }`}
                                >
                                  {language === 'ar' ? item.titleAr || item.title : item.title}
                                </h4>
                                {item.unread && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/30 flex-shrink-0 animate-pulse" />
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getSeverityBadge(item.severity)}
                                <span className="text-[10px] font-mono text-slate-500">
                                  {formatItemTime(item.timestamp)}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {language === 'ar' ? item.messageAr || item.message : item.message}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-white/[0.04]">
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className="font-semibold text-slate-400">
                                  {language === 'ar' ? catMeta.labelAr : catMeta.labelEn}
                                </span>
                                <span>•</span>
                                <span className="font-mono">{item.time}</span>
                              </div>

                              {/* Card Actions */}
                              <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
                                {item.linkTab && onNavigate && (
                                  <button
                                    onClick={() => {
                                      markNotificationAsRead(item.id);
                                      onNavigate(item.linkTab!);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-bold text-rose-300 hover:text-white flex items-center gap-1 transition"
                                  >
                                    <span>{language === 'ar' ? 'فتح في القسم' : 'Open in section'}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    item.unread
                                      ? markNotificationAsRead(item.id)
                                      : markNotificationAsUnread(item.id)
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                                  title={
                                    item.unread
                                      ? language === 'ar'
                                        ? 'تعيين كمقروء'
                                        : 'Mark as read'
                                      : language === 'ar'
                                      ? 'تعيين كغير مقروء'
                                      : 'Mark as unread'
                                  }
                                >
                                  {item.unread ? (
                                    <Eye className="w-3.5 h-3.5" />
                                  ) : (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  onClick={() => deleteNotification(item.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                  title={language === 'ar' ? 'حذف من السجل' : 'Delete'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
