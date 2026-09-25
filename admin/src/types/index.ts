export type UserRole = 'owner' | 'superadmin' | 'receptionist' | 'instructor';
export type AppLanguage = 'en' | 'ar';
export type AdminTabId =
  | 'overview'
  | 'analytics'
  | 'notifications'
  | 'checkin'
  | 'schedule'
  | 'courses'
  | 'students'
  | 'admissions'
  | 'subscriptions'
  | 'pos'
  | 'financials'
  | 'openwa'
  | 'cms'
  | 'blog'
  | 'audit'
  | 'growth'
  | 'roster'
  | 'categories'
  | 'groups'
  | 'sessions'
  | 'users'
  | 'settings'
  | 'profile';

export interface AdminNotification {
  id: string;
  eventId: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  time: string;
  timestamp: string;
  unread: boolean;
  category: 'attendance' | 'crm' | 'finance' | 'whatsapp' | 'system';
  severity: 'info' | 'warning' | 'urgent' | 'success';
  linkTab?: AdminTabId;
}

export interface RoleConfig {
  role: UserRole;
  title: string;
  titleAr: string;
  badge: string;
  allowedTabs: AdminTabId[];
  defaultTab: AdminTabId;
  description: string;
  descriptionAr: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  superadmin: {
    role: 'superadmin',
    title: 'Academy Director',
    titleAr: 'مدير الأكاديمية',
    badge: 'Director',
    allowedTabs: ['overview', 'analytics', 'notifications', 'checkin', 'schedule', 'courses', 'students', 'admissions', 'subscriptions', 'pos', 'financials', 'openwa', 'cms', 'blog', 'audit', 'growth', 'roster', 'categories', 'groups', 'sessions', 'users', 'settings', 'profile'],
    defaultTab: 'overview',
    description: 'Full access to all academy operations, courses, students, finances, and staff.',
    descriptionAr: 'صلاحيات كاملة على العمليات وإدارة الدورات والطلاب والمالية والموظفين.',
  },
  owner: {
    role: 'owner',
    title: 'Owner / Board Member',
    titleAr: 'المالك / مجلس الإدارة',
    badge: 'Board',
    allowedTabs: ['overview', 'analytics', 'notifications', 'checkin', 'schedule', 'courses', 'students', 'admissions', 'subscriptions', 'pos', 'financials', 'openwa', 'cms', 'blog', 'audit', 'growth', 'roster', 'categories', 'groups', 'sessions', 'users', 'settings', 'profile'],
    defaultTab: 'overview',
    description: 'Executive overview of academy growth, financial reports, and courses.',
    descriptionAr: 'إشراف تنفيذي على النمو، والتقارير المالية المستحقة، والدورات.',
  },
  receptionist: {
    role: 'receptionist',
    title: 'Front Desk Receptionist',
    titleAr: 'موظف الاستقبال',
    badge: 'Reception',
    allowedTabs: ['overview', 'analytics', 'notifications', 'checkin', 'schedule', 'courses', 'students', 'admissions', 'subscriptions', 'pos', 'financials', 'openwa', 'roster', 'categories', 'groups', 'sessions', 'profile'],
    defaultTab: 'checkin',
    description: 'Attendance check-in, courses & sessions, class packages, and shop checkout.',
    descriptionAr: 'تسجيل الحضور، والدورات والحصص، وتجديد الباقات، ونقاط بيع المتجر.',
  },
  instructor: {
    role: 'instructor',
    title: 'Ballet Teacher / Coach',
    titleAr: 'مدرب باليه',
    badge: 'Teacher',
    allowedTabs: ['overview', 'analytics', 'notifications', 'courses', 'schedule', 'checkin', 'students', 'openwa', 'roster', 'groups', 'sessions', 'profile'],
    defaultTab: 'courses',
    description: 'Assigned courses, weekly schedule of sessions, student rosters, and WhatsApp alerts.',
    descriptionAr: 'الدورات المسندة، وجدول الحصص الأسبوعي، وسجلات الطلاب، وتنبيهات واتساب.',
  },
};

