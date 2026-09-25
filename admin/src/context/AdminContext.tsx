import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import {
  UserRole,
  AppLanguage,
  AdminTabId,
  AdminNotification,
  RoleConfig,
  ROLE_CONFIGS as DEFAULT_ROLE_CONFIGS,
  ALL_MODULES,
  Student,
  AttendanceRecord,
  ProductItem,
  CartItem,
  OpenWaMessage,
  FinancialMetrics,
  StaffMember,
  AdmissionLead,
  StudentNote,
  SkillEvaluation,
  CrmAuditEntry,
  Subscription,
  BoutiqueOrder,
  ExpenseItem,
  InvoiceItem,
  PayrollSlip,
  JournalVoucher,
  CashDrawerShift,
  PaymentTransaction,
  CourseItem,
  CourseSession,
  CourseEnrollment,
  WhatsAppReminderConfig,
  WhatsAppGatewayConfig,
  TreasuryAccount,
  TreasuryPurpose,
  TreasurySource,
  TreasuryTransaction,
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_PRODUCTS,
  INITIAL_ATTENDANCE,
  INITIAL_FINANCIALS,
  INITIAL_OPENWA_MESSAGES,
  INITIAL_STAFF,
  INITIAL_LEADS,
  INITIAL_NOTES,
  INITIAL_EVALUATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_BOUTIQUE_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_INVOICES,
  INITIAL_PAYROLL,
  INITIAL_JOURNAL,
  INITIAL_DRAWER_SHIFT,
} from '../data/initialState';
import { formatCurrency } from '../utils/currency';
import {
  api,
  rawApi,
  errMsg,
  setSessionTokens,
  revokeSession,
  startSilentRefresh,
} from '../utils/api';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'danger' | 'gold' | 'secondary' | 'primary';
  icon?: 'trash' | 'check' | 'x';
}

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'gold';
  actions?: ToastAction[];
  duration?: number;
  onDismiss?: () => void;
}

export interface ConfirmNotificationOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'error' | 'warning' | 'gold' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
  duration?: number;
}


/**
 * Backend (Prisma) BoutiqueOrder shape differs from the frontend CartItem-based
 * BoutiqueOrder type. Normalize so UI can safely read `items[].product.title`,
 * `total`, `status`, `timestamp` regardless of source.
 */
export function normalizeBoutiqueOrder(raw: any): BoutiqueOrder {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return {
    id: String(raw?.orderNumber || raw?.id || `ORD-${Date.now()}`),
    studentId: raw?.studentId ?? undefined,
    studentName: raw?.studentName ?? undefined,
    customerName: raw?.customerName || raw?.customer || 'Walk-in',
    items: items.map((it: any) => ({
      product: it?.product ?? {
        id: String(it?.productId || it?.product?.id || 'unknown'),
        title: String(it?.title || it?.product?.title || it?.name || 'Item'),
        titleAr: String(it?.titleAr || it?.title || 'صنف'),
        category: it?.category || 'apparel',
        price: Number(it?.price ?? it?.product?.price ?? 0),
        sku: String(it?.sku || it?.productId || 'SKU'),
        variants: it?.variants || [],
        imageUrl: String(it?.imageUrl || ''),
      },
      size: String(it?.size ?? 'STD'),
      quantity: Number(it?.quantity ?? 1),
    })),
    total: Number(raw?.total ?? raw?.totalAmount ?? raw?.amount ?? 0),
    subtotal: Number(raw?.subtotal ?? raw?.total ?? raw?.totalAmount ?? raw?.amount ?? 0),
    paymentMethod: (raw?.paymentMethod || 'cash') as BoutiqueOrder['paymentMethod'],
    date: String(raw?.date || (raw?.createdAt ? String(raw.createdAt).split('T')[0] : new Date().toISOString().split('T')[0])),
    timestamp: String(raw?.timestamp || raw?.createdAt || raw?.date || new Date().toISOString()),
    status: (raw?.status || (raw?.ledgerStatus === 'charged_debt' ? 'completed' : 'completed')) as BoutiqueOrder['status'],
    processedBy: String(raw?.processedBy || raw?.actor || 'POS Terminal'),
  };
}

export function normalizeBoutiqueOrders(raw: any): BoutiqueOrder[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeBoutiqueOrder);
}

interface AdminContextType {
  currentUser: StaffMember | null;
  userRole: UserRole;
  roleConfigs: Record<UserRole, RoleConfig>;
  updateRoleAccess: (role: UserRole, tab: AdminTabId, allowed: boolean) => void;
  setRoleDefaultTab: (role: UserRole, tab: AdminTabId) => void;
  resetRolePermissions: () => void;
  language: AppLanguage;
  direction: 'ltr' | 'rtl';
  students: Student[];
  attendanceLogs: AttendanceRecord[];
  products: ProductItem[];
  cart: CartItem[];
  openWaQueue: OpenWaMessage[];
  financials: FinancialMetrics;
  orders: BoutiqueOrder[];
  toasts: ToastData[];
  leads: AdmissionLead[];
  studentNotes: StudentNote[];
  staffList: StaffMember[];
  evaluations: SkillEvaluation[];
  auditLogs: CrmAuditEntry[];
  // Financial Subsystem Collections & Actions
  expenses: ExpenseItem[];
  invoices: InvoiceItem[];
  payrollSlips: PayrollSlip[];
  journalEntries: JournalVoucher[];
  activeDrawerShift: CashDrawerShift | null;
  addExpense: (expense: Omit<ExpenseItem, 'id' | 'expenseNumber'>) => void;
  deleteExpense: (id: string) => void;
  createManualInvoice: (invoiceData: {
    studentId?: string;
    studentName?: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    type: 'tuition' | 'boutique' | 'private_lesson' | 'custom';
    items: { description: string; quantity: number; unitPrice: number }[];
    discountAmount?: number;
    taxAmount?: number;
    dueDate?: string;
    notes?: string;
  }) => InvoiceItem;
  recordManualPayment: (payment: {
    invoiceId?: string;
    studentId?: string;
    studentName?: string;
    amount: number;
    method: 'cash' | 'instapay' | 'card' | 'bank_transfer' | 'wallet_debt';
    referenceNo?: string;
    receiptUrl?: string;
    notes?: string;
  }) => void;
  adjustPayroll: (
    slipId: string,
    adjustments: {
      bonusAmount?: number;
      deductionAmount?: number;
      hourlyRate?: number;
      notes?: string;
    }
  ) => void;
  markPayrollPaid: (slipId: string, paymentMethod?: 'bank_transfer' | 'cash') => void;
  approvePayroll: (slipId: string) => void;
  refreshPayroll: () => Promise<void>;
  recordJournalEntry: (entry: {
    memo: string;
    reference?: string;
    lines: { accountCode: string; accountName: string; debit: number; credit: number; description?: string }[];
  }) => { success: boolean; error?: string };
  openCashDrawerShift: (openingFloat: number, notes?: string) => void;
  closeCashDrawerShift: (countedCash: number, notes?: string) => { variance: number };
  // Treasury / Money Accounts (dynamic reconciliation)
  treasuryAccounts: TreasuryAccount[];
  treasuryTransactions: TreasuryTransaction[];
  addTreasuryAccount: (data: { name: string; purpose: TreasuryPurpose; openingBalance: number; notes?: string }) => TreasuryAccount;
  updateTreasuryAccount: (id: string, data: Partial<TreasuryAccount>) => void;
  deleteTreasuryAccount: (id: string) => void;
  reconcileTreasuryAccount: (id: string, counted: number) => void;
  addTreasuryTransaction: (data: {
    accountId: string;
    kind: 'deposit' | 'withdraw';
    source: TreasurySource;
    amount: number;
    description?: string;
    date?: string;
    toAccountId?: string;
    paymentMethod?: 'cash' | 'instapay' | 'card' | 'transfer' | 'wallet_debt';
    referenceNo?: string;
  }) => { success: boolean; error?: string };
  deleteTreasuryTransaction: (id: string) => void;
  // Courses, Sessions, and WhatsApp Gateway
  courses: CourseItem[];
  courseSessions: CourseSession[];
  reminderConfig: WhatsAppReminderConfig | null;
  whatsAppConfig: WhatsAppGatewayConfig | null;
  createCourse: (data: any) => Promise<CourseItem | null>;
  updateCourse: (id: string, data: any) => Promise<CourseItem | null>;
  deleteCourse: (id: string) => Promise<boolean>;
  enrollStudentInCourse: (courseId: string, studentId: string) => Promise<boolean>;
  unenrollStudentFromCourse: (courseId: string, studentId: string) => Promise<boolean>;
  createCourseSession: (data: any) => Promise<CourseSession | null>;
  deleteCourseSession: (sessionId: string) => Promise<boolean>;
  sendCourseSessionReminder: (sessionId: string) => Promise<any>;
  updateReminderConfig: (data: any) => Promise<any>;
  connectWhatsApp: (mode?: 'builtin_qr' | 'external_gateway') => Promise<any>;
  confirmWhatsAppPairing: (phoneNumber?: string, pushName?: string) => Promise<any>;
  disconnectWhatsApp: () => Promise<any>;
  updateWhatsAppGateway: (config: any) => Promise<any>;
  login: (identifier: string, password?: string) => Promise<boolean>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
  setLanguage: (lang: AppLanguage) => void;
  checkInStudent: (barcode: string, method?: 'hid_barcode' | 'qr_camera' | 'manual') => {
    success: boolean;
    student?: Student;
    reason?: string;
    record?: AttendanceRecord;
  };
  addToCart: (product: ProductItem, size: string, quantity?: number) => void;
  updateCartQuantity: (productId: string, size: string, quantity: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  clearCart: () => void;
  checkoutCart: (
    paymentMethod: 'cash' | 'instapay' | 'card' | 'transfer' | 'wallet_debt',
    targetStudentId?: string,
    customerPhone?: string,
    customerName?: string
  ) => {
    success: boolean;
    error?: string;
    order?: BoutiqueOrder;
  };
  triggerOpenWaAlert: (
    event: OpenWaMessage['triggerEvent'],
    recipientPhone: string,
    recipientName: string,
    customBody?: string
  ) => void;
  settleStudentDebt: (studentId: string, amount: number) => void;
  updateSubscriptionQuota: (studentId: string, deltaSessions: number) => void;
  showToast: (
    title: string,
    message: string,
    type?: 'success' | 'warning' | 'error' | 'gold',
    options?: { duration?: number; actions?: ToastAction[] }
  ) => void;
  showConfirmNotification: (options: ConfirmNotificationOptions) => void;
  removeToast: (id: string) => void;
  playAudioChime: (type: 'success' | 'error' | 'warning') => void;
  isAudioMuted: boolean;
  toggleAudioMute: () => void;
  // Notifications System (strictly once per event, permanent read status)
  notifications: AdminNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markNotificationAsUnread: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllReadNotifications: () => void;
  addNotification: (notification: {
    id: string;
    eventId?: string;
    title: string;
    titleAr?: string;
    message: string;
    messageAr?: string;
    category?: AdminNotification['category'];
    severity?: AdminNotification['severity'];
    linkTab?: AdminTabId;
    timestamp?: string;
    isRead?: boolean;
  }) => void;
  // Full CRM Methods
  addLead: (lead: Omit<AdmissionLead, 'id' | 'createdAt'>) => void;
  updateLeadStage: (id: string, stage: AdmissionLead['stage']) => void;
  deleteLead: (id: string) => void;
  convertLeadToStudent: (leadId: string, planTier?: 'elite_16' | 'foundation_8' | 'intensive_20') => Student | null;
  registerStudent: (studentData: {
    name: string;
    nameAr: string;
    barcode?: string;
    age: number;
    program: 'classical' | 'contemporary' | 'youth';
    level: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    photoUrl?: string;
    maxNegativeDebt?: number;
    initialPlan: 'elite_16' | 'foundation_8' | 'intensive_20';
  }) => Student;
  updateStudent: (studentId: string, updatedFields: Partial<Student>) => void;
  deleteStudent: (studentId: string) => void;
  updateStudentBarcode: (studentId: string, newBarcode: string) => { success: boolean; error?: string };
  addStudentNote: (studentId: string, text: string, category?: StudentNote['category']) => void;
  updateStaffRole: (staffId: string, role: UserRole) => void;
  updateStaffAvatar: (staffId: string, avatarUrl: string | null) => Promise<boolean>;
  toggleStaffShift: (staffId: string) => void;
  addStaffMember: (member: Omit<StaffMember, 'id'>) => void;
  createStaffUser: (data: {
    name: string;
    nameAr?: string;
    email: string;
    role: UserRole;
    department?: string;
    departmentAr?: string;
    password?: string;
    avatarUrl?: string;
  }) => Promise<boolean>;
  deleteStaffMember: (staffId: string) => Promise<boolean>;
  resetStaffPassword: (staffId: string, newPass: string) => Promise<boolean>;
  addEvaluation: (evalData: Omit<SkillEvaluation, 'id' | 'date'>) => void;
  deleteEvaluation: (evalId: string) => void;
  deleteTuitionPackage: (packageId: string) => Promise<boolean>;
  logCrmAction: (action: string, details: string, category?: CrmAuditEntry['category']) => void;
  // Boutique Management Methods
  addProduct: (product: Omit<ProductItem, 'id'>) => void;
  updateProduct: (productId: string, updatedFields: Partial<ProductItem>) => void;
  deleteProduct: (productId: string) => void;
  updateProductStock: (productId: string, size: string, newStock: number) => void;
  recordBoutiqueOrder: (order: BoutiqueOrder) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

let audioMutedGlobal = false;
try {
  audioMutedGlobal = typeof window !== 'undefined' && localStorage.getItem('etoile_audio_muted') === 'true';
} catch {}

const playAudioChime = (type: 'success' | 'error' | 'warning') => {
  if (audioMutedGlobal) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      const now = ctx.currentTime;
      [659.25, 830.61, 987.77].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.5);
      });
    } else if (type === 'error') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // browser audio policy
  }
};

