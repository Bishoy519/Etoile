export type UserRole = 'owner' | 'superadmin' | 'receptionist' | 'instructor' | 'client';
export type AppLanguage = 'en' | 'ar';
export type ActiveView = 'landing' | 'classes' | 'client_portal' | 'admin_crm' | 'blog' | 'blog_detail' | 'pay' | 'trial' | 'selfcheckin' | 'privacy' | 'terms' | 'faq';

export interface FamilyInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  remainingDue: number;
  status: string;
  agingBucket: string;
  items: { id: string; description: string; quantity: number; unitPrice: number; amount: number }[];
  payments: { id: string; amount: number; method: string; date: string; transactionNumber: string }[];
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
  birthDate?: string | null;
  program: 'classical' | 'contemporary' | 'youth';
  level: string;
  walletBalance: number; // Can be negative (Debt)
  maxNegativeDebt: number;
  subscription: Subscription;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
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

export interface AcademyBranding {
  name: string;
  nameAr: string;
  tagline: string;
  taglineAr: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  addressAr: string;
  logoUrl: string;
  socials: {
    x?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    snapchat?: string;
  };
}

export interface HeroContent {
  headlineLine1: string;
  headlineLine2: string;
  headlineLine3: string;
  headlineLine1Ar: string;
  headlineLine2Ar: string;
  headlineLine3Ar: string;
  subtitleLine1: string;
  subtitleLine2: string;
  subtitleLine1Ar: string;
  subtitleLine2Ar: string;
  ctaText: string;
  ctaTextAr: string;
  bgImageUrl: string;
}

export interface ProgramContent {
  id: string;
  key: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  bgImageUrl: string;
  ageGroup: string;
  schedule: string;
  pricePerTerm: number;
  features: string[];
  featuresAr: string[];
}

export interface FacultyMember {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  badge: string;
  bio: string;
  bioAr: string;
  photoUrl: string;
  active: boolean;
}

export interface PerformanceEvent {
  id: string;
  dates: string;
  datesAr: string;
  venue: string;
  venueAr: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  ctaText: string;
  ctaTextAr: string;
  status: 'upcoming' | 'sold_out' | 'box_office';
}

export interface PortalNotice {
  enabled: boolean;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  severity: 'info' | 'gold' | 'warning';
}

export interface FooterLink {
  id: string;
  label: string;
  labelAr: string;
  url: string;
  icon?: string;
  openInNewTab: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface PortalContentTree {
  branding: AcademyBranding;
  hero: HeroContent;
  programs: ProgramContent[];
  faculty: FacultyMember[];
  performances: PerformanceEvent[];
  notice: PortalNotice;
  footerLinks: FooterLink[];
  lastUpdated: string;
}

export interface CourseSession {
  id: string;
  courseId: string;
  groupId?: string | null;
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
    email?: string;
    department?: string;
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
  student?: Student;
  enrolledAt: string;
  status: 'active' | 'completed' | 'dropped';
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
  instructor?: {
    id: string;
    name: string;
    nameAr?: string;
    email?: string;
    department?: string;
    avatarUrl?: string;
  };
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  studioRoom?: string;
  active: boolean;
  enrollments?: CourseEnrollment[];
  sessions?: CourseSession[];
  _count?: {
    enrollments: number;
    sessions: number;
  };
}

export interface InstructorUser {
  id: string;
  name: string;
  nameAr?: string;
  cardCode?: string;
  email: string;
  role: string;
  phone?: string;
  specialty?: string;
  avatarUrl?: string;
}

export interface StudentScheduleData {
  student: {
    id: string;
    name: string;
    nameAr?: string;
    barcode: string;
    level: string;
    parentName: string;
    parentPhone: string;
    avatarUrl?: string;
  };
  subscription: {
    id: string;
    planName: string;
    planNameAr?: string;
    totalSessions: number;
    remainingSessions: number;
    usedSessions: number;
    startDate: string;
    endDate: string;
    status: string;
    daysRemaining: number;
  } | null;
  enrolledCourses: CourseItem[];
  upcomingSessions: CourseSession[];
}

export interface InstructorScheduleData {
  instructor: {
    id: string;
    name: string;
    nameAr?: string;
    cardCode?: string;
    role: string;
    department?: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
  assignedCourses: (CourseItem & { enrollments?: any[] })[];
  weeklySessions: CourseSession[];
  totalStudentsCount: number;
}