// Visual catalogue used by Settings RBAC editor, sidebar, headers.
// `locked` tabs (profile) are always visible to every role and cannot be revoked.
export const ALL_MODULES: { id: AdminTabId; en: string; ar: string; group: string; locked?: boolean }[] = [
  { id: 'overview', en: 'Dashboard', ar: 'لوحة القيادة', group: 'Command' },
  { id: 'analytics', en: 'Analytics & BI', ar: 'التحليلات', group: 'Command' },
  { id: 'notifications', en: 'Notifications', ar: 'التنبيهات', group: 'Command' },
  { id: 'checkin', en: 'Check-In Kiosk', ar: 'كشك الحضور', group: 'Operations' },
  { id: 'schedule', en: 'Studio Schedule', ar: 'الجدول', group: 'Operations' },
  { id: 'courses', en: 'Courses', ar: 'الدورات', group: 'Operations' },
  { id: 'students', en: 'Students CRM', ar: 'الطلاب', group: 'Operations' },
  { id: 'admissions', en: 'Admissions', ar: 'القبول', group: 'Operations' },
  { id: 'subscriptions', en: 'Packages', ar: 'الباقات', group: 'Operations' },
  { id: 'pos', en: 'Boutique POS', ar: 'المتجر', group: 'Commerce' },
  { id: 'financials', en: 'Financials', ar: 'المالية', group: 'Commerce' },
  { id: 'openwa', en: 'WhatsApp', ar: 'واتساب', group: 'Engagement' },
  { id: 'cms', en: 'Website CMS', ar: 'المحتوى', group: 'Engagement' },
  { id: 'blog', en: 'Journal CMS', ar: 'المدونة', group: 'Engagement' },
  { id: 'growth', en: 'Growth & Referrals', ar: 'النمو والإحالات', group: 'Engagement' },
  { id: 'categories', en: 'Categories', ar: 'الفئات', group: 'Academy' },
  { id: 'groups', en: 'Groups', ar: 'المجموعات', group: 'Academy' },
  { id: 'sessions', en: 'Sessions', ar: 'الحصص', group: 'Academy' },
  { id: 'roster', en: 'Staff Roster', ar: 'جدول الطاقم', group: 'System' },
  { id: 'audit', en: 'Audit Log', ar: 'سجل التدقيق', group: 'System' },  { id: 'users', en: 'Staff & Roles', ar: 'المشرفون', group: 'System' },
  { id: 'settings', en: 'Settings', ar: 'الإعدادات', group: 'System' },
  { id: 'profile', en: 'My Profile', ar: 'ملفي', group: 'System', locked: true },
];

export interface CourseSession {
  id: string;
  courseId: string;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  studioRoom: string;
  instructorId?: string;
  instructor?: {
    id: string;
    name: string;
    nameAr?: string;
    email: string;
    avatarUrl?: string;
  };
  reminderSent: boolean;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  status: string;
  student?: Student;
}

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  program: 'classical' | 'contemporary' | 'youth';
  level: string;
  capacity: number;
  instructorId?: string;
  instructor?: StaffMember;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  studioRoom?: string;
  branchCode?: string;
  active: boolean;
  enrollments?: CourseEnrollment[];
  sessions?: CourseSession[];
  _count?: {
    enrollments: number;
    sessions: number;
  };
}

export interface WhatsAppReminderConfig {
  id: string;
  enabled: boolean;
  sendMinutesBefore: number;
  studentTemplateEn: string;
  studentTemplateAr: string;
  instructorTemplateEn: string;
  instructorTemplateAr: string;
  autoCron: boolean;
}

export interface WhatsAppGatewayConfig {
  id: string;
  mode: 'builtin_qr' | 'external_gateway';
  gatewayUrl?: string;
  apiKey?: string;
  sessionName?: string;
  status: 'connected' | 'pairing' | 'disconnected' | 'connecting';
  phoneNumber?: string;
  pushName?: string;
  qrCodeData?: string | null;
  qrCodeDataUrl?: string | null;
  lastActive?: string;
  provider?: string;
  endpointUrl?: string;
  autoReconnect?: boolean;
  pairedName?: string;
  pairedPhone?: string;
}

export interface Subscription {
  id: string;
  planName: string;
  planNameAr: string;
  startDate: string;
  endDate: string;
  maxSessions: number;
  usedSessions: number;
  price: number;
  dailyAccrualRate?: number;
  status: 'active' | 'expired_quota' | 'expired_date';
}