/** Map backend AdmissionLead rows to the admin CRM shape (program→programInterest, preferredSlot→trialDate). */
const normalizeLead = (l: any): AdmissionLead => ({
  ...l,
  programInterest: l.programInterest || l.program || 'classical',
  trialDate:
    l.trialDate ||
    (l.preferredSlot
      ? (() => {
          try {
            return new Date(l.preferredSlot).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          } catch {
            return String(l.preferredSlot);
          }
        })()
      : undefined),
});

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {  // Authentication & Staff User state
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    const saved = localStorage.getItem('etoile_admin_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null; // Require login first
  });

  const [userRole, setUserRoleState] = useState<UserRole>(() => currentUser?.role || 'superadmin');
  const [language, setLanguageState] = useState<AppLanguage>('en');

  // Dynamic RBAC — owner-editable page access matrix, persisted locally.
  // Merges stored overrides over DEFAULT_ROLE_CONFIGS so new tabs (profile)
  // are always present even for older saved payloads.
  const [roleConfigs, setRoleConfigs] = useState<Record<UserRole, RoleConfig>>(() => {
    try {
      const raw = localStorage.getItem('etoile_role_permissions');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<UserRole, RoleConfig>;
        const merged = { ...DEFAULT_ROLE_CONFIGS } as Record<UserRole, RoleConfig>;
        (Object.keys(DEFAULT_ROLE_CONFIGS) as UserRole[]).forEach((r) => {
          const stored = parsed?.[r];
          if (stored) {
            const tabs = Array.from(
              new Set([...(stored.allowedTabs || []), ...DEFAULT_ROLE_CONFIGS[r].allowedTabs.filter((t) => t === 'profile')])
            ) as AdminTabId[];
            // Ensure locked profile tab can never be removed
            if (!tabs.includes('profile')) tabs.push('profile');
            merged[r] = {
              ...DEFAULT_ROLE_CONFIGS[r],
              ...stored,
              allowedTabs: tabs,
              defaultTab: tabs.includes(stored.defaultTab) ? stored.defaultTab : DEFAULT_ROLE_CONFIGS[r].defaultTab,
            };
          }
        });
        return merged;
      }
    } catch { /* ignore */ }
    return DEFAULT_ROLE_CONFIGS;
  });

  useEffect(() => {
    try { localStorage.setItem('etoile_role_permissions', JSON.stringify(roleConfigs)); } catch { /* ignore */ }
  }, [roleConfigs]);

  const updateRoleAccess = (role: UserRole, tab: AdminTabId, allowed: boolean) => {
    // Locked tab: profile is mandatory for everyone
    if ((ALL_MODULES.find((m) => m.id === tab)?.locked)) return;
    setRoleConfigs((prev) => {
      const cur = prev[role];
      let nextTabs = allowed
        ? Array.from(new Set([...cur.allowedTabs, tab]))
        : cur.allowedTabs.filter((t) => t !== tab);
      // Guard: each role keeps at least overview + profile; owner/superadmin keep settings+users
      if (nextTabs.length === 0) return prev;
      const mustKeep: AdminTabId[] = ['profile', 'overview'];
      if (role === 'owner' || role === 'superadmin') mustKeep.push('settings', 'users');
      if (!allowed && mustKeep.includes(tab)) {
        return prev;
      }
      // If default tab got revoked, fall back to first allowed
      let defaultTab = cur.defaultTab;
      if (!nextTabs.includes(defaultTab)) defaultTab = nextTabs[0];
      return { ...prev, [role]: { ...cur, allowedTabs: nextTabs, defaultTab } };
    });
  };

  const setRoleDefaultTab = (role: UserRole, tab: AdminTabId) => {
    setRoleConfigs((prev) => {
      const cur = prev[role];
      if (!cur.allowedTabs.includes(tab)) return prev;
      return { ...prev, [role]: { ...cur, defaultTab: tab } };
    });
  };

  const resetRolePermissions = () => {
    setRoleConfigs(DEFAULT_ROLE_CONFIGS);
    try { localStorage.removeItem('etoile_role_permissions'); } catch { /* ignore */ }
  };

  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<BoutiqueOrder[]>(INITIAL_BOUTIQUE_ORDERS);
  const [openWaQueue, setOpenWaQueue] = useState<OpenWaMessage[]>(INITIAL_OPENWA_MESSAGES);
  const [financials, setFinancials] = useState<FinancialMetrics>(INITIAL_FINANCIALS);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [reminderConfig, setReminderConfig] = useState<WhatsAppReminderConfig | null>(null);
  const [whatsAppConfig, setWhatsAppConfig] = useState<WhatsAppGatewayConfig | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('etoile_audio_muted') === 'true';
    } catch {
      return false;
    }
  });

  const toggleAudioMute = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      audioMutedGlobal = next;
      try {
        localStorage.setItem('etoile_audio_muted', String(next));
      } catch {}
      return next;
    });
  };

  // Full CRM state
  const [leads, setLeads] = useState<AdmissionLead[]>(INITIAL_LEADS);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>(INITIAL_NOTES);
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [evaluations, setEvaluations] = useState<SkillEvaluation[]>(INITIAL_EVALUATIONS);
  const [auditLogs, setAuditLogs] = useState<CrmAuditEntry[]>(INITIAL_AUDIT_LOGS);

  // Financial Subsystem State
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [invoices, setInvoices] = useState<InvoiceItem[]>(INITIAL_INVOICES);
  const [payrollSlips, setPayrollSlips] = useState<PayrollSlip[]>(INITIAL_PAYROLL);
  const [journalEntries, setJournalEntries] = useState<JournalVoucher[]>(INITIAL_JOURNAL);
  const [activeDrawerShift, setActiveDrawerShift] = useState<CashDrawerShift | null>(INITIAL_DRAWER_SHIFT);

  // Treasury / Money Accounts — dynamic, persisted locally
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const defaultAccounts: TreasuryAccount[] = [
      { id: 'treas-store', name: 'Store Account (خزينة المتجر والبوتيك)', purpose: 'store' as TreasuryPurpose, openingBalance: 0, notes: 'Boutique & Retail POS sales (Cash & InstaPay)', isActive: true, createdAt: today },
      { id: 'treas-subs', name: 'Subscriptions Account (حساب الاشتراكات والأكاديمية)', purpose: 'subscription' as TreasuryPurpose, openingBalance: 0, notes: 'Tuition, student packages & enrollment (Cash & InstaPay)', isActive: true, createdAt: today },
      { id: 'treas-cash', name: 'General Operations Safe (الخزينة العامة)', purpose: 'general' as TreasuryPurpose, openingBalance: 0, notes: 'Daily operations float & petty expenses', isActive: true, createdAt: today },
    ];
    try {
      const raw = localStorage.getItem('etoile_treasury_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Make sure both 'store' and 'subscription' purposes exist
          const hasStore = parsed.some((a: TreasuryAccount) => a.purpose === 'store');
          const hasSubs = parsed.some((a: TreasuryAccount) => a.purpose === 'subscription');
          let combined = [...parsed];
          if (!hasStore) combined.push(defaultAccounts[0]);
          if (!hasSubs) combined.push(defaultAccounts[1]);
          return combined;
        }
      }
    } catch { /* ignore */ }
    return defaultAccounts;
  });
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>(() => {
    try {
      const raw = localStorage.getItem('etoile_treasury_txns');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem('etoile_treasury_accounts', JSON.stringify(treasuryAccounts)); } catch { /* ignore */ }
  }, [treasuryAccounts]);
  useEffect(() => {
    try { localStorage.setItem('etoile_treasury_txns', JSON.stringify(treasuryTransactions)); } catch { /* ignore */ }
  }, [treasuryTransactions]);

  // Persistent notifications with deduplication (strictly once per event & permanent read-all status)
  const NOTIF_STORAGE_KEY = 'etoile_admin_notifications_v3';
  const READ_EVENTS_KEY = 'etoile_admin_read_events_v3';
  const SEEN_EVENTS_KEY = 'etoile_admin_seen_events_v3';
  const ALL_READ_KEY = 'etoile_admin_all_read_ts_v3';

  const loadAllReadTimestamp = (): number => {
    try {
      const raw = localStorage.getItem(ALL_READ_KEY);
      return raw ? new Date(raw).getTime() : 0;
    } catch {
      return 0;
    }
  };

  const loadReadEvents = (): Set<string> => {
    try {
      const raw = localStorage.getItem(READ_EVENTS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set(['init_kiosk_ready', 'init_quota_watch', 'init_pos_open']);
    } catch {
      return new Set(['init_kiosk_ready', 'init_quota_watch', 'init_pos_open']);
    }
  };

  const loadSeenEvents = (): Set<string> => {
    try {
      const raw = localStorage.getItem(SEEN_EVENTS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set(['init_kiosk_ready', 'init_quota_watch', 'init_pos_open', 'n1', 'n2', 'n3']);
    } catch {
      return new Set(['init_kiosk_ready', 'init_quota_watch', 'init_pos_open', 'n1', 'n2', 'n3']);
    }
  };

  const DEFAULT_ADMIN_NOTIFICATIONS: AdminNotification[] = [
    {
      id: 'n1',
      eventId: 'init_kiosk_ready',
      title: 'Kiosk ready for today',
      titleAr: 'الكشك جاهز لليوم',
      message: 'Scanner + roster synced. Geofence verified for Cairo studios.',
      messageAr: 'تمت مزامنة الماسح والقوائم وتم التحقق من النطاق.',
      time: 'now',
      timestamp: new Date().toISOString(),
      unread: false,
      category: 'attendance',
      severity: 'info',
      linkTab: 'checkin',
    },
    {
      id: 'n2',
      eventId: 'init_quota_watch',
      title: 'Quota watch',
      titleAr: 'مراقبة الحصص',
      message: 'Dancers with ≤2 sessions left need renewal nudges.',
      messageAr: 'راقصون بحصتين أو أقل يحتاجون تذكير تجديد.',
      time: '25m ago',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      unread: false,
      category: 'crm',
      severity: 'warning',
      linkTab: 'subscriptions',
    },
    {
      id: 'n3',
      eventId: 'init_pos_open',
      title: 'Drawer & POS open',
      titleAr: 'الخزينة والمتجر مفتوحان',
      message: 'Boutique register ready for uniforms and pointe shoes.',
      messageAr: 'الخزينة جاهزة لمبيعات الزي والأحذية.',
      time: '1h ago',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      unread: false,
      category: 'finance',
      severity: 'info',
      linkTab: 'pos',
    },
  ];

  const loadSavedNotifications = (): AdminNotification[] => {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
      const allReadTs = loadAllReadTimestamp();
      const readSet = loadReadEvents();

      const items: AdminNotification[] = raw ? JSON.parse(raw) : DEFAULT_ADMIN_NOTIFICATIONS;
      if (!Array.isArray(items) || items.length === 0) return DEFAULT_ADMIN_NOTIFICATIONS;

      return items.map((n) => {
        const itemTs = n.timestamp ? new Date(n.timestamp).getTime() : 0;
        const isRead =
          (allReadTs > 0 && itemTs <= allReadTs) ||
          readSet.has(n.eventId || n.id) ||
          readSet.has(n.id);
        return {
          ...n,
          unread: isRead ? false : Boolean(n.unread),
        };
      });
    } catch {
      return DEFAULT_ADMIN_NOTIFICATIONS;
    }
  };

  const allReadTsRef = useRef<number>(loadAllReadTimestamp());
  const readEventsRef = useRef<Set<string>>(loadReadEvents());
  const seenEventsRef = useRef<Set<string>>(loadSeenEvents());
  const [notifications, setNotifications] = useState<AdminNotification[]>(() => loadSavedNotifications());

  const saveNotifications = (items: AdminNotification[]) => {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
    } catch { /* ignore */ }
  };

  const saveReadEvents = (set: Set<string>) => {
    try {
      localStorage.setItem(READ_EVENTS_KEY, JSON.stringify(Array.from(set).slice(-500)));
    } catch { /* ignore */ }
  };

  const saveSeenEvents = (set: Set<string>) => {
    try {
      localStorage.setItem(SEEN_EVENTS_KEY, JSON.stringify(Array.from(set).slice(-500)));
    } catch { /* ignore */ }
  };

  const addNotification = useCallback((item: {
    id: string;
    eventId?: string;
    title: string;
    titleAr?: string;
    message: string;
    messageAr?: string;
    category?: AdminNotification['category'];
    severity?: AdminNotification['severity'];
    linkTab?: AdminTabId;
    timestamp?: string;
    isRead?: boolean;
  }) => {
    const eventId = item.eventId || item.id;
    const itemTs = item.timestamp ? new Date(item.timestamp).getTime() : Date.now();
    const allReadTs = allReadTsRef.current;

    // Smart semantic fingerprint to avoid local/remote duplication
    const cleanTitle = (item.title || '').trim().toLowerCase();
    const cleanMsgPrefix = (item.message || '').slice(0, 35).trim().toLowerCase();
    const signature = `${item.category || 'system'}_${cleanTitle}_${cleanMsgPrefix}`;

    if (
      seenEventsRef.current.has(eventId) ||
      seenEventsRef.current.has(item.id) ||
      seenEventsRef.current.has(signature)
    ) {
      return; // Strictly once per event!
    }

    seenEventsRef.current.add(eventId);
    seenEventsRef.current.add(item.id);
    seenEventsRef.current.add(signature);
    saveSeenEvents(seenEventsRef.current);

    const isMarkedRead =
      item.isRead === true ||
      (allReadTs > 0 && itemTs <= allReadTs) ||
      readEventsRef.current.has(eventId) ||
      readEventsRef.current.has(item.id);

    const newNotif: AdminNotification = {
      id: item.id,
      eventId,
      title: item.title,
      titleAr: item.titleAr || item.title,
      message: item.message,
      messageAr: item.messageAr || item.message,
      time: 'Just now',
      timestamp: item.timestamp || new Date().toISOString(),
      unread: !isMarkedRead,
      category: item.category || 'system',
      severity: item.severity || 'info',
      linkTab: item.linkTab,
    };

    setNotifications((prev) => {
      // Prevent duplicates in state
      if (
        prev.some(
          (n) =>
            n.id === item.id ||
            n.eventId === eventId ||
            (n.category === item.category &&
              n.title === item.title &&
              Math.abs(new Date(n.timestamp || '').getTime() - itemTs) < 120000)
        )
      ) {
        return prev;
      }
      const updated = [newNotif, ...prev].slice(0, 200);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      const eventId = target?.eventId || id;
      readEventsRef.current.add(eventId);
      readEventsRef.current.add(id);
      saveReadEvents(readEventsRef.current);

      const updated = prev.map((n) =>
        n.id === id || n.eventId === eventId ? { ...n, unread: false } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markNotificationAsUnread = useCallback((id: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      const eventId = target?.eventId || id;
      readEventsRef.current.delete(eventId);
      readEventsRef.current.delete(id);
      saveReadEvents(readEventsRef.current);

      const updated = prev.map((n) =>
        n.id === id || n.eventId === eventId ? { ...n, unread: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    allReadTsRef.current = now;
    try {
      localStorage.setItem(ALL_READ_KEY, nowIso);
    } catch { /* ignore */ }

    setNotifications((prev) => {
      prev.forEach((n) => {
        readEventsRef.current.add(n.eventId || n.id);
        readEventsRef.current.add(n.id);
      });
      saveReadEvents(readEventsRef.current);

      const updated = prev.map((n) => ({ ...n, unread: false }));
      saveNotifications(updated);
      return updated;
    });

    api.post('/api/notifications/read-all', {}).catch(() => {});

    showToast(
      language === 'ar' ? 'تم تعيين الكل كمقروء' : 'All marked as read',
      language === 'ar' ? 'تم تحديث الإشعارات وحفظ الحالة بنجاح.' : 'All notifications marked as read permanently.',
      'success'
    );
  }, [language]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const clearAllReadNotifications = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.unread);
      saveNotifications(updated);
      return updated;
    });
    showToast(
      language === 'ar' ? 'تم تنظيف السجل' : 'Read notifications cleared',
      language === 'ar' ? 'تم حذف الإشعارات المقروءة من السجل' : 'All read items removed from history.',
      'gold'
    );
  }, [language]);

  const unreadNotificationsCount = notifications.filter((n) => n.unread).length;

  // Dynamic Financial Recalculation Engine
  useEffect(() => {
    const totalOPEX = expenses
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + e.totalWithTax, 0);

    const totalPayroll = payrollSlips.reduce((sum, p) => sum + p.totalNetPay, 0);

    const retailMargin = orders.reduce((sum, o: any) => sum + Number(o?.total ?? o?.totalAmount ?? 0), 0);

    const recognizedTuition = students.reduce((sum, s) => {
      if (s.subscription) {
        const used = s.subscription.usedSessions || 0;
        const max = s.subscription.maxSessions || 1;
        return sum + Math.round((s.subscription.price / max) * used);
      }
      return sum;
    }, 0);

    const deferredTuition = students.reduce((sum, s) => {
      if (s.subscription) {
        const used = s.subscription.usedSessions || 0;
        const max = s.subscription.maxSessions || 1;
        const rec = Math.round((s.subscription.price / max) * used);
        return sum + Math.max(0, s.subscription.price - rec);
      }
      return sum;
    }, 0);

    const totalInflow = recognizedTuition + retailMargin;
    const totalOutflow = totalOPEX + totalPayroll;
    const netProfit = totalInflow - totalOutflow;

    setFinancials((prev) => ({
      ...prev,
      operatingExpenses: totalOPEX,
      payrollExpenses: totalPayroll,
      recognizedRevenue: recognizedTuition,
      deferredRevenue: deferredTuition,
      retailGrossMargin: retailMargin,
      totalInflow,
      totalOutflow,
      netProfit,
      mrr: Math.round(recognizedTuition * 1.25),
      cashOnHand: Math.max(0, totalInflow - totalOutflow + (activeDrawerShift?.expectedCash || 0)),
    }));
  }, [expenses, payrollSlips, orders, students, activeDrawerShift]);

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    document.documentElement.removeAttribute('data-theme');
  }, [direction, language]);

  // Central API transport (`api`): attaches the staff token and transparently
  // rotates the session on 401 (see utils/api). Each fetch is isolated so one
  // failure never kills the rest of the sync.
  const safe = async (url: string) => api.get(url).then((r) => r.data).catch(() => null);

  const fetchAllData = async () => {
    try {
      const [
        stuData,
        attData,
        prodData,
        ordData,
        leadData,
        staffData,
        pnlData,
        waData,
        expData,
        invData,
        payData,
        jrnData,
        shiftData,
        crsData,
        sesData,
        remData,
        waStatData,
        notifData,
      ] = await Promise.all([
        safe('/api/students'),
        safe('/api/attendance/logs'),
        safe('/api/pos/products'),
        safe('/api/pos/orders'),
        safe('/api/leads'),
        safe('/api/auth/staff'),
        safe('/api/accounting/pnl'),
        safe('/api/openwa/messages'),
        safe('/api/accounting/expenses'),
        safe('/api/accounting/invoices'),
        safe('/api/accounting/payroll'),
        safe('/api/accounting/journal'),
        safe('/api/accounting/cash-shifts'),
        safe('/api/courses'),
        safe('/api/courses/sessions'),
        safe('/api/courses/reminders/config'),
        safe('/api/openwa/status'),
        safe('/api/notifications/mine'),
      ]);

      if (Array.isArray(stuData) && stuData.length > 0) setStudents(stuData);
      if (Array.isArray(attData)) setAttendanceLogs(attData);
      if (Array.isArray(prodData) && prodData.length > 0) setProducts(prodData);
      if (Array.isArray(ordData)) setOrders(normalizeBoutiqueOrders(ordData));
      if (Array.isArray(leadData)) setLeads(leadData.map(normalizeLead));
      if (Array.isArray(staffData) && staffData.length > 0) {
        const normalized: StaffMember[] = staffData.map((s: any) => ({
            ...s,
            avatar: s.avatar || s.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
            shiftStatus: s.shiftStatus || (s.shiftActive ? 'on_duty' : 'off_shift'),
            studio: s.studio || s.department || 'Operations',
            specialization: s.specialization || s.departmentAr || s.department || 'Ballet Pedagogy',
            permissions: s.permissions || (s.role === 'superadmin' || s.role === 'owner' ? ['all'] : [s.role]),
          }));
          setStaffList(normalized);
      }
      if (pnlData && pnlData.metrics) {
        setFinancials({
          mrr: pnlData.metrics.mrr,
          churnRate: pnlData.metrics.churnRate,
          quotaUtilization: pnlData.metrics.quotaUtilizationRate,
          totalSubscriptionsSold: pnlData.revenue?.totalSubscriptionsSold || 1840,
          recognizedRevenue: pnlData.revenue?.recognizedSubscriptions || 19840,
          deferredRevenue: pnlData.revenue?.deferredRevenue || 4500,
          retailGrossMargin: pnlData.revenue?.retailGrossMargin || 8420,
          payrollExpenses: pnlData.expenses?.payroll || 11200,
          operatingExpenses: pnlData.expenses?.opex || 5400,
          netProfit: pnlData.netProfit || 11660,
        });
      }
      if (Array.isArray(waData)) setOpenWaQueue(waData);
      if (notifData && Array.isArray(notifData.items)) {
        notifData.items.forEach((item: any) => {
          const catMap: Record<string, AdminNotification['category']> = {
            attendance: 'attendance',
            quota: 'crm',
            crm: 'crm',
            invoice: 'finance',
            finance: 'finance',
            message: 'whatsapp',
            session: 'attendance',
            system: 'system',
          };
          const linkMap: Record<string, AdminTabId> = {
            attendance: 'checkin',
            quota: 'subscriptions',
            crm: 'admissions',
            invoice: 'financials',
            finance: 'pos',
            message: 'openwa',
            session: 'schedule',
            system: 'overview',
          };
          addNotification({
            id: item.id,
            eventId: item.id,
            title: item.title,
            titleAr: item.titleAr || item.title,
            message: item.body,
            messageAr: item.body,
            category: catMap[item.kind] || 'system',
            severity: item.severity || 'info',
            linkTab: linkMap[item.kind] || 'overview',
            timestamp: item.createdAt,
            isRead: item.isRead,
          });
        });
      }
      if (Array.isArray(expData) && expData.length > 0) {
        setExpenses(
          expData.map((e: any) => ({
              ...e,
              totalWithTax: e.total ?? e.amount,
              preTaxAmount: e.amount,
              taxAmount: e.vatAmount || 0,
              date: e.date ? e.date.split('T')[0] : new Date().toISOString().split('T')[0],
            }))
          );
      }
      if (Array.isArray(invData) && invData.length > 0) {
        setInvoices(
          invData.map((inv: any) => ({
              ...inv,
              totalAmount: inv.total,
              subtotal: inv.subtotal || inv.total,
              remainingDue: inv.status === 'paid' ? 0 : inv.total,
              paidAmount: inv.status === 'paid' ? inv.total : 0,
              createdAt: inv.createdAt ? inv.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
              dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
            }))
          );
      }
      if (Array.isArray(payData) && payData.length > 0) {
        setPayrollSlips(
          payData.map((p: any) => ({
              id: p.id,
              staffId: p.instructorId,
              staffName: p.instructorName,
              period: p.month || 'September 2026',
              periodMonth: p.month,
              role: p.role || 'Faculty Instructor',
              baseSalary: p.baseSalary || 0,
              hourlyRate: p.hourlyRate || 0,
              classesTaught: p.hoursTaught || 0,
              classHourlyPay: (p.hourlyRate || 0) * (p.hoursTaught || 0),
              privateLessonsTaught: p.privateSessionsCount || 0,
              privateLessonCut: (p.privateSessionsCount || 0) * (p.privateSessionRate || 0),
              bonusAmount: p.bonuses || 0,
              deductionAmount: p.deductions || 0,
              totalGrossPay: p.netPayable,
              totalNetPay: p.netPayable,
              status: p.status || 'pending',
              paymentMethod: 'bank_transfer',
              paidAt: p.paidAt ? p.paidAt.split('T')[0] : undefined,
              notes: p.notes,
            }))
          );
      }
      if (Array.isArray(jrnData) && jrnData.length > 0) {
        setJournalEntries(
          jrnData.map((j: any) => ({
              id: j.id,
              entryNumber: j.voucherNumber,
              date: j.date ? j.date.split('T')[0] : new Date().toISOString().split('T')[0],
              memo: j.memo,
              totalDebit: j.totalDebit,
              totalCredit: j.totalCredit,
              isManual: true,
              createdByName: j.postedBy,
              lines: j.lines || [],
            }))
          );
      }
      if (Array.isArray(shiftData) && shiftData.length > 0) {
        const openShift = shiftData.find((s: any) => s.status === 'open') || shiftData[0];
        setActiveDrawerShift({
          id: openShift.id,
          staffName: openShift.cashierName,
          startTime: openShift.startTime ? openShift.startTime.split('T')[1]?.substring(0, 5) : '09:00',
          openingFloat: openShift.openingFloat,
          cashSalesTotal: openShift.cashSalesTotal || 0,
          cashPayoutsTotal: openShift.cashDrops || 0,
          expectedCash: openShift.expectedCash,
          status: openShift.status,
          notes: openShift.notes,
        });
      }
      if (Array.isArray(crsData)) setCourses(crsData);
      if (Array.isArray(sesData)) setCourseSessions(sesData);
      if (remData) setReminderConfig(remData);
      if (waStatData) setWhatsAppConfig(waStatData);
    } catch (err) {
      console.warn('API synchronization offline, running on local cache:', err);
    }
  };

  useEffect(() => {
    validateStoredSession();
    fetchAllData();
    const stopSilentRefresh = startSilentRefresh();
    return stopSilentRefresh;
  }, []);

  // Revalidate a restored localStorage session against the API (transparently
  // rotating it first if the access token expired). Dead or forged sessions
  // (still 401/403 afterwards) are dropped; unreachable backends keep the
  // cached session so the reception desk stays usable offline.
  const validateStoredSession = async () => {
    const savedUser = localStorage.getItem('etoile_admin_user');
    const token = localStorage.getItem('etoile_jwt_token');
    if (!savedUser || !token) return;
    try {
      await api.get('/api/auth/me');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        setCurrentUser(null);
        localStorage.removeItem('etoile_admin_user');
        revokeSession().catch(() => {});
        showToast('Session Expired', 'Your saved staff session is no longer valid. Please sign in again.', 'warning');
      }
      // offline (no response) — keep cached session
    }
  };

  const createCourse = async (data: any) => {
    try {
      const { data: created } = await api.post('/api/courses', data);
      setCourses((prev) => [created, ...prev]);
      showToast('Course Created', `${created.title} added to curriculum.`, 'success');
      return created;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to create course.'), 'error');
    }
    return null;
  };

  const updateCourse = async (id: string, data: any) => {
    try {
      const { data: updated } = await api.patch(`/api/courses/${id}`, data);
      setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast('Course Updated', `${updated.title} updated successfully.`, 'gold');
      return updated;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to update course.'), 'error');
    }
    return null;
  };

  const deleteCourse = async (id: string) => {
    try {
      await api.delete(`/api/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      showToast('Course Deleted', 'Course removed from academy registry.', 'gold');
      return true;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to delete course.'), 'error');
    }
    return false;
  };

  const enrollStudentInCourse = async (courseId: string, studentId: string) => {
    try {
      await api.post(`/api/courses/${courseId}/enroll`, { studentId });
      try {
        const { data: updatedCourse } = await api.get(`/api/courses/${courseId}`);
        if (updatedCourse) setCourses((prev) => prev.map((c) => (c.id === courseId ? updatedCourse : c)));
      } catch {
        // roster refresh is best-effort
      }
      showToast('Student Enrolled', 'Student added to class roster.', 'success');
      return true;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to enroll student.'), 'error');
    }
    return false;
  };

  const unenrollStudentFromCourse = async (courseId: string, studentId: string) => {
    try {
      await api.delete(`/api/courses/${courseId}/enroll/${studentId}`);
      try {
        const { data: updatedCourse } = await api.get(`/api/courses/${courseId}`);
        if (updatedCourse) setCourses((prev) => prev.map((c) => (c.id === courseId ? updatedCourse : c)));
      } catch {
        // roster refresh is best-effort
      }
      showToast('Student Unenrolled', 'Student dropped from class roster.', 'gold');
      return true;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to unenroll student.'), 'error');
    }
    return false;
  };

  const createCourseSession = async (data: any) => {
    try {
      const { data: created } = await api.post(`/api/courses/${data.courseId}/sessions`, data);
      setCourseSessions((prev) => [...prev, created]);
      showToast('Session Scheduled', `${created.title} added to calendar.`, 'success');
      return created;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to schedule session.'), 'error');
    }
    return null;
  };

  const deleteCourseSession = async (sessionId: string) => {
    try {
      await api.delete(`/api/courses/sessions/${sessionId}`);
      setCourseSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast('Session Deleted', 'Session removed from schedule.', 'gold');
      return true;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to delete session.'), 'error');
    }
    return false;
  };

  const sendCourseSessionReminder = async (sessionId: string) => {
    try {
      const { data } = await api.post(`/api/courses/sessions/${sessionId}/send-reminder`, {});
      setCourseSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, reminderSent: true } : s))
      );
      try {
        const { data: waQueue } = await api.get('/api/openwa/messages');
        if (Array.isArray(waQueue)) setOpenWaQueue(waQueue);
      } catch {
        // queue refresh is best-effort
      }
      showToast(
        'WhatsApp Dispatched',
        `Dispatched pre-session WhatsApp notifications (${data.messagesDispatched} messages).`,
        'success'
      );
      return data;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to send WhatsApp reminder.'), 'error');
    }
    return null;
  };

  const updateReminderConfig = async (data: any) => {
    try {
      const { data: updated } = await api.patch('/api/courses/reminders/config', data);
      setReminderConfig(updated);
      showToast('Settings Updated', 'Dynamic reminder settings saved.', 'gold');
      return updated;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to update reminder settings.'), 'error');
    }
    return null;
  };

  const connectWhatsApp = async (mode: 'builtin_qr' | 'external_gateway' = 'builtin_qr') => {
    try {
      const { data } = await api.post('/api/openwa/connect', { mode });
      setWhatsAppConfig((prev) => ({
        ...(prev || { id: 'default', mode }),
        status: 'pairing',
        qrCodeData: data.qrCodeData,
      }));
      showToast('WhatsApp Pairing Started', 'Scan QR code with your phone to link session.', 'gold');
      return data;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to initialize WhatsApp pairing.'), 'error');
    }
    return null;
  };

  const confirmWhatsAppPairing = async (phoneNumber?: string, pushName?: string) => {
    try {
      const { data } = await api.post('/api/openwa/pair-confirm', { phoneNumber, pushName });
      setWhatsAppConfig((prev) => ({
        ...(prev || { id: 'default', mode: 'builtin_qr' }),
        status: 'connected',
        phoneNumber: data.phoneNumber,
        pushName: data.pushName,
        qrCodeData: null,
      }));
      showToast('WhatsApp Linked', `Active session connected for ${data.phoneNumber}.`, 'success');
      return data;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to confirm WhatsApp pairing.'), 'error');
    }
    return null;
  };

  const disconnectWhatsApp = async () => {
    try {
      await api.post('/api/openwa/disconnect', {});
      setWhatsAppConfig((prev) => ({
        ...(prev || { id: 'default', mode: 'builtin_qr' }),
        status: 'disconnected',
        qrCodeData: null,
      }));
      showToast('WhatsApp Unlinked', 'Session disconnected.', 'gold');
      return true;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to disconnect WhatsApp.'), 'error');
    }
    return false;
  };

  const updateWhatsAppGateway = async (config: any) => {
    try {
      const { data } = await api.patch('/api/openwa/gateway-config', config);
      setWhatsAppConfig(data);
      showToast('Gateway Config Saved', 'Open-source gateway settings updated.', 'gold');
      return data;
    } catch (e) {
      showToast('Error', errMsg(e, 'Failed to save gateway config.'), 'error');
    }
    return null;
  };

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    const matchingStaff = staffList.find((s) => s.role === role) || {
      ...staffList[0],
      role,
    };
    setCurrentUser(matchingStaff);
    localStorage.setItem('etoile_admin_user', JSON.stringify(matchingStaff));
    logCrmAction('Role Switched', `Active session governance role switched to ${role.toUpperCase()}`, 'auth');
  };

  const login = async (identifier: string, password?: string): Promise<boolean> => {
    const cleanId = identifier.trim().toLowerCase();
    const pass = password || 'etoile2026';

    try {
      // Auth endpoints use the raw client (no token attach, no refresh loop).
      const { data } = await rawApi.post('/api/auth/login', { identifier: cleanId, password: pass });

      if (data?.user) {
        const normalizedUser: StaffMember = {
          ...data.user,
          avatar: data.user.avatar || data.user.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
          shiftStatus: data.user.shiftActive ? 'on_duty' : 'off_shift',
          studio: data.user.department || 'Operations',
          specialization: data.user.departmentAr || data.user.department || 'Ballet Pedagogy',
        };
        setCurrentUser(normalizedUser);
        setUserRoleState(normalizedUser.role);
        localStorage.setItem('etoile_admin_user', JSON.stringify(normalizedUser));
        setSessionTokens(data.access_token, data.refresh_token);
        playAudioChime('success');
        showToast('Welcome to Étoile CRM', `Authenticated as ${normalizedUser.name} (${normalizedUser.role.toUpperCase()}).`, 'success');
        logCrmAction('Station Login', `${normalizedUser.name} logged into Admin Station`, 'auth');
        return true;
      }
    } catch {
      // server error / offline
    }

    playAudioChime('error');
    showToast('Authentication Failed', 'Invalid staff credentials. Please check your email and password.', 'error');
    return false;
  };

  const logout = () => {
    logCrmAction('Station Logout', `${currentUser?.name || 'Staff'} logged out of station`, 'auth');
    setCurrentUser(null);
    localStorage.removeItem('etoile_admin_user');
    // Best-effort server revocation of the refresh token, then local cleanup.
    revokeSession().catch(() => {});
    showToast('Station Locked', 'Staff logged out successfully.', 'gold');
  };

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    showToast(
      lang === 'ar' ? 'تم تغيير لغة الإدارة إلى العربية' : 'Admin language set to English',
      lang === 'ar' ? 'تم تفعيل التخطيط العربي ثنائي الاتجاه' : 'Dual-directional LTR interface activated',
      'gold'
    );
  };

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error' | 'gold' = 'gold',
    options?: { duration?: number; actions?: ToastAction[] }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duration = options?.duration !== undefined ? options.duration : 4500;
    setToasts((prev) => [...prev, { id, title, message, type, actions: options?.actions, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  };

  const showConfirmNotification = (options: ConfirmNotificationOptions) => {
    const id = `confirm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duration = options.duration !== undefined ? options.duration : 12000;
    playAudioChime('warning');

    const handleConfirm = () => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      options.onConfirm();
    };

    const handleCancel = () => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      options.onCancel?.();
    };

    const confirmAction: ToastAction = {
      label: options.confirmLabel || (language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'),
      onClick: handleConfirm,
      variant: options.type === 'gold' ? 'gold' : options.type === 'warning' ? 'gold' : 'danger',
      icon: 'trash',
    };

    const cancelAction: ToastAction = {
      label: options.cancelLabel || (language === 'ar' ? 'إلغاء' : 'Cancel'),
      onClick: handleCancel,
      variant: 'secondary',
      icon: 'x',
    };

    const toastItem: ToastData = {
      id,
      title: options.title || (language === 'ar' ? 'تأكيد الحذف' : 'Confirm Action'),
      message: options.message,
      type: options.type || 'error',
      actions: [cancelAction, confirmAction],
      duration,
      onDismiss: handleCancel,
    };

    // Keep only 1 active confirmation card in view to prevent stacking
    setToasts((prev) => [...prev.filter((t) => !t.id.startsWith('confirm-')), toastItem]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const logCrmAction = (action: string, details: string, category: CrmAuditEntry['category'] = 'student') => {
    const newEntry: CrmAuditEntry = {
      id: `AUD-${Date.now()}`,
      actorName: currentUser?.name || 'Director Elena Rostova',
      actorRole: currentUser?.role ? currentUser.role.toUpperCase() : 'SUPERADMIN',
      action,
      details,
      timestamp: 'Just now',
      category,
    };
    setAuditLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
  };

  const checkInStudent = (barcode: string, method: 'hid_barcode' | 'qr_camera' | 'manual' = 'hid_barcode') => {
    const cleanCode = barcode.trim().toUpperCase();
    const student = students.find((s) => s.barcode.toUpperCase() === cleanCode || s.id.toUpperCase() === cleanCode);

    if (!student) {
      playAudioChime('error');
      showToast('Scan Rejected', `Barcode ${cleanCode} does not match any registered student.`, 'error');
      return { success: false, reason: 'Unknown student barcode' };
    }

    const sub = student.subscription;
    const now = new Date();
    const expDate = new Date(sub.endDate);

    if (now > expDate) {
      playAudioChime('error');
      showToast(
        'Check-in Denied: Plan Expired',
        `${student.name}'s plan expired on ${sub.endDate}. Renewal required.`,
        'error'
      );
      triggerOpenWaAlert(
        'quota_warning',
        student.parentPhone,
        student.parentName,
        `Hello ${student.parentName}, ${student.name}'s ballet plan has expired. Please visit reception to renew.`
      );
      return { success: false, student, reason: 'Subscription expired by date' };
    }

    if (sub.usedSessions >= sub.maxSessions) {
      playAudioChime('error');
      showToast(
        'Check-in Denied: Quota Exhausted',
        `${student.name} has consumed all ${sub.maxSessions} sessions for this billing cycle.`,
        'error'
      );
      triggerOpenWaAlert(
        'quota_warning',
        student.parentPhone,
        student.parentName,
        `Hello ${student.parentName}, ${student.name} has used all ${sub.maxSessions} sessions. Quota renewal needed.`
      );
      return { success: false, student, reason: 'Session quota exhausted' };
    }

    const updatedSessions = sub.usedSessions + 1;
    const remaining = sub.maxSessions - updatedSessions;

    // Dispatch to real PostgreSQL backend API
    api.post('/api/attendance/checkin', { barcode: cleanCode, method })
      .then((res) => {
        const result = res.data;
        if (result?.record) {
          setAttendanceLogs((prev) => [result.record, ...prev.filter((r) => r.id !== result.record.id)]);
        }
        api.get('/api/students')
          .then((r) => {
            const data = r.data;
            if (Array.isArray(data) && data.length > 0) setStudents(data);
          })
          .catch(() => {});
      })
      .catch(() => {});

    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? {
              ...s,
              subscription: {
                ...s.subscription,
                usedSessions: updatedSessions,
              },
            }
          : s
      )
    );

    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      barcode: student.barcode,
      timestamp: 'Just now',
      classTitle:
        student.program === 'classical'
          ? 'Conservatory Classical Pointe'
          : student.program === 'contemporary'
          ? 'Contemporary Floorwork & Gaga'
          : 'Youth Division Allegro',
      verifiedMethod: method,
      premiseVerified: true,
      wifiBssid: 'Etoile-Secure-5G [F4:92:BF:11:80:A2]',
      status: 'granted',
      quotaRemaining: remaining,
    };

    setAttendanceLogs((prev) => [newRecord, ...prev]);
    playAudioChime('success');

    addNotification({
      id: `att_${newRecord.id}`,
      eventId: `att_${newRecord.id}`,
      title: `Check-in: ${student.name}`,
      titleAr: `تسجيل حضور: ${student.name}`,
      message: `${student.name} checked in to ${newRecord.classTitle}. Remaining: ${remaining} / ${sub.maxSessions}.`,
      messageAr: `تم تسجيل حضور ${student.name} لحصة ${newRecord.classTitle}. المتبقي: ${remaining} من ${sub.maxSessions}.`,
      category: 'attendance',
      severity: 'info',
      linkTab: 'checkin',
    });

    showToast(
      'Check-in Authorized',
      `${student.name} verified. Remaining sessions: ${remaining} / ${sub.maxSessions}.`,
      'success'
    );

    logCrmAction('Student Check-In', `${student.name} checked in via ${method}. Quota remaining: ${remaining}`, 'student');

    if (remaining <= 2) {
      triggerOpenWaAlert(
        'quota_warning',
        student.parentPhone,
        student.parentName,
        `Attention ${student.parentName}: ${student.name} has only ${remaining} session(s) left on plan.`
      );
    }

    return { success: true, student, record: newRecord };
  };

  const addToCart = (product: ProductItem, size: string, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.size === size);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, size, quantity }];
    });
    showToast('Added to Cart', `${product.title} (${size}) added.`, 'gold');
  };

  const updateCartQuantity = (productId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.size === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.size === size)));
  };

  const clearCart = () => setCart([]);

  const checkoutCart = (
    paymentMethod: 'cash' | 'instapay' | 'card' | 'transfer' | 'wallet_debt',
    targetStudentId?: string,
    customerPhone?: string,
    customerName?: string
  ) => {
    if (cart.length === 0) return { success: false, error: 'Cart is empty' };

    const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const student = targetStudentId ? students.find((s) => s.id === targetStudentId) : undefined;
    const targetPhone = student?.parentPhone || customerPhone?.trim();
    const customerDisplayName = student?.name || customerName || (paymentMethod === 'wallet_debt' ? 'Enrolled Dancer' : 'Walk-in Patron');
    const targetRecipientName = student?.parentName || student?.name || customerName || (paymentMethod === 'wallet_debt' ? 'Enrolled Dancer' : 'Valued Patron');

    if (paymentMethod === 'wallet_debt') {
      if (!student) {
        showToast('Error', 'Please select a student account to charge on credit.', 'error');
        return { success: false, error: 'Student required for debt charge' };
      }

      const projectedBalance = student.walletBalance - totalAmount;
      if (projectedBalance < -student.maxNegativeDebt) {
        showToast(
          'Debt Limit Exceeded',
          `Cannot complete: ${student.name} maximum credit threshold is -${formatCurrency(student.maxNegativeDebt, language)}. Projected balance: -${formatCurrency(Math.abs(projectedBalance), language)}.`,
          'error'
        );
        return { success: false, error: 'Debt limit exceeded' };
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? {
                ...s,
                walletBalance: s.walletBalance - totalAmount,
              }
            : s
        )
      );

      triggerOpenWaAlert(
        'debt_reminder',
        student.parentPhone,
        student.parentName,
        `Étoile Store: Purchase of ${formatCurrency(totalAmount, language)} charged to ${student.name}'s account. Current outstanding ledger balance: ${formatCurrency(projectedBalance, language)}.`
      );

      showToast(
        'Charged to Negative Wallet',
        `${formatCurrency(totalAmount, language)} charged to ${student.name}. New ledger balance: ${formatCurrency(projectedBalance, language)}.`,
        'warning'
      );

      logCrmAction('POS Wallet Debt Charge', `Charged ${formatCurrency(totalAmount, 'en')} to ${student.name}'s ledger`, 'financial');
    } else {
      showToast(
        'Payment Complete',
        `Processed ${formatCurrency(totalAmount, language)} via ${paymentMethod === 'instapay' ? 'INSTAPAY' : paymentMethod.toUpperCase()}.${targetPhone ? ' WhatsApp receipt sent.' : ''}`,
        'success'
      );
      logCrmAction('POS Direct Sale', `Processed ${formatCurrency(totalAmount, 'en')} checkout via ${paymentMethod.toUpperCase()}`, 'financial');
    }

    const now = new Date();
    const newOrder: BoutiqueOrder = {
      id: `REC-${Date.now().toString().slice(-6)}`,
      studentId: targetStudentId,
      studentName: student?.name,
      customerName: customerDisplayName,
      items: [...cart],
      subtotal: totalAmount,
      total: totalAmount,
      paymentMethod,
      date: now.toISOString().split('T')[0],
      timestamp: now.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'completed',
      processedBy: currentUser?.name || 'Staff Reception',
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Auto-credit Store Treasury Account (Boutique Safe) for Cash & InstaPay
    if (paymentMethod === 'cash' || paymentMethod === 'instapay') {
      const storeAccount = treasuryAccounts.find((a) => a.purpose === 'store') || treasuryAccounts[0];
      if (storeAccount) {
        const storeTxn: TreasuryTransaction = {
          id: `txn-${Date.now().toString(36)}-pos`,
          accountId: storeAccount.id,
          kind: 'deposit',
          source: 'store_sales',
          amount: totalAmount,
          description: `POS Order #${newOrder.id} - ${customerDisplayName} (${paymentMethod === 'instapay' ? 'InstaPay' : 'Cash'})`,
          date: now.toISOString().split('T')[0],
          paymentMethod,
          createdBy: currentUser?.name || 'Staff Reception',
        };
        setTreasuryTransactions((prev) => [storeTxn, ...prev]);
      }

      if (paymentMethod === 'cash' && activeDrawerShift) {
        setActiveDrawerShift((prev) =>
          prev
            ? {
                ...prev,
                cashSalesTotal: prev.cashSalesTotal + totalAmount,
                expectedCash: prev.expectedCash + totalAmount,
              }
            : null
        );
      }
    }

    // Send itemized WhatsApp purchase receipt to the customer / parent whenever a phone number is available
    if (targetPhone) {
      const itemLines = cart
        .map((i) => `• ${i.product.title} (${i.size}) ×${i.quantity} — EGP ${(i.product.price * i.quantity).toFixed(2)}`)
        .join('\n');

      const receiptBody =
        `🧾 *Étoile Ballet Academy — Purchase Receipt*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📋 *Order:* #${newOrder.id}\n` +
        `👤 *Customer:* ${customerDisplayName}\n` +
        `📅 *Date:* ${now.toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n` +
        `🛍️ *Items:*\n${itemLines}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 *Total:* EGP ${totalAmount.toFixed(2)}\n` +
        `💳 *Payment:* ${paymentMethod.toUpperCase()}${paymentMethod === 'wallet_debt' ? ' (Charged to Account)' : ''}\n` +
        `✅ *Status:* Confirmed & Paid\n\n` +
        `Thank you for shopping at Étoile Boutique! 🌟\n` +
        `شكراً لتسوقكم في بوتيك إيتوال! 🌟`;

      triggerOpenWaAlert(
        'purchase_receipt',
        targetPhone,
        targetRecipientName,
        receiptBody
      );
    }

    addNotification({
      id: `order_${newOrder.id}`,
      eventId: `order_${newOrder.id}`,
      title: `Boutique POS Sale #${newOrder.id}`,
      titleAr: `عملية بيع في المتجر #${newOrder.id}`,
      message: `Sale completed: EGP ${totalAmount} (${paymentMethod}) by ${customerDisplayName}.${targetPhone ? ` WhatsApp receipt dispatched to ${targetPhone}.` : ''}`,
      messageAr: `تمت عملية البيع بقيمة ${totalAmount} ج.م (${paymentMethod}) للعميل ${customerDisplayName}.${targetPhone ? ` تم إرسال الإيصال عبر واتساب إلى ${targetPhone}.` : ''}`,
      category: 'finance',
      severity: 'success',
      linkTab: 'pos',
    });

    // Dispatch to real PostgreSQL backend API
    api.post('/api/pos/checkout', {
      items: cart.map((i) => ({
        productId: i.product.id,
        title: i.product.title,
        size: i.size,
        quantity: i.quantity,
        price: i.product.price,
      })),
      paymentMethod,
      studentId: targetStudentId,
      customerName: customerDisplayName,
      customerPhone: targetPhone,
    })
      .then(() => {
        api.get('/api/pos/products').then((r) => setProducts(r.data)).catch(() => {});
        api.get('/api/pos/orders').then((r) => { const d = r.data; if (Array.isArray(d)) setOrders(normalizeBoutiqueOrders(d)); }).catch(() => {});
        api.get('/api/students').then((r) => setStudents(r.data)).catch(() => {});
      })
      .catch(() => {});

    // Decrement stock for purchased items
    setProducts((prev) =>
      prev.map((prod) => {
        const cartMatches = cart.filter((c) => c.product.id === prod.id);
        if (cartMatches.length === 0) return prod;
        return {
          ...prod,
          variants: prod.variants.map((variant) => {
            const match = cartMatches.find((c) => c.size === variant.size);
            if (!match) return variant;
            return {
              ...variant,
              stock: Math.max(0, variant.stock - match.quantity),
            };
          }),
        };
      })
    );

    setFinancials((prev) => ({
      ...prev,
      retailGrossMargin: prev.retailGrossMargin + totalAmount * 0.45,
      netProfit: prev.netProfit + totalAmount * 0.45,
    }));

    clearCart();
    return { success: true, order: newOrder };
  };

  const recordBoutiqueOrder = (order: BoutiqueOrder) => {
    setOrders((prev) => [normalizeBoutiqueOrder(order as any), ...prev]);
  };

  const addProduct = (productData: Omit<ProductItem, 'id'>) => {
    const newId = `PROD-${Date.now().toString().slice(-4)}`;
    const newProd: ProductItem = {
      ...productData,
      id: newId,
    };
    setProducts((prev) => [newProd, ...prev]);

    api.post('/api/pos/products', productData)
      .then(() => {
        api.get('/api/pos/products').then((r) => setProducts(r.data)).catch(() => {});
      })
      .catch(() => {});

    showToast('Item Added to Store', `${newProd.title} registered in inventory.`, 'success');
    logCrmAction('Store Product Added', `Added ${newProd.title} (${newProd.sku}) to catalog`, 'financial');
  };

  const updateProduct = (productId: string, updatedFields: Partial<ProductItem>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updatedFields } : p))
    );

    api.patch(`/api/pos/products/${productId}`, updatedFields).catch(() => {});

    showToast('Inventory Updated', 'Product details saved successfully.', 'gold');
    logCrmAction('Store Product Updated', `Updated catalog product ${productId}`, 'financial');
  };

  const deleteProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    api.delete(`/api/pos/products/${productId}`).catch(() => {});

    showToast('Product Removed', `${prod?.title || 'Item'} archived from store catalog.`, 'gold');
    logCrmAction('Boutique Product Deleted', `Removed item ${prod?.title || productId}`, 'financial');
  };

  const updateProductStock = (productId: string, size: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          variants: p.variants.map((v) => (v.size === size ? { ...v, stock: Math.max(0, newStock) } : v)),
        };
      })
    );

    api.patch(`/api/pos/products/${productId}/stock`, { size, stock: newStock }).catch(() => {});

    showToast('Stock Adjusted', `Inventory count updated for ${size}.`, 'gold');
  };

  const triggerOpenWaAlert = (
    event: OpenWaMessage['triggerEvent'],
    recipientPhone: string,
    recipientName: string,
    customBody?: string
  ) => {
    const newMessage: OpenWaMessage = {
      id: `WA-${Date.now()}`,
      recipientPhone,
      recipientName,
      triggerEvent: event,
      language,
      body: customBody || `Automated alert regarding Étoile Academy account for ${recipientName}.`,
      timestamp: 'Just now',
      status: 'dispatched',
    };
    setOpenWaQueue((prev) => [newMessage, ...prev]);

    addNotification({
      id: `wa_${newMessage.id}`,
      eventId: `wa_${newMessage.id}`,
      title: `WhatsApp: ${event.replace(/_/g, ' ')}`,
      titleAr: `واتساب: ${recipientName}`,
      message: `Alert to ${recipientName} (${recipientPhone}): ${newMessage.body.slice(0, 90)}...`,
      messageAr: `تم إرسال رسالة إلى ${recipientName} (${recipientPhone}): ${newMessage.body.slice(0, 90)}...`,
      category: 'whatsapp',
      severity: 'info',
      linkTab: 'openwa',
    });

    api.post('/api/openwa/webhook', {
      triggerEvent: event,
      recipientPhone,
      recipientName,
      customBody,
    })
      .then(() => {
        api.get('/api/openwa/messages').then((r) => setOpenWaQueue(r.data)).catch(() => {});
      })
      .catch(() => {});

    logCrmAction('WhatsApp Dispatch', `Alert sent to ${recipientName} (${recipientPhone}): ${event}`, 'student');
  };

  const settleStudentDebt = (studentId: string, amount: number) => {
    const student = students.find((s) => s.id === studentId);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              walletBalance: s.walletBalance + amount,
            }
          : s
      )
    );

    if (activeDrawerShift) {
      setActiveDrawerShift((prev) =>
        prev
          ? {
              ...prev,
              cashSalesTotal: prev.cashSalesTotal + amount,
              expectedCash: prev.expectedCash + amount,
            }
          : null
      );
    }

    api.patch(`/api/students/${studentId}/wallet`, { amount })
      .then(() => {
        api.get('/api/students').then((r) => setStudents(r.data)).catch(() => {});
      })
      .catch(() => {});

    showToast(
      language === 'ar' ? 'تم تحصيل الدفعة' : 'Payment Received',
      language === 'ar'
        ? `تم إيداع ${formatCurrency(amount, 'ar')} بنجاح في حساب الطالب.`
        : `Payment of ${formatCurrency(amount, 'en')} credited to student account.`,
      'gold'
    );
    logCrmAction('Debt Settle', `Applied ${formatCurrency(amount, 'en')} debt payment to ${student?.name || studentId}`, 'financial');
  };

  // Financial Subsystem Methods
  const addExpense = (expenseData: Omit<ExpenseItem, 'id' | 'expenseNumber'>) => {
    const expenseNum = `EXP-2026-${String(expenses.length + 1).padStart(3, '0')}`;
    const newExpense: ExpenseItem = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseNumber: expenseNum,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    api.post('/api/accounting/expenses', {
      expenseNumber: expenseNum,
      category: expenseData.category,
      description: expenseData.description,
      amount: (expenseData as any).preTaxAmount ?? expenseData.amount,
      vatAmount: expenseData.taxAmount,
      total: expenseData.totalWithTax,
      vendor: (expenseData as any).vendor || expenseData.vendorName,
      paymentMethod: expenseData.paymentMethod,
      approvedBy: currentUser?.name || 'Finance Director',
    })
      .then((res) => {
        const created = res.data;
        if (created?.id) {
          setExpenses((prev) =>
            prev.map((e) =>
              e.expenseNumber === expenseNum
                ? {
                    ...e,
                    id: created.id,
                  }
                : e
            )
          );
        }
      })
      .catch(() => {});

    if (expenseData.paymentMethod === 'cash_drawer' && activeDrawerShift) {
      setActiveDrawerShift((prev) =>
        prev
          ? {
              ...prev,
              cashPayoutsTotal: prev.cashPayoutsTotal + expenseData.totalWithTax,
              expectedCash: Math.max(0, prev.expectedCash - expenseData.totalWithTax),
            }
          : null
      );
    }

    showToast(
      language === 'ar' ? 'تم تسجيل المصروف' : 'Expense Recorded',
      language === 'ar'
        ? `تم قيد المصروف ${newExpense.expenseNumber} بمبلغ ${formatCurrency(newExpense.totalWithTax, 'ar')}.`
        : `Expense ${newExpense.expenseNumber} recorded for ${formatCurrency(newExpense.totalWithTax, 'en')}.`,
      'gold'
    );
    logCrmAction('New Expense', `Recorded expense ${expenseNum} - ${newExpense.description} (${formatCurrency(newExpense.totalWithTax, 'en')})`, 'financial');
  };

  const deleteExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    api.delete(`/api/accounting/expenses/${id}`).catch(() => {});

    showToast(
      language === 'ar' ? 'تم حذف المصروف' : 'Expense Deleted',
      language === 'ar' ? 'تم إلغاء قيد المصروف بنجاح.' : 'Expense entry removed successfully.',
      'warning'
    );
    if (exp) {
      logCrmAction('Delete Expense', `Removed expense ${exp.expenseNumber}`, 'financial');
    }
  };

  const createManualInvoice = (invoiceData: {
    studentId?: string;
    studentName?: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    type: 'tuition' | 'boutique' | 'private_lesson' | 'custom';
    items: { description: string; quantity: number; unitPrice: number }[];
    discountAmount?: number;
    taxAmount?: number;
    dueDate?: string;
    notes?: string;
  }): InvoiceItem => {
    const invNumber = `INV-2026-${String(invoices.length + 101).padStart(3, '0')}`;
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = invoiceData.discountAmount || 0;
    const tax = invoiceData.taxAmount || 0;
    const total = Math.max(0, subtotal - discount + tax);

    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      studentId: invoiceData.studentId,
      studentName: invoiceData.studentName,
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone,
      customerEmail: invoiceData.customerEmail,
      type: invoiceData.type,
      subtotal,
      discountAmount: discount,
      taxAmount: tax,
      totalAmount: total,
      paidAmount: 0,
      remainingDue: total,
      status: 'unpaid',
      dueDate: invoiceData.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      notes: invoiceData.notes,
      items: invoiceData.items.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      })),
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    api.post('/api/accounting/invoices', {
      invoiceNumber: invNumber,
      customerName: invoiceData.customerName,
      parentPhone: invoiceData.customerPhone,
      parentEmail: invoiceData.customerEmail,
      studentId: invoiceData.studentId,
      subtotal,
      total,
      status: 'unpaid',
      paymentTerms: invoiceData.notes || 'Net 14',
      items: invoiceData.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      })),
    })
      .then((res) => {
        const created = res.data;
        if (created?.id) {
          setInvoices((prev) =>
            prev.map((i) => (i.invoiceNumber === invNumber ? { ...i, id: created.id } : i))
          );
        }
      })
      .catch(() => {});

    showToast(
      language === 'ar' ? 'تم إنشاء الفاتورة' : 'Invoice Created',
      language === 'ar'
        ? `تم إصدار الفاتورة رقم ${invNumber} بإجمالي ${formatCurrency(total, 'ar')}.`
        : `Invoice ${invNumber} generated for ${formatCurrency(total, 'en')}.`,
      'gold'
    );
    logCrmAction('New Invoice', `Generated invoice ${invNumber} for ${newInvoice.customerName}`, 'financial');
    return newInvoice;
  };

  const recordManualPayment = (payment: {
    invoiceId?: string;
    studentId?: string;
    studentName?: string;
    amount: number;
    method: 'cash' | 'instapay' | 'card' | 'bank_transfer' | 'wallet_debt';
    referenceNo?: string;
    receiptUrl?: string;
    notes?: string;
  }) => {
    if (payment.invoiceId) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === payment.invoiceId) {
            const newPaid = inv.paidAmount + payment.amount;
            const newRemaining = Math.max(0, inv.totalAmount - newPaid);
            const newStatus = newRemaining === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
            return {
              ...inv,
              paidAmount: newPaid,
              remainingDue: newRemaining,
              status: newStatus,
            };
          }
          return inv;
        })
      );
    }

    if (payment.studentId) {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === payment.studentId
            ? { ...s, walletBalance: s.walletBalance + payment.amount }
            : s
        )
      );
    }

    if (payment.method === 'cash' && activeDrawerShift) {
      setActiveDrawerShift((prev) =>
        prev
          ? {
              ...prev,
              cashSalesTotal: prev.cashSalesTotal + payment.amount,
              expectedCash: prev.expectedCash + payment.amount,
            }
          : null
      );
    }

    // Auto-record to Treasury Subscriptions / Store Account for Cash & InstaPay
    if (payment.method === 'cash' || payment.method === 'instapay') {
      const inv = invoices.find((i) => i.id === payment.invoiceId);
      const isStoreInvoice = inv?.type === 'boutique';
      const targetPurpose: TreasuryPurpose = isStoreInvoice ? 'store' : 'subscription';
      const targetAccount =
        treasuryAccounts.find((a) => a.purpose === targetPurpose) ||
        treasuryAccounts.find((a) => a.purpose === 'subscription') ||
        treasuryAccounts[0];

      if (targetAccount) {
        const subTxn: TreasuryTransaction = {
          id: `txn-${Date.now().toString(36)}-pay`,
          accountId: targetAccount.id,
          kind: 'deposit',
          source: isStoreInvoice ? 'store_sales' : 'subscription',
          amount: payment.amount,
          description: `Invoice Payment #${inv?.invoiceNumber || payment.invoiceId || ''} (${payment.studentName || inv?.customerName || 'Tuition'}) - ${payment.method === 'instapay' ? 'InstaPay' : 'Cash'}${payment.referenceNo ? ` [Ref: ${payment.referenceNo}]` : ''}`,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: payment.method,
          referenceNo: payment.referenceNo,
          createdBy: currentUser?.name || 'Staff Reception',
        };
        setTreasuryTransactions((prev) => [subTxn, ...prev]);
      }
    }

    showToast(
      language === 'ar' ? 'تم قيد الدفعة' : 'Payment Recorded',
      language === 'ar'
        ? `تم تسجيل تحصيل مبلغ ${formatCurrency(payment.amount, 'ar')} بنجاح.`
        : `Payment of ${formatCurrency(payment.amount, 'en')} received and recorded.`,
      'success'
    );
    logCrmAction('Manual Payment', `Received ${formatCurrency(payment.amount, 'en')} via ${payment.method}`, 'financial');
  };

  const adjustPayroll = (
    slipId: string,
    adjustments: {
      bonusAmount?: number;
      deductionAmount?: number;
      hourlyRate?: number;
      notes?: string;
    }
  ) => {
    setPayrollSlips((prev) =>
      prev.map((slip) => {
        if (slip.id === slipId) {
          const bonus = adjustments.bonusAmount !== undefined ? adjustments.bonusAmount : slip.bonusAmount;
          const deduction = adjustments.deductionAmount !== undefined ? adjustments.deductionAmount : slip.deductionAmount;
          const rate = adjustments.hourlyRate !== undefined ? adjustments.hourlyRate : slip.hourlyRate;
          const hourlyPay = slip.classesTaught * rate;
          const gross = slip.baseSalary + hourlyPay + slip.privateLessonCut + bonus;
          const net = Math.max(0, gross - deduction);

          return {
            ...slip,
            bonusAmount: bonus,
            deductionAmount: deduction,
            hourlyRate: rate,
            classHourlyPay: hourlyPay,
            totalGrossPay: gross,
            totalNetPay: net,
            notes: adjustments.notes || slip.notes,
          };
        }
        return slip;
      })
    );

    showToast(
      language === 'ar' ? 'تم تعديل الراتب' : 'Payroll Adjusted',
      language === 'ar' ? 'تم تحديث مخصصات الراتب والبدلات للمدرب.' : 'Payroll breakdown updated successfully.',
      'gold'
    );
    logCrmAction('Payroll Adjust', `Adjusted pay slip ${slipId}`, 'financial');
  };

  const markPayrollPaid = (slipId: string, paymentMethod: 'bank_transfer' | 'cash' = 'bank_transfer') => {
    const prev = payrollSlips.find((s) => s.id === slipId);
    setPayrollSlips((list) =>
      list.map((slip) =>
        slip.id === slipId
          ? {
              ...slip,
              status: 'paid',
              paymentMethod,
              paidAt: new Date().toISOString().split('T')[0],
            }
          : slip
      )
    );

    api.patch(`/api/accounting/payroll/${slipId}/pay`, { paymentRef: `CIB-${Date.now().toString(36).toUpperCase()}` })
      .then(() => {
        showToast(
          language === 'ar' ? 'تم صرف الراتب' : 'Salary Disbursed',
          language === 'ar' ? 'تم تسجيل سداد الراتب وتحديث القيد المالي.' : 'Salary marked as paid.',
          'success'
        );
        logCrmAction('Payroll Paid', `Marked pay slip ${slipId} as settled`, 'financial');
      })
      .catch((e) => {
        // Server is authoritative (e.g. slip not approved yet) — roll back.
        if (prev) setPayrollSlips((list) => list.map((s) => (s.id === slipId ? prev : s)));
        showToast('Payment blocked', errMsg(e, 'Slip must be approved first.'), 'error');
      });
  };

  const approvePayroll = (slipId: string) => {
    setPayrollSlips((prev) =>
      prev.map((slip) => (slip.id === slipId ? { ...slip, status: 'approved' } : slip))
    );
    api.patch(`/api/accounting/payroll/${slipId}/approve`, {})
      .then(() => {
        showToast(language === 'ar' ? 'تم الاعتماد' : 'Approved', 'Slip ready for disbursement.', 'success');
      })
      .catch((e) => {
        showToast('Approval failed', errMsg(e, 'Could not approve.'), 'error');
      });
  };

  const refreshPayroll = async () => {
    try {
      const { data: payData } = await api.get('/api/accounting/payroll');
      if (Array.isArray(payData)) {
        setPayrollSlips(
          payData.map((p: any) => ({
            id: p.id,
            staffId: p.instructorId,
            staffName: p.instructorName,
            period: p.month || 'September 2026',
            periodMonth: p.month,
            role: p.role || 'Faculty Instructor',
            baseSalary: Number(p.baseSalary || 0),
            hourlyRate: Number(p.hourlyRate || 0),
            classesTaught: Number(p.hoursTaught || 0),
            classHourlyPay: Number(p.hourlyRate || 0) * Number(p.hoursTaught || 0),
            privateLessonsTaught: p.privateSessionsCount || 0,
            privateLessonCut: (p.privateSessionsCount || 0) * Number(p.privateSessionRate || 0),
            bonusAmount: Number(p.bonuses || 0),
            deductionAmount: Number(p.deductions || 0),
            totalGrossPay: Number(p.netPayable),
            totalNetPay: Number(p.netPayable),
            status: p.status || 'pending',
            paymentMethod: 'bank_transfer',
            paidAt: p.paidAt ? p.paidAt.split('T')[0] : undefined,
            notes: p.notes,
          }))
        );
      }
    } catch {
      // offline
    }
  };

  const recordJournalEntry = (entry: {
    memo: string;
    reference?: string;
    lines: { accountCode: string; accountName: string; debit: number; credit: number; description?: string }[];
  }): { success: boolean; error?: string } => {
    const totalDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      showToast(
        language === 'ar' ? 'خطأ في توازن القيد' : 'Unbalanced Voucher',
        language === 'ar'
          ? `إجمالي المدين (${formatCurrency(totalDebit, 'ar')}) لا يساوي الدائن (${formatCurrency(totalCredit, 'ar')}).`
          : `Debits (${formatCurrency(totalDebit, 'en')}) must equal Credits (${formatCurrency(totalCredit, 'en')}).`,
        'error'
      );
      return { success: false, error: 'Total Debit must equal Total Credit' };
    }

    const entryNo = `JRN-2026-${String(journalEntries.length + 1).padStart(3, '0')}`;
    const newVoucher: JournalVoucher = {
      id: `jrn-${Date.now()}`,
      entryNumber: entryNo,
      date: new Date().toISOString().split('T')[0],
      memo: entry.memo,
      reference: entry.reference,
      isManual: true,
      createdByName: currentUser?.name || 'Finance Admin',
      lines: entry.lines.map((l, i) => ({
        id: `jl-${Date.now()}-${i}`,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.debit || 0,
        credit: l.credit || 0,
        description: l.description,
      })),
      totalDebit,
      totalCredit,
    };

    setJournalEntries((prev) => [newVoucher, ...prev]);

    api.post('/api/accounting/journal', {
      voucherNumber: entryNo,
      memo: entry.memo,
      totalDebit,
      totalCredit,
      status: 'posted',
      postedBy: currentUser?.name || 'Finance Admin',
      lines: entry.lines.map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.debit || 0,
        credit: l.credit || 0,
        description: l.description,
      })),
    })
      .then((res) => {
        const created = res.data;
        if (created?.id) {
          setJournalEntries((prev) =>
            prev.map((j) => (j.entryNumber === entryNo ? { ...j, id: created.id } : j))
          );
        }
      })
      .catch(() => {});

    showToast(
      language === 'ar' ? 'تم ترحيل القيد المحاسبي' : 'Journal Voucher Posted',
      language === 'ar'
        ? `تم ترحيل القيد رقم ${entryNo} بإجمالي ${formatCurrency(totalDebit, 'ar')}.`
        : `Voucher ${entryNo} posted for ${formatCurrency(totalDebit, 'en')}.`,
      'gold'
    );
    logCrmAction('Journal Entry', `Posted manual voucher ${entryNo}: ${entry.memo}`, 'financial');
    return { success: true };
  };

  const openCashDrawerShift = (openingFloat: number, notes?: string) => {
    const newShift: CashDrawerShift = {
      id: `SHIFT-${Date.now().toString().slice(-6)}`,
      staffName: currentUser?.name || 'Reception Staff',
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      openingFloat,
      cashSalesTotal: 0,
      cashPayoutsTotal: 0,
      expectedCash: openingFloat,
      status: 'open',
      notes,
    };

    setActiveDrawerShift(newShift);

    api.post('/api/accounting/cash-shifts', {
      openingFloat,
      cashierName: currentUser?.name || 'Reception Desk',
      notes,
    })
      .then((res) => {
        const created = res.data;
        if (created?.id) {
          setActiveDrawerShift((prev) => (prev ? { ...prev, id: created.id } : null));
        }
      })
      .catch(() => {});

    showToast(
      language === 'ar' ? 'تم فتح وردية الخزينة' : 'Cash Shift Opened',
      language === 'ar'
        ? `تم بدء الوردية برصيد افتتاحي ${formatCurrency(openingFloat, 'ar')}.`
        : `Shift opened with float of ${formatCurrency(openingFloat, 'en')}.`,
      'gold'
    );
    logCrmAction('Drawer Open', `Opened shift with ${formatCurrency(openingFloat, 'en')} float`, 'financial');
  };

  const closeCashDrawerShift = (countedCash: number, notes?: string): { variance: number } => {
    if (!activeDrawerShift) return { variance: 0 };

    const expected = activeDrawerShift.expectedCash;
    const variance = countedCash - expected;

    const closedShift: CashDrawerShift = {
      ...activeDrawerShift,
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      countedCash,
      variance,
      status: 'closed',
      notes: notes || activeDrawerShift.notes,
    };

    setActiveDrawerShift(closedShift);

    if (activeDrawerShift.id) {
      api.patch(`/api/accounting/cash-shifts/${activeDrawerShift.id}/close`, {
        actualCash: countedCash,
        notes: notes || activeDrawerShift.notes,
      }).catch(() => {});
    }

    showToast(
      language === 'ar' ? 'تم إغلاق الوردية والمطابقة' : 'Shift Closed & Reconciled',
      language === 'ar'
        ? `الرصيد الفعلي: ${formatCurrency(countedCash, 'ar')} | الفارق: ${formatCurrency(variance, 'ar')}`
        : `Counted: ${formatCurrency(countedCash, 'en')} | Variance: ${formatCurrency(variance, 'en')}`,
      variance === 0 ? 'success' : 'warning'
    );
    logCrmAction('Drawer Close', `Closed shift. Variance: ${formatCurrency(variance, 'en')}`, 'financial');
    return { variance };
  };

  // Treasury actions
  const addTreasuryAccount = (data: { name: string; purpose: TreasuryPurpose; openingBalance: number; notes?: string }): TreasuryAccount => {
    const acc: TreasuryAccount = {
      id: `treas-${Date.now().toString(36)}`,
      name: data.name.trim(),
      purpose: data.purpose,
      openingBalance: Number(data.openingBalance) || 0,
      notes: data.notes?.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTreasuryAccounts((prev) => [...prev, acc]);
    showToast(language === 'ar' ? 'تمت إضافة الحساب' : 'Account added', `${acc.name} — ${formatCurrency(acc.openingBalance, language)} opening.`, 'success');
    logCrmAction('Treasury Account Added', `Created ${acc.name} (${acc.purpose}) opening ${formatCurrency(acc.openingBalance, 'en')}`, 'financial');
    return acc;
  };

  const updateTreasuryAccount = (id: string, data: Partial<TreasuryAccount>) => {
    setTreasuryAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...data, name: (data.name ?? a.name).trim() || a.name } : a)));
    showToast(language === 'ar' ? 'تم حفظ الحساب' : 'Account saved', 'Money account updated.', 'gold');
  };

  const deleteTreasuryAccount = (id: string) => {
    const acc = treasuryAccounts.find((a) => a.id === id);
    setTreasuryAccounts((prev) => prev.filter((a) => a.id !== id));
    setTreasuryTransactions((prev) => prev.filter((t) => t.accountId !== id));
    showToast(language === 'ar' ? 'تم حذف الحساب' : 'Account deleted', `${acc?.name || 'Account'} and its movements removed.`, 'warning');
    if (acc) logCrmAction('Treasury Account Deleted', `Removed ${acc.name}`, 'financial');
  };

  const reconcileTreasuryAccount = (id: string, counted: number) => {
    setTreasuryAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, countedBalance: counted } : a)));
    const acc = treasuryAccounts.find((a) => a.id === id);
    const txns = treasuryTransactions.filter((t) => t.accountId === id);
    const inflow = txns.filter((t) => t.kind === 'deposit').reduce((s, t) => s + t.amount, 0);
    const outflow = txns.filter((t) => t.kind === 'withdraw').reduce((s, t) => s + t.amount, 0);
    const expected = (acc?.openingBalance || 0) + inflow - outflow;
    const variance = counted - expected;
    showToast(
      language === 'ar' ? 'تمت المطابقة' : 'Reconciled',
      `${acc?.name || 'Account'}: counted ${formatCurrency(counted, language)} vs expected ${formatCurrency(expected, language)} (Δ ${formatCurrency(variance, language)}).`,
      variance === 0 ? 'success' : 'warning'
    );
    logCrmAction('Treasury Reconciled', `${acc?.name}: counted ${counted}, expected ${expected}, variance ${variance}`, 'financial');
  };

  const addTreasuryTransaction = (data: {
    accountId: string;
    kind: 'deposit' | 'withdraw';
    source: TreasurySource;
    amount: number;
    description?: string;
    date?: string;
    toAccountId?: string;
    paymentMethod?: 'cash' | 'instapay' | 'card' | 'transfer' | 'wallet_debt';
    referenceNo?: string;
  }): { success: boolean; error?: string } => {
    if (!data.accountId) return { success: false, error: 'Select an account.' };
    if (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0) {
      showToast(language === 'ar' ? 'مبلغ غير صالح' : 'Invalid amount', 'Amount must be greater than 0.', 'error');
      return { success: false, error: 'Amount must be greater than 0.' };
    }
    const amount = Number(data.amount);
    // Transfer = withdraw from source + deposit to destination
    if (data.toAccountId && data.toAccountId !== data.accountId) {
      const outId = `txn-${Date.now().toString(36)}-o`;
      const inId = `txn-${Date.now().toString(36)}-i`;
      const day = data.date || new Date().toISOString().split('T')[0];
      setTreasuryTransactions((prev) => [
        { id: outId, accountId: data.accountId, kind: 'withdraw', source: 'transfer', amount, description: data.description?.trim() || `Transfer out`, date: day, createdBy: currentUser?.name, paymentMethod: data.paymentMethod },
        { id: inId, accountId: data.toAccountId as string, kind: 'deposit', source: 'transfer', amount, description: data.description?.trim() || `Transfer in`, date: day, createdBy: currentUser?.name, paymentMethod: data.paymentMethod },
        ...prev,
      ]);
      showToast(language === 'ar' ? 'تم التحويل' : 'Transferred', `${formatCurrency(amount, language)} moved between accounts.`, 'success');
      logCrmAction('Treasury Transfer', `Moved ${formatCurrency(amount, 'en')} between accounts`, 'financial');
      return { success: true };
    }
    const txn: TreasuryTransaction = {
      id: `txn-${Date.now().toString(36)}`,
      accountId: data.accountId,
      kind: data.kind,
      source: data.source,
      amount,
      description: data.description?.trim().slice(0, 200) || undefined,
      date: data.date || new Date().toISOString().split('T')[0],
      createdBy: currentUser?.name,
      paymentMethod: data.paymentMethod,
      referenceNo: data.referenceNo,
    };
    setTreasuryTransactions((prev) => [txn, ...prev]);
    showToast(
      language === 'ar' ? 'تم تسجيل الحركة' : 'Movement recorded',
      `${data.kind === 'deposit' ? '+' : '−'}${formatCurrency(amount, language)} (${data.source.replace('_', ' ')}).`,
      'success'
    );
    return { success: true };
  };

  const deleteTreasuryTransaction = (id: string) => {
    setTreasuryTransactions((prev) => prev.filter((t) => t.id !== id));
    showToast(language === 'ar' ? 'تم حذف الحركة' : 'Movement deleted', 'Transaction removed.', 'warning');
  };

  const updateSubscriptionQuota = (studentId: string, deltaSessions: number) => {
    const student = students.find((s) => s.id === studentId);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              subscription: {
                ...s.subscription,
                usedSessions: Math.max(0, s.subscription.usedSessions + deltaSessions),
              },
            }
          : s
      )
    );

    api.patch(`/api/students/${studentId}/quota`, { delta: deltaSessions })
      .then(() => {
        api.get('/api/students').then((r) => setStudents(r.data)).catch(() => {});
      })
      .catch(() => {});

    showToast('Subscription Updated', `Quota adjusted for student.`, 'gold');
    logCrmAction('Quota Adjustment', `Adjusted sessions by ${deltaSessions > 0 ? '+' : ''}${deltaSessions} for ${student?.name || studentId}`, 'student');
  };

  // Full CRM Implementations
  const addLead = (lead: Omit<AdmissionLead, 'id' | 'createdAt'>) => {
    const newLead: AdmissionLead = {
      ...lead,
      id: `LEAD-${Date.now().toString().slice(-4)}`,
      createdAt: 'Just now',
    };
    setLeads((prev) => [newLead, ...prev]);

    addNotification({
      id: `lead_${newLead.id}`,
      eventId: `lead_${newLead.id}`,
      title: `New Admission Inquiry: ${newLead.dancerName}`,
      titleAr: `طلب قبول جديد: ${newLead.dancerName}`,
      message: `${newLead.dancerName} (${newLead.programInterest}). Parent: ${newLead.parentName} (${newLead.parentPhone})`,
      messageAr: `${newLead.dancerName} (${newLead.programInterest}). ولي الأمر: ${newLead.parentName} (${newLead.parentPhone})`,
      category: 'crm',
      severity: 'info',
      linkTab: 'admissions',
    });

    api.post('/api/leads', {
      dancerName: lead.dancerName,
      age: lead.age,
      parentName: lead.parentName,
      parentPhone: lead.parentPhone,
      parentEmail: lead.parentEmail,
      program: lead.programInterest,
      notes: lead.notes,
    })
      .then(() => {
        api.get('/api/leads').then((r) => { const d = r.data; setLeads(Array.isArray(d) ? d.map(normalizeLead) : d); }).catch(() => {});
      })
      .catch(() => {});

    showToast('New Lead Added', `Admissions inquiry logged for ${newLead.dancerName}.`, 'success');
    logCrmAction('Lead Created', `Added admissions lead: ${newLead.dancerName} (${newLead.programInterest})`, 'lead');
  };

  const updateLeadStage = (id: string, stage: AdmissionLead['stage']) => {
    const lead = leads.find((l) => l.id === id);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, stage } : l))
    );

    api.patch(`/api/leads/${id}/stage`, { stage }).catch(() => {});

    showToast('Lead Status Updated', `${lead?.dancerName || 'Lead'} moved to ${stage.replace('_', ' ').toUpperCase()}.`, 'gold');
    logCrmAction('Lead Stage Progress', `Moved ${lead?.dancerName} to ${stage.toUpperCase()}`, 'lead');
  };

  const deleteLead = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    api.delete(`/api/leads/${id}`).catch(() => {});
    showToast('Lead Deleted', `${lead?.dancerName || 'Lead'} removed from pipeline.`, 'gold');
    logCrmAction('Lead Removed', `Deleted admissions lead ${lead?.dancerName || id}`, 'lead');
  };

  const convertLeadToStudent = (leadId: string, planTier: 'elite_16' | 'foundation_8' | 'intensive_20' = 'foundation_8'): Student | null => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return null;

    api.post(`/api/leads/${leadId}/convert`, { planTier })
      .then((res) => {
        const fresh = res.data;
        if (fresh?.id) {
          setStudents((prev) => [fresh, ...prev.filter((s) => s.id !== fresh.id)]);
          api.get('/api/leads').then((r) => { const d = r.data; setLeads(Array.isArray(d) ? d.map(normalizeLead) : d); }).catch(() => {});
        }
      })
      .catch(() => {});

    const newStudentId = `STU-${Math.floor(100 + Math.random() * 900)}`;
    const newBarcode = `ETOILE-${Math.floor(100000 + Math.random() * 900000)}`;

    const now = new Date();
    const dynamicStartDate = now.toISOString().split('T')[0];
    const dynamicEndDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const plans: Record<string, Subscription> = {
      elite_16: {
        id: `SUB-${Date.now()}`,
        planName: 'Conservatory Classical Elite (16 Sessions)',
        planNameAr: 'كونسرفتوار الباليه الكلاسيكي النخبة (16 حصة)',
        startDate: dynamicStartDate,
        endDate: dynamicEndDate,
        maxSessions: 16,
        usedSessions: 0,
        price: 480,
        status: 'active',
      },
      foundation_8: {
        id: `SUB-${Date.now()}`,
        planName: 'Youth Foundation Academy (8 Sessions)',
        planNameAr: 'أكاديمية تأسيس الناشئين (8 حصص)',
        startDate: dynamicStartDate,
        endDate: dynamicEndDate,
        maxSessions: 8,
        usedSessions: 0,
        price: 260,
        status: 'active',
      },
      intensive_20: {
        id: `SUB-${Date.now()}`,
        planName: 'Contemporary Intensive Pro (20 Sessions)',
        planNameAr: 'الرقص المعاصر المكثف للمحترفين (20 حصة)',
        startDate: dynamicStartDate,
        endDate: dynamicEndDate,
        maxSessions: 20,
        usedSessions: 0,
        price: 520,
        status: 'active',
      },
    };

    const newStudent: Student = {
      id: newStudentId,
      name: lead.dancerName,
      nameAr: lead.dancerNameAr || lead.dancerName,
      barcode: newBarcode,
      photoUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=400&q=80',
      familyId: `FAM-${Math.floor(10 + Math.random() * 90)}`,
      age: lead.age,
      program: lead.programInterest,
      level: lead.programInterest === 'classical' ? 'Conservatory Level I' : 'Youth Academy Level I',
      walletBalance: 0,
      maxNegativeDebt: 100,
      subscription: plans[planTier] || plans.foundation_8,
      parentName: lead.parentName,
      parentPhone: lead.parentPhone,
      parentEmail: lead.parentEmail,
      enrolledDate: new Date().toISOString().split('T')[0],
      medicalNotes: lead.notes,
    };

    setStudents((prev) => [newStudent, ...prev]);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: 'enrolled' } : l)));

    showToast('Lead Enrolled as Dancer', `${lead.dancerName} officially enrolled! Barcode: ${newBarcode}`, 'success');
    logCrmAction('Lead Converted to Student', `Enrolled ${lead.dancerName} with barcode ${newBarcode}`, 'student');

    return newStudent;
  };

  const registerStudent = (studentData: {
    name: string;
    nameAr: string;
    barcode?: string;
    age: number;
    program: 'classical' | 'contemporary' | 'youth';
    level: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    photoUrl?: string;
    maxNegativeDebt?: number;
    initialPlan: 'elite_16' | 'foundation_8' | 'intensive_20';
  }): Student => {
    const newStudentId = `STU-${Math.floor(100 + Math.random() * 900)}`;
    const newBarcode = studentData.barcode?.trim().toUpperCase() || `ETOILE-${Math.floor(100000 + Math.random() * 900000)}`;

    api.post('/api/students', { ...studentData, barcode: newBarcode })
      .then((res) => {
        const fresh = res.data;
        if (fresh?.id) {
          setStudents((prev) => [fresh, ...prev.filter((s) => s.id !== fresh.id)]);
        }
      })
      .catch(() => {});

    const now = new Date();
    const dynamicStartDate = now.toISOString().split('T')[0];
    const dynamicEndDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const plans: Record<string, Subscription> = {
      elite_16: {
        id: `SUB-${Date.now()}`,
        planName: 'Conservatory Classical Elite (16 Sessions)',
        planNameAr: 'كونسرفتوار الباليه الكلاسيكي النخبة (16 حصة)',
        startDate: dynamicStartDate,
        endDate: dynamicEndDate,
        maxSessions: 16,
        usedSessions: 0,
        price: 480,
        status: 'active',
      },
      foundation_8: {
        id: `SUB-${Date.now()}`,
        planName: 'Youth Foundation Academy (8 Sessions)',
        planNameAr: 'أكاديمية تأسيس الناشئين (8 حصص)',
        startDate: dynamicStartDate,
        endDate: dynamicEndDate,
        maxSessions: 8,
        usedSessions: 0,
        price: 260,
        status: 'active',
      },
      intensive_20: {
        id: `SUB-${Date.now()}`,
        planName: 'Contemporary Intensive Pro (20 Sessions)',
        planNameAr: 'الرقص المعاصر المكثف للمحترفين (20 حصة)',
        startDate: dynamicStartDate,
        endDate: dynamicEndDate,
        maxSessions: 20,
        usedSessions: 0,
        price: 520,
        status: 'active',
      },
    };

    const newStudent: Student = {
      id: newStudentId,
      name: studentData.name,
      nameAr: studentData.nameAr || studentData.name,
      barcode: newBarcode,
      photoUrl: studentData.photoUrl || 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=400&q=80',
      familyId: `FAM-${Math.floor(10 + Math.random() * 90)}`,
      age: studentData.age,
      program: studentData.program,
      level: studentData.level,
      walletBalance: 0,
      maxNegativeDebt: studentData.maxNegativeDebt || 120,
      subscription: plans[studentData.initialPlan] || plans.foundation_8,
      parentName: studentData.parentName,
      parentPhone: studentData.parentPhone,
      parentEmail: studentData.parentEmail,
      enrolledDate: new Date().toISOString().split('T')[0],
    };

    setStudents((prev) => [newStudent, ...prev]);
    showToast('Dancer Registered', `${newStudent.name} admitted to ${studentData.program.toUpperCase()} division.`, 'success');
    logCrmAction('Student Registered', `Enrolled ${newStudent.name} (Barcode: ${newBarcode})`, 'student');

    return newStudent;
  };

  const updateStudent = (studentId: string, updatedFields: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, ...updatedFields } : s))
    );

    api.patch(`/api/students/${studentId}`, updatedFields).catch(() => {});

    showToast('Dancer Profile Saved', 'Student record and custom parameters updated.', 'success');
    logCrmAction('Student Updated', `Modified profile records for ${updatedFields.name || studentId}`, 'student');
  };

  const deleteStudent = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));

    api.delete(`/api/students/${studentId}`).catch(() => {});

    showToast('Student Removed', `${student?.name || 'Student'} removed from directory.`, 'gold');
    logCrmAction('Student Removed', `Deleted student record ${student?.name || studentId}`, 'student');
  };

  const updateStudentBarcode = (studentId: string, newBarcode: string) => {
    const clean = newBarcode.trim().toUpperCase();
    if (!clean) {
      showToast('Barcode Required', 'Barcode code cannot be empty.', 'error');
      return { success: false, error: 'Barcode code cannot be empty' };
    }
    const duplicate = students.find((s) => s.barcode.toUpperCase() === clean && s.id !== studentId);
    if (duplicate) {
      showToast('Duplicate Barcode', `Barcode ${clean} is already assigned to ${duplicate.name}.`, 'error');
      return { success: false, error: `Barcode already in use by ${duplicate.name}` };
    }
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, barcode: clean } : s))
    );

    api.patch(`/api/students/${studentId}`, { barcode: clean }).catch(() => {});

    showToast('Barcode Assigned', `Check-in barcode set to ${clean}. Ready for scanner detection.`, 'success');
    logCrmAction('Barcode Updated', `Updated barcode to ${clean} for student ID ${studentId}`, 'student');
    return { success: true };
  };

  const addStudentNote = (studentId: string, text: string, category: StudentNote['category'] = 'general') => {
    const newNote: StudentNote = {
      id: `NOTE-${Date.now()}`,
      studentId,
      authorName: currentUser?.name || 'Staff Member',
      authorRole: currentUser?.role ? currentUser.role.toUpperCase() : 'STAFF',
      text,
      category,
      timestamp: 'Just now',
    };
    setStudentNotes((prev) => [newNote, ...prev]);

    api.post(`/api/students/${studentId}/notes`, { text, category, author: currentUser?.name, authorRole: currentUser?.role }).catch(() => {});

    showToast('Note Saved', 'Student notes updated.', 'gold');
    logCrmAction('Student Note Added', `Added ${category} note to student record`, 'student');
  };

  const updateStaffRole = async (staffId: string, role: UserRole) => {
    const target = staffList.find((s) => s.id === staffId);
    setStaffList((prev) => prev.map((s) => (s.id === staffId ? { ...s, role } : s)));
    if (currentUser && currentUser.id === staffId) {
      const updatedUser = { ...currentUser, role };
      setCurrentUser(updatedUser);
      setUserRoleState(role);
      localStorage.setItem('etoile_admin_user', JSON.stringify(updatedUser));
    }
    showToast('Staff Role Updated', `${target?.name || 'Staff'} reassigned to ${role.toUpperCase()}.`, 'gold');
    logCrmAction('Staff Role Modified', `Reassigned ${target?.name} to role ${role}`, 'staff');

    try {
      await api.patch(`/api/auth/staff/${staffId}/role`, { role });
    } catch (err) {
      console.warn('Could not persist staff role to server:', err);
    }
  };

  const updateStaffAvatar = async (staffId: string, avatarUrl: string | null): Promise<boolean> => {
    const clean = avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : null;
    const fallback = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
    const displayAvatar = clean || fallback;

    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, avatar: displayAvatar, avatarUrl: clean || undefined } : s))
    );

    if (currentUser && currentUser.id === staffId) {
      const updatedUser = { ...currentUser, avatar: displayAvatar, avatarUrl: clean || undefined };
      setCurrentUser(updatedUser);
      localStorage.setItem('etoile_admin_user', JSON.stringify(updatedUser));
    }

    try {
      await api.patch(`/api/auth/staff/${staffId}/avatar`, { avatarUrl: clean });
      showToast(
        language === 'ar' ? 'تم تحديث الصورة الشخصية' : 'Profile Photo Updated',
        clean
          ? (language === 'ar' ? 'تم حفظ الصورة الشخصية بنجاح.' : 'Profile image saved successfully.')
          : (language === 'ar' ? 'تمت استعادة الصورة الافتراضية بنجاح.' : 'Reset to default avatar.'),
        'success'
      );
      logCrmAction('Staff Avatar Updated', `Updated profile photo for ${staffId}`, 'staff');
      return true;
    } catch (err) {
      console.warn('Could not persist avatar to server:', err);
      showToast(
        language === 'ar' ? 'تم الحفظ محلياً' : 'Updated locally',
        language === 'ar' ? 'تم تحديث الصورة محلياً.' : 'Photo updated in active session.',
        'gold'
      );
      return true;
    }
  };

  const toggleStaffShift = async (staffId: string) => {
    let nextStatus: 'on_duty' | 'off_shift' = 'on_duty';
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === staffId) {
          nextStatus = s.shiftStatus === 'on_duty' ? 'off_shift' : 'on_duty';
          showToast('Shift Status Changed', `${s.name} is now ${nextStatus === 'on_duty' ? 'ON DUTY' : 'OFF SHIFT'}.`, 'gold');
          logCrmAction('Staff Shift Toggled', `${s.name} marked as ${nextStatus}`, 'staff');
          return { ...s, shiftStatus: nextStatus, shiftActive: nextStatus === 'on_duty' };
        }
        return s;
      })
    );

    try {
      await api.patch(`/api/auth/staff/${staffId}/shift`, {});
    } catch (err) {
      console.warn('Could not persist shift status to server:', err);
    }
  };

  const addStaffMember = (member: Omit<StaffMember, 'id'>) => {
    const newStaff: StaffMember = {
      ...member,
      id: `STAFF-0${staffList.length + 1}`,
    };
    setStaffList((prev) => [...prev, newStaff]);
    showToast('Staff Onboarded', `${newStaff.name} added to Faculty Directory.`, 'success');
    logCrmAction('Staff Onboarded', `Added faculty member ${newStaff.name} (${newStaff.role})`, 'staff');
  };

  const createStaffUser = async (data: {
    name: string;
    nameAr?: string;
    email: string;
    role: UserRole;
    department?: string;
    departmentAr?: string;
    password?: string;
    avatarUrl?: string;
  }): Promise<boolean> => {
    try {
      const { data: created } = await api.post('/api/auth/staff', data);

      const normalized: StaffMember = {
        ...created,
        avatar: created.avatar || created.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        shiftStatus: created.shiftStatus || (created.shiftActive ? 'on_duty' : 'off_shift'),
        studio: created.studio || created.department || 'Operations',
        specialization: created.specialization || created.departmentAr || created.department || 'Ballet Pedagogy',
      };
      setStaffList((prev) => [normalized, ...prev.filter((s) => s.id !== normalized.id)]);
      showToast('Staff Onboarded', `${normalized.name} added to Administrator Directory.`, 'success');
      logCrmAction('Staff User Created', `Created user account ${normalized.name} (${normalized.role})`, 'staff');
      return true;
    } catch (e) {
      showToast('Error Adding Staff', errMsg(e, 'Could not create staff account.'), 'error');
      return false;
    }
  };

  const deleteStaffMember = async (staffId: string): Promise<boolean> => {
    const target = staffList.find((s) => s.id === staffId);
    try {
      await api.delete(`/api/auth/staff/${staffId}`);

      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      showToast('User Deleted', `${target?.name || 'Staff'} removed from the system.`, 'success');
      logCrmAction('Staff User Removed', `Deleted user account ${target?.name} (${staffId})`, 'staff');
      return true;
    } catch (e) {
      showToast('Action Forbidden', errMsg(e, 'Could not delete staff account.'), 'error');
      return false;
    }
  };

  const resetStaffPassword = async (staffId: string, newPass: string): Promise<boolean> => {
    try {
      await api.patch(`/api/auth/staff/${staffId}/password`, { password: newPass });

      showToast('Password Updated', 'Staff PIN / password successfully reset.', 'success');
      return true;
    } catch (e) {
      showToast('Error', errMsg(e, 'Could not reset password.'), 'error');
      return false;
    }
  };

  const addEvaluation = (evalData: Omit<SkillEvaluation, 'id' | 'date'>) => {
    const newEval: SkillEvaluation = {
      ...evalData,
      id: `EVAL-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
    };
    setEvaluations((prev) => [newEval, ...prev]);

    api.post(`/api/students/${evalData.studentId}/evaluations`, {
      evaluator: evalData.evaluatorName,
      barre: evalData.barreTechnique,
      center: evalData.pointeStability,
      allegro: evalData.allegroJumps,
      musicality: evalData.musicalityArtistry,
      notes: evalData.remarks,
    }).catch(() => {});

    showToast('Evaluation Recorded', `Technical marks logged for ${evalData.studentName}.`, 'success');
    logCrmAction('Evaluation Recorded', `Graded ${evalData.studentName} technique assessment`, 'student');
  };

  const deleteEvaluation = (evalId: string) => {
    setEvaluations((prev) => prev.filter((e) => e.id !== evalId));
    api.delete(`/api/evaluations/${evalId}`).catch(() => {});
    showToast('Evaluation Deleted', 'Student assessment report removed.', 'gold');
    logCrmAction('Evaluation Removed', `Deleted evaluation report ${evalId}`, 'student');
  };

  const deleteTuitionPackage = async (packageId: string): Promise<boolean> => {
    try {
      // Interceptor attaches the live staff token — no manual headers.
      await api.delete(`/api/subscriptions/plans/${packageId}`);
      showToast('Package Deleted', 'Tuition package removed.', 'gold');
      logCrmAction('Package Deleted', `Deleted tuition package ${packageId}`, 'financial');
      return true;
    } catch {
      return true;
    }
  };

  return (
    <AdminContext.Provider
      value={{
        currentUser,
        userRole,
        roleConfigs,
        updateRoleAccess,
        setRoleDefaultTab,
        resetRolePermissions,
        language,
        direction,
        students,
        attendanceLogs,
        products,
        cart,
        orders,
        openWaQueue,
        financials,
        toasts,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markNotificationAsUnread,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllReadNotifications,
        addNotification,
        leads,
        studentNotes,
        staffList,
        evaluations,
        auditLogs,
        // Courses, Sessions & WhatsApp Gateway
        courses,
        courseSessions,
        reminderConfig,
        whatsAppConfig,
        createCourse,
        updateCourse,
        deleteCourse,
        enrollStudentInCourse,
        unenrollStudentFromCourse,
        createCourseSession,
        deleteCourseSession,
        sendCourseSessionReminder,
        updateReminderConfig,
        connectWhatsApp,
        confirmWhatsAppPairing,
        disconnectWhatsApp,
        updateWhatsAppGateway,
        // Financial Subsystem
        expenses,
        invoices,
        payrollSlips,
        journalEntries,
        activeDrawerShift,
        addExpense,
        deleteExpense,
        createManualInvoice,
        recordManualPayment,
        adjustPayroll,
        markPayrollPaid,
        approvePayroll,
        refreshPayroll,
        recordJournalEntry,
        openCashDrawerShift,
        closeCashDrawerShift,
        treasuryAccounts,
        treasuryTransactions,
        addTreasuryAccount,
        updateTreasuryAccount,
        deleteTreasuryAccount,
        reconcileTreasuryAccount,
        addTreasuryTransaction,
        deleteTreasuryTransaction,
        login,
        logout,
        setUserRole,
        setLanguage,
        checkInStudent,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        checkoutCart,
        triggerOpenWaAlert,
        settleStudentDebt,
        updateSubscriptionQuota,
        showToast,
        showConfirmNotification,
        removeToast,
        playAudioChime,
        isAudioMuted,
        toggleAudioMute,
        addLead,
        updateLeadStage,
        deleteLead,
        convertLeadToStudent,
        registerStudent,
        updateStudent,
        deleteStudent,
        updateStudentBarcode,
        addStudentNote,
        updateStaffRole,
        updateStaffAvatar,
        toggleStaffShift,
        addStaffMember,
        createStaffUser,
        deleteStaffMember,
        resetStaffPassword,
        addEvaluation,
        deleteEvaluation,
        deleteTuitionPackage,
        logCrmAction,
        addProduct,
        updateProduct,
        deleteProduct,
        updateProductStock,
        recordBoutiqueOrder,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};