export interface Student {
  id: string;
  name: string;
  nameAr: string;
  barcode: string;
  photoUrl: string;
  familyId: string;
  age: number;
  birthDate?: string;
  gender?: 'female' | 'male' | 'other';
  program: 'classical' | 'contemporary' | 'youth';
  level: string;
  subscription: Subscription;
  walletBalance: number;
  maxNegativeDebt: number;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'graduated';
  assignedInstructor?: string;
  enrolledDate?: string;
  medicalNotes?: string;
  allergies?: string;
  customFields?: Record<string, string>;
}

export interface StaffMember {
  id: string;
  name: string;
  nameAr?: string;
  email: string;
  role: UserRole;
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  studio?: string;
  department?: string;
  departmentAr?: string;
  shiftStatus?: 'on_duty' | 'off_shift';
  shiftActive?: boolean;
  hireDate?: string;
  specialization?: string;
  permissions?: string[];
  createdAt?: string;
}

export interface AdmissionLead {
  id: string;
  dancerName: string;
  dancerNameAr?: string;
  age: number;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  programInterest: 'classical' | 'contemporary' | 'youth';
  stage: 'new_inquiry' | 'trial_scheduled' | 'audition_passed' | 'enrolled' | 'waitlist';
  trialDate?: string;
  preferredSlot?: string;
  source?: string;
  notes: string;
  createdAt: string;
}

export interface StudentNote {
  id: string;
  studentId: string;
  authorName: string;
  authorRole: string;
  text: string;
  category: 'general' | 'medical' | 'tuition' | 'performance';
  timestamp: string;
}

export interface SkillEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  evaluatorName: string;
  date: string;
  barreTechnique: number;
  allegroJumps: number;
  pointeStability: number;
  musicalityArtistry: number;
  remarks: string;
}

export interface CrmAuditEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  timestamp: string;
  category: 'student' | 'lead' | 'staff' | 'financial' | 'auth';
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  barcode: string;
  timestamp: string;
  classTitle: string;
  verifiedMethod: 'hid_barcode' | 'qr_camera' | 'manual';
  premiseVerified: boolean;
  wifiBssid: string;
  status: 'granted' | 'denied_expired' | 'denied_quota' | 'late';
  quotaRemaining: number;
}

export interface ProductVariant {
  size: string;
  stock: number;
}

export interface ProductItem {
  id: string;
  title: string;
  titleAr: string;
  category: 'pointe_shoes' | 'leotards' | 'tights' | 'apparel' | 'accessories';
  price: number;
  sku: string;
  variants: ProductVariant[];
  imageUrl: string;
}

export interface CartItem {
  product: ProductItem;
  size: string;
  quantity: number;
}

export interface BoutiqueOrder {
  id: string;
  studentId?: string;
  studentName?: string;
  customerName: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  paymentMethod: 'cash' | 'instapay' | 'card' | 'transfer' | 'wallet_debt';
  date: string;
  timestamp: string;
  status: 'completed' | 'refunded' | 'cancelled';
  processedBy: string;
}

export interface FinancialMetrics {
  mrr: number;
  churnRate: number;
  quotaUtilization: number;
  totalSubscriptionsSold: number;
  recognizedRevenue: number;
  deferredRevenue: number;
  retailGrossMargin: number;
  payrollExpenses: number;
  operatingExpenses: number;
  netProfit: number;
  cashOnHand?: number;
  totalInflow?: number;
  totalOutflow?: number;
}

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'maintenance'
  | 'marketing'
  | 'costumes'
  | 'software'
  | 'supplies'
  | 'other';

export interface ExpenseItem {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  categoryAr?: string;
  vendorName: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalWithTax: number;
  paymentMethod: 'cash_drawer' | 'bank_transfer' | 'credit_card' | 'check';
  status: 'paid' | 'pending' | 'scheduled';
  expenseDate: string;
  receiptUrl?: string;
  accountCode: string;
  recordedBy: string;
  notes?: string;
}

/** Student Progress Report (server-computed, derived from attendance, evaluations, certificates, subscriptions) */
export interface ProgressReport {
  student: {
    id: string;
    name: string;
    nameAr?: string;
    level: string;
    program: string;
  };
  generatedAt: string;
  attendance: {
    present: number;
    absent: number;
    rate: number | null;
    lastClass: string | null;
  };
  evaluations: {
    count: number;
    latest: {
      id: string;
      date: string;
      evaluator: string;
      barre: number;
      center: number;
      allegro: number;
      musicality: number;
      notes?: string;
    } | null;
    history: Array<{
      id: string;
      date: string;
      evaluator: string;
      barre: number;
      center: number;
      allegro: number;
      musicality: number;
      notes?: string;
    }>;
    averages: {
      barre: number | null;
      center: number | null;
      allegro: number | null;
      musicality: number | null;
    };
    trend: Record<string, number | null>;
  };
  certificates: Array<{
    id: string;
    title: string;
    titleAr?: string;
    kind: string;
    createdAt: string;
  }>;
  latestNote: {
    text: string;
    author: string;
    date: string;
  } | null;
  subscription: {
    planName: string;
    status: string;
    used: number;
    max: number;
    endDate: string;
  } | null;
}

export interface ExpenseItem {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  categoryAr?: string;
  vendorName: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalWithTax: number;
  paymentMethod: 'cash_drawer' | 'bank_transfer' | 'credit_card' | 'check';
  status: 'paid' | 'pending' | 'scheduled';
  expenseDate: string;
  receiptUrl?: string;
  accountCode: string;
  recordedBy: string;
  notes?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  studentId?: string;
  studentName?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  type: 'tuition' | 'boutique' | 'private_lesson' | 'custom';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingDue: number;
  status: 'paid' | 'partial' | 'unpaid' | 'voided';
  dueDate: string;
  items: InvoiceLineItem[];
  notes?: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  transactionNo: string;
  invoiceId?: string;
  studentId?: string;
  studentName?: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'wallet_debt';
  referenceNo?: string;
  cashierName: string;
  status: 'settled' | 'refunded' | 'disputed';
  receiptUrl?: string;
  timestamp: string;
  notes?: string;
}

export interface PayrollSlip {
  id: string;
  period: string; // e.g. '2026-08'
  staffId: string;
  staffName: string;
  staffNameAr?: string;
  role: string;
  baseSalary: number;
  hourlyRate: number;
  classesTaught: number;
  classHourlyPay: number;
  privateLessonCut: number;
  bonusAmount: number;
  deductionAmount: number;
  totalGrossPay: number;
  totalNetPay: number;
  status: 'draft' | 'pending' | 'approved' | 'paid';
  paymentMethod: 'bank_transfer' | 'cash';
  paidAt?: string;
  notes?: string;
}

export interface JournalVoucherLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalVoucher {
  id: string;
  entryNumber: string;
  date: string;
  memo: string;
  reference?: string;
  isManual: boolean;
  createdByName: string;
  lines: JournalVoucherLine[];
  totalDebit: number;
  totalCredit: number;
}

export interface CashDrawerShift {
  id: string;
  staffName: string;
  startTime: string;
  endTime?: string;
  openingFloat: number;
  cashSalesTotal: number;
  cashPayoutsTotal: number;
  expectedCash: number;
  countedCash?: number;
  variance?: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface OpenWaMessage {
  id: string;
  recipientPhone: string;
  recipientName: string;
  triggerEvent:
    | 'instructor_tardiness'
    | 'late_arrival'
    | 'quota_warning'
    | 'debt_reminder'
    | 'class_reminder'
    | 'announcement'
    | 'checkin_receipt'
    | 'purchase_receipt';
  language: 'en' | 'ar';
  body: string;
  timestamp: string;
  status: 'dispatched' | 'queued' | 'delivered';
}

export type TreasuryPurpose = 'store' | 'subscription' | 'general' | 'payroll' | 'opex';

export interface TreasuryAccount {
  id: string;
  name: string;
  purpose: TreasuryPurpose;
  openingBalance: number;
  countedBalance?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export type TreasurySource =
  | 'store_sales'
  | 'subscription'
  | 'other_income'
  | 'expense'
  | 'payroll'
  | 'transfer'
  | 'adjustment';

export interface TreasuryTransaction {
  id: string;
  accountId: string;
  kind: 'deposit' | 'withdraw';
  source: TreasurySource;
  amount: number;
  description?: string;
  date: string;
  createdBy?: string;
  paymentMethod?: 'cash' | 'instapay' | 'card' | 'transfer' | 'wallet_debt';
  referenceNo?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  slugAr?: string;
  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
  content: string;
  contentAr: string;
  coverImageUrl?: string;
  videoUrl?: string;
  videoEmbedCode?: string;
  galleryImages?: string[];
  authorName: string;
  authorNameAr?: string;
  tags: string[];
  category: string;
  status: string;
  featured: boolean;
  views: number;
  readingMinutes: number;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
