import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserRole,
  AppLanguage,
  ActiveView,
  Student,
  AttendanceRecord,
  ProductItem,
  CartItem,
  OpenWaMessage,
  FinancialMetrics,
  PortalContentTree,
  CourseItem,
  CourseSession,
  InstructorUser,
  StudentScheduleData,
  InstructorScheduleData,
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_PRODUCTS,
  INITIAL_ATTENDANCE,
  INITIAL_FINANCIALS,
  INITIAL_OPENWA_MESSAGES,
} from '../data/initialState';
import { formatCurrency } from '../utils/currency';
import {
  api,
  rawApi,
  errMsg,
  setSessionTokens,
  clearClientSession,
  revokeClientSession,
  startSilentRefresh,
} from '../utils/api';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'gold';
}

interface AppContextType {
  userRole: UserRole;
  language: AppLanguage;
  direction: 'ltr' | 'rtl';
  activeView: ActiveView;
  activeBlogSlug: string | null;
  setActiveBlogSlug: (slug: string | null) => void;
  activePayRef: string | null;
  setActivePayRef: (ref: string | null) => void;
  activeCheckinToken: string | null;
  setActiveCheckinToken: (token: string | null) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  activeStudentId: string;
  students: Student[];
  attendanceLogs: AttendanceRecord[];
  products: ProductItem[];
  cart: CartItem[];
  openWaQueue: OpenWaMessage[];
  financials: FinancialMetrics;
  toasts: ToastData[];
  instructorUser: InstructorUser | null;
  studentSchedule: StudentScheduleData | null;
  instructorSchedule: InstructorScheduleData | null;
  courses: CourseItem[];
  courseSessions: CourseSession[];
  setUserRole: (role: UserRole) => void;
  setLanguage: (lang: AppLanguage) => void;
  setActiveView: (view: ActiveView) => void;
  setActiveStudentId: (id: string) => void;
  loginWithCardCode: (cardCode: string, password?: string) => Promise<{
    success: boolean;
    mustChangePassword?: boolean;
    userType?: 'student' | 'instructor';
    cardCode?: string;
    maskedPhone?: string;
    message?: string;
    error?: string;
  }>;

  requestInitialPassword: (cardCode: string) => Promise<{
    success: boolean;
    userType?: 'student' | 'instructor';
    maskedPhone?: string;
    message?: string;
    error?: string;
  }>;
  completeFirstTimeSetup: (cardCode: string, tempPassword: string, newPassword: string) => Promise<{
    success: boolean;
    userType?: 'student' | 'instructor';
    message?: string;
    error?: string;
  }>;
  requestPasswordResetOtp: (cardCode: string) => Promise<{
    success: boolean;
    maskedPhone?: string;
    message?: string;
    error?: string;
  }>;
  resetPasswordWithOtp: (cardCode: string, otp: string, newPassword: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  fetchStudentSchedule: (studentIdentifier: string) => Promise<StudentScheduleData | null>;
  fetchInstructorSchedule: (instructorIdentifier: string) => Promise<InstructorScheduleData | null>;
  loginInstructor: (identifier: string, password?: string) => Promise<boolean>;
  logoutInstructor: () => void;
  fetchCoursesAndSessions: () => Promise<void>;
  triggerSessionReminder: (sessionId: string) => Promise<any>;
  broadcastClassMessage: (courseId: string, message: string) => Promise<any>;
  checkInStudent: (barcode: string, method?: 'hid_barcode' | 'qr_camera' | 'manual') => {
    success: boolean;
    student?: Student;
    reason?: string;
    record?: AttendanceRecord;
  };
  addToCart: (product: ProductItem, size: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  clearCart: () => void;
  checkoutCart: (paymentMethod: 'cash' | 'card' | 'transfer' | 'wallet_debt', targetStudentId?: string) => {
    success: boolean;
    error?: string;
  };
  triggerOpenWaAlert: (
    event: OpenWaMessage['triggerEvent'],
    recipientPhone: string,
    recipientName: string,
    customBody?: string
  ) => void;
  currentFamilyId: string | null;

  logoutFamily: () => void;
  settleStudentDebt: (studentId: string, amount: number) => void;
  updateSubscriptionQuota: (studentId: string, deltaSessions: number) => void;
  showToast: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'gold') => void;
  removeToast: (id: string) => void;
  playAudioChime: (type: 'success' | 'error' | 'warning') => void;
  portalContent: PortalContentTree;
  refreshPortalContent: () => Promise<void>;
  refreshFamily: () => Promise<void>;
}


const DEFAULT_PORTAL_CONTENT: PortalContentTree = {
  branding: {
    name: 'Étoile Ballet Academy',
    nameAr: 'أكاديمية إيتوال للباليه',
    tagline: 'Excellence in Classical and Contemporary Dance',
    taglineAr: 'الريادة والتميز في فنون الباليه الكلاسيكي والرقص المعاصر',
    phone: '+20 2 2736 0000',
    email: 'contact@etoile.eg',
    website: 'https://etoile.eg',
    address: 'Zamalek Main Campus & New Cairo Studio, Cairo, Egypt',
    addressAr: 'فرع الزمالك الرئيسي وأستوديو التجمع الخامس، القاهرة، مصر',
    logoUrl: '/favicon.png',
    socials: {
      x: 'https://x.com/etoileacademy',
      facebook: 'https://facebook.com/etoileacademy',
      instagram: 'https://instagram.com/etoileacademy',
      youtube: 'https://youtube.com/etoileacademy',
    },
  },
  hero: {
    headlineLine1: 'ÉTOILE',
    headlineLine2: 'BALLET',
    headlineLine3: 'ACADEMY',
    headlineLine1Ar: 'أكاديمية',
    headlineLine2Ar: 'إيتوال',
    headlineLine3Ar: 'للباليه',
    subtitleLine1: 'Excellence in Classical and',
    subtitleLine2: 'Contemporary Dance',
    subtitleLine1Ar: 'الريادة والتميز في فنون',
    subtitleLine2Ar: 'الباليه الكلاسيكي والرقص المعاصر',
    ctaText: 'Discover Our Academy',
    ctaTextAr: 'اكتشف برامج الأكاديمية',
    bgImageUrl: '/hero-ballerina.jpg',
  },
  programs: [
    {
      id: 'PROG-CLASSICAL',
      key: 'classical',
      title: 'Classical Ballet',
      titleAr: 'الباليه الكلاسيكي',
      description: 'Classical ballet is designed to cultivate professional poise, high discipline and classical technique.',
      descriptionAr: 'تدريب تأسيسي كلاسيكي يبني أعلى درجات الانضباط الحركي والرشاقة الخالدة وفق المعايير العالمية.',
      bgImageUrl: '/hero-ballerina.jpg',
      ageGroup: 'Ages 8 - 18+',
      schedule: 'Mon, Wed, Fri (4:00 PM - 7:30 PM)',
      pricePerTerm: 480,
      features: [
        'Vaganova & Paris Opéra syllabus alignment',
        'Pointe work & Pas de Deux partnering',
        'Annual Grand Théâtre repertoire performance',
      ],
      featuresAr: [
        'منهج فاجانوفا ومدرسة أوبرا باريس',
        'تدريب البوانت والشراكة الثنائية',
        'المشاركة في العرض السنوي على المسرح الكبير',
      ],
    },
    {
      id: 'PROG-CONTEMPORARY',
      key: 'contemporary',
      title: 'Contemporary Dance',
      titleAr: 'الرقص المعاصر',
      description: 'Contemporary dance fosters modern innovation and artistic excellence alongside classical tradition.',
      descriptionAr: 'يوازن الرقص المعاصر بين التعبير الحر والأساليب الكلاسيكية التقليدية الصارمة لخلق فنان متكامل.',
      bgImageUrl: '/hero-ballerina.jpg',
      ageGroup: 'Ages 12 - 20+',
      schedule: 'Tue, Thu, Sat (5:00 PM - 8:00 PM)',
      pricePerTerm: 520,
      features: [
        'Gaga movement & Cunningham technique',
        'Fluid floorwork and choreographic creation',
        'Guest residencies with European soloist directors',
      ],
      featuresAr: [
        'تقنيات حركة غاغا وكانينغهام',
        'العمل الأرضي السلس والتأليف الحركي',
        'ورش تدريبية مع مديري فرق أوروبية زائرين',
      ],
    },
    {
      id: 'PROG-YOUTH',
      key: 'youth',
      title: 'Youth Program',
      titleAr: 'برنامج الناشئين',
      description: 'Youth Program is designed to inspire young dancers with creative technique and early classical training.',
      descriptionAr: 'يقدم للراقصين الصغار مهارات حركية أساسية وتدريباً هيكلياً آمناً بروح مرحة وغرس حب المسرح.',
      bgImageUrl: '/hero-ballerina.jpg',
      ageGroup: 'Ages 4 - 11',
      schedule: 'Sat, Sun (10:00 AM - 1:00 PM)',
      pricePerTerm: 260,
      features: [
        'Creative musicality and anatomical posture safety',
        'Early turnout conditioning without joint strain',
        'Winter Revelry Nutcracker company participation',
      ],
      featuresAr: [
        'تطوير الحس الإيقاعي وسلامة المحاذاة الجسدية',
        'تأسيس المرونة السليمة دون إجهاد المفاصل',
        'المشاركة في عرض كسارة البندق الشتوي للناشئين',
      ],
    },
  ],
  faculty: [
    {
      id: 'FAC-001',
      name: 'Madame Elena Rostova',
      nameAr: 'مدام إيلينا روستوفا',
      role: 'Artistic Director & Paris Opéra Soliste',
      roleAr: 'المديرة الفنية وسوليست سابقة في أوبرا باريس',
      badge: 'Étoile',
      bio: '25 years of stage mastery interpreting Petipa, Balanchine, and MacMillan repertoire across Europe.',
      bioAr: '25 عاماً من الإبداع المسرحي في تجسيد روائع بيتيبا وبلانشين وماكميلان على أكبر مسارح أوروبا.',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      active: true,
    },
    {
      id: 'FAC-002',
      name: 'Julian Moreau',
      nameAr: 'جوليان مورو',
      role: 'Head of Contemporary Movement',
      roleAr: 'رئيس قسم الرقص والحركة المعاصرة',
      badge: 'Soliste',
      bio: 'Former Principal Soloist at Nederlands Dans Theater. Blends fluid floorwork with architectural alignment.',
      bioAr: 'راقص أول سابق في مسرح الرقص الهولندي، يجمع بين انسيابية الحركة الأرضية ودقة البناء التعبيري.',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      active: true,
    },
    {
      id: 'FAC-003',
      name: 'Sofia Chen',
      nameAr: 'صوفيا تشن',
      role: 'Director of Youth Pedagogy',
      roleAr: 'مديرة برامج تدريب وبيداغوجيا الناشئين',
      badge: 'Youth Head',
      bio: 'Royal Ballet Upper School alumna, specializing in child kinesiology and anatomical safety.',
      bioAr: 'خريجة مدرسة الباليه الملكي العليا، متخصصة في علم حركة الأطفال وسلامة المحاذاة الجسدية.',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      active: true,
    },
  ],
  performances: [
    {
      id: 'PERF-001',
      dates: 'May 14–17, 2026',
      datesAr: '14–17 مايو 2026',
      venue: 'Grand Théâtre',
      venueAr: 'المسرح الكبير',
      title: 'Swan Lake // Acts II & IV',
      titleAr: 'بحيرة البجع // الفصلان الثاني والرابع',
      description: "Tchaikovsky's legendary score with authentic Petipa Ivanov staging and luminescent golden corps de ballet choreography.",
      descriptionAr: 'موسيقى تشايكوفسكي الخالدة برؤية بيتيبا وإيفانوف الأصلية وأداء كور دي باليه مذهب ينبض بالروعة.',
      ctaText: 'Inquire About Box Seats',
      ctaTextAr: 'حجز مقاعد كبار الزوار',
      status: 'upcoming',
    },
    {
      id: 'PERF-002',
      dates: 'July 22–25, 2026',
      datesAr: '22–25 يوليو 2026',
      venue: 'Palais des Arts',
      venueAr: 'قصر الفنون',
      title: 'Chroma & Cadence Contemporary Gala',
      titleAr: 'حفل كروما وكادانس للرقص المعاصر',
      description: 'World premiere contemporary choreography pairing neoclassical geometry with minimalist chamber ensemble.',
      descriptionAr: 'عرض أول عالمي يجمع بين هندسة الكلاسيكية الحديثة ومقطوعات موسيقية حية لفرقة الحجرة.',
      ctaText: 'Inquire About Box Seats',
      ctaTextAr: 'حجز مقاعد كبار الزوار',
      status: 'upcoming',
    },
    {
      id: 'PERF-003',
      dates: 'Dec 18–23, 2026',
      datesAr: '18–23 ديسمبر 2026',
      venue: 'Metropolitan Opera',
      venueAr: 'دار أوبرا المتروبوليتان',
      title: 'The Nutcracker: Winter Revelry',
      titleAr: 'كسارة البندق: احتفالية الشتاء',
      description: 'Featuring celebrated Youth and Pre-Professional companies in a breathtaking holiday spectacle of golden snow.',
      descriptionAr: 'بمشاركة نجوم برامج الناشئين والمستوى قبل الاحترافي في استعراض عطلات ساحر يبهر الأنظار.',
      ctaText: 'Inquire About Box Seats',
      ctaTextAr: 'حجز مقاعد كبار الزوار',
      status: 'upcoming',
    },
  ],
  notice: {
    enabled: true,
    title: 'Spring Term Repertoire Auditions Open',
    titleAr: 'بدء اختبارات أداء الموسم الربيعي',
    message: 'Pre-Professional students may register for soloist audition slots at the front desk or via WhatsApp.',
    messageAr: 'يمكن لطلاب المستوى قبل الاحترافي التسجيل لتجارب أداء الأدوار الفردية لدى الاستقبال أو عبر واتساب.',
    severity: 'gold',
  },
  footerLinks: [
    { id: 'FL-001', label: 'Privacy Policy', labelAr: 'سياسة الخصوصية', url: '/privacy', icon: 'fa-shield-halved', openInNewTab: false, enabled: true, sortOrder: 1 },
    { id: 'FL-002', label: 'Terms & Conditions', labelAr: 'الشروط والأحكام', url: '/terms', icon: 'fa-file-contract', openInNewTab: false, enabled: true, sortOrder: 2 },
    { id: 'FL-003', label: 'FAQs', labelAr: 'الأسئلة الشائعة', url: '/faq', icon: 'fa-circle-question', openInNewTab: false, enabled: true, sortOrder: 3 },
    { id: 'FL-004', label: 'Careers', labelAr: 'فرص العمل', url: '/careers', icon: 'fa-briefcase', openInNewTab: false, enabled: true, sortOrder: 4 },
    { id: 'FL-005', label: 'Press & Media', labelAr: 'الإعلام والصحافة', url: '/media', icon: 'fa-newspaper', openInNewTab: false, enabled: true, sortOrder: 5 },
  ],
  lastUpdated: new Date().toISOString(),
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// Web Audio synthesizer for tactile reception feedback
const playAudioChime = (type: 'success' | 'error' | 'warning') => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Warm golden dual bell chime (E5 -> G#5 -> B5)
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
      // Low dual warning buzzer
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
    // Audio contexts may be silenced by browser policy until interaction
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [activeView, setActiveView] = useState<ActiveView>('landing');
  const [activeBlogSlug, setActiveBlogSlug] = useState<string | null>(null);
  const [activePayRef, setActivePayRef] = useState<string | null>(null);
  const [activeCheckinToken, setActiveCheckinToken] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('checkin');
    } catch {
      return null;
    }
  });
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(null);
  // Global navbar search — single source of truth shared by header,
  // classes catalog and journal so typing in the navbar actually filters.
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openWaQueue, setOpenWaQueue] = useState<OpenWaMessage[]>([]);
  const [financials, setFinancials] = useState<FinancialMetrics>(INITIAL_FINANCIALS);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Courses, Sessions & Instructor Authentication State
  const [instructorUser, setInstructorUser] = useState<InstructorUser | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [studentSchedule, setStudentSchedule] = useState<StudentScheduleData | null>(null);
  const [instructorSchedule, setInstructorSchedule] = useState<InstructorScheduleData | null>(null);

  const [portalContent, setPortalContent] = useState<PortalContentTree>(() => {
    const cached = localStorage.getItem('etoile_portal_cms_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // use default
      }
    }
    return DEFAULT_PORTAL_CONTENT;
  });

  const fetchStudentSchedule = async (studentIdentifier: string): Promise<StudentScheduleData | null> => {
    try {
      const { data } = await api.get(`/api/courses/student/my-schedule/${studentIdentifier}`);
      const schedule: StudentScheduleData = data;
      setStudentSchedule(schedule);
      return schedule;
    } catch (err) {
      console.error('Failed to fetch student schedule:', err);
    }
    return null;
  };

  const fetchInstructorSchedule = async (instructorIdentifier: string): Promise<InstructorScheduleData | null> => {
    try {
      const { data } = await api.get(`/api/courses/instructor/my-schedule/${instructorIdentifier}`);
      const schedule: InstructorScheduleData = data;
      setInstructorSchedule(schedule);
      return schedule;
    } catch (err) {
      console.error('Failed to fetch instructor schedule:', err);
    }
    return null;
  };

  const fetchCoursesAndSessions = async () => {
    try {
      const [crsRes, sesRes] = await Promise.all([
        api.get('/api/courses'),
        api.get('/api/courses/sessions'),
      ]);
      if (Array.isArray(crsRes.data)) setCourses(crsRes.data);
      if (Array.isArray(sesRes.data)) setCourseSessions(sesRes.data);
    } catch {
      // offline / local
    }
  };


  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/api/pos/products');
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch {
      // offline / fallback
    }
  };

  const refreshPortalContent = async () => {
    try {
      const { data } = await api.get('/api/portal-content');
      setPortalContent(data);
      localStorage.setItem('etoile_portal_cms_cache', JSON.stringify(data));
    } catch {
      // offline / fallback to local cache
    }
  };

  const restoreFamilySession = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('etoile_family_token') : null;
    if (!token) return;

    try {
      const { data } = await api.get('/api/auth/family/me');
      applyFamilyData(data);
    } catch (e: any) {
      // Dead session (rejected even after transparent refresh) — drop the
      // whole slot. Offline (no response) keeps the cached session.
      if (e?.response) clearClientSession('family');
    }
  };

  const applyFamilyData = (data: any) => {
    setCurrentFamilyId(data.familyId);
    if (Array.isArray(data.students) && data.students.length > 0) {
      setStudents(data.students);
      setActiveStudentId((prev) => prev || data.students[0].id);
      fetchStudentSchedule(data.students[0].id);
      const familyLogs: AttendanceRecord[] = [];
      data.students.forEach((s: any) => {
        if (Array.isArray(s.attendanceLogs)) {
          familyLogs.push(...s.attendanceLogs);
        }
      });
      if (familyLogs.length > 0) {
        setAttendanceLogs(familyLogs);
      }
    }
  };

  /** Re-pull the household (profiles, quotas, birthdates) after portal edits. */
  const refreshFamily = async () => {
    try {
      const { data } = await api.get('/api/auth/family/me');
      applyFamilyData(data);
    } catch {
      // offline — keep cache
    }
  };

  const restoreInstructorSession = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('etoile_instructor_token') : null;
    if (!token) return;

    try {
      const { data: user } = await api.get('/api/auth/me');
      setInstructorUser(user);
      setUserRole(user.role);
      fetchInstructorSchedule(user.id);
    } catch (e: any) {
      // Dead session (rejected even after transparent refresh) — drop the
      // slot. Offline (no response) keeps the cached session.
      if (e?.response) clearClientSession('instructor');
    }
  };


  useEffect(() => {
    refreshPortalContent();
    fetchProducts();
    restoreFamilySession();
    restoreInstructorSession();
    fetchCoursesAndSessions();
    const stopSilentRefresh = startSilentRefresh();
    return stopSilentRefresh;
  }, []);

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    showToast(
      lang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language set to English',
      lang === 'ar' ? 'واجهة ثنائية الاتجاه مجهزة بالكامل (RTL)' : 'Dual-directional LTR interface activated',
      'gold'
    );
  };

  const showToast = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'gold' = 'gold') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fast-track Check-in: server-authoritative when online (single source of
  // truth in PostgreSQL), with the same local optimistic path as offline fallback.
  const checkInStudent = (barcode: string, method: 'hid_barcode' | 'qr_camera' | 'manual' = 'hid_barcode') => {
    const cleanCode = barcode.trim().toUpperCase();
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('etoile_family_token') || localStorage.getItem('etoile_instructor_token')
        : null;

    if (token) {
      // Fire-and-forget reconciliation is wrong for quota decisions — but this
      // context API is synchronous, so we apply the local verdict immediately
      // and reconcile from the server record when it arrives.
      void (async () => {
        try {
          const { data } = await api.post('/api/attendance/checkin', { barcode: cleanCode, method });
          if (data && data.success && data.record) {
            const rec = data.record;
            setAttendanceLogs((prev) => [
              {
                id: rec.id,
                studentId: rec.studentId,
                studentName: rec.studentName,
                barcode: rec.barcode,
                timestamp: rec.timestamp,
                classTitle: rec.classTitle,
                verifiedMethod: rec.verifiedMethod,
                premiseVerified: rec.premiseVerified,
                wifiBssid: rec.wifiBssid,
                status: rec.status,
                quotaRemaining: rec.quotaRemaining,
              },
              ...prev.filter((r) => r.id !== rec.id),
            ]);
            if (typeof data.quotaRemaining === 'number' && data.student?.id) {
              setStudents((prev) =>
                prev.map((s) =>
                  s.id === data.student.id
                    ? {
                        ...s,
                        subscription: {
                          ...s.subscription,
                          usedSessions: Math.max(0, s.subscription.maxSessions - data.quotaRemaining),
                        },
                      }
                    : s
                )
              );
            }
          }
        } catch {
          // offline — local verdict stands
        }
      })();
    }

    const student = students.find((s) => s.barcode.toUpperCase() === cleanCode || s.id.toUpperCase() === cleanCode);

    if (!student) {
      playAudioChime('error');
      showToast('Scan Rejected', `Barcode ${cleanCode} does not match any registered student.`, 'error');
      return { success: false, reason: 'Unknown student barcode' };
    }

    const sub = student.subscription;
    const now = new Date();
    const expDate = new Date(sub.endDate);

    // Hybrid validation race condition:
    // Expired if sessions used >= max OR if current date > end date
    if (now > expDate) {
      playAudioChime('error');
      showToast(
        'Check-in Denied: Plan Expired',
        `${student.name}'s plan expired on ${sub.endDate}. Renewal required.`,
        'error'
      );
      // Dispatch automated WhatsApp reminder via OpenWA
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

    // Success check-in: decrement quota
    const updatedSessions = sub.usedSessions + 1;
    const remaining = sub.maxSessions - updatedSessions;

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

    showToast(
      'Check-in Authorized',
      `${student.name} verified. Remaining sessions: ${remaining} / ${sub.maxSessions}.`,
      'success'
    );

    // Trigger quota alert if <= 2 sessions remaining
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

  // Cart Management
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

  const removeFromCart = (productId: string, size: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.size === size)));
  };

  const clearCart = () => setCart([]);

  // POS Checkout with Negative Wallet (Debt) support
  const checkoutCart = (
    paymentMethod: 'cash' | 'card' | 'transfer' | 'wallet_debt',
    targetStudentId?: string
  ) => {
    if (cart.length === 0) return { success: false, error: 'Cart is empty' };

    const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const student = targetStudentId ? students.find((s) => s.id === targetStudentId) : students[0];

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

      // Charge student wallet into negative balance
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

      // Trigger automated WhatsApp Debt Notification via OpenWA
      triggerOpenWaAlert(
        'debt_reminder',
        student.parentPhone,
        student.parentName,
        `Étoile Boutique: Purchase of ${formatCurrency(totalAmount, language)} charged to ${student.name}'s account. Current outstanding ledger balance: ${formatCurrency(projectedBalance, language)}.`
      );

      showToast(
        'Charged to Negative Wallet',
        `${formatCurrency(totalAmount, language)} charged to ${student.name}. New ledger balance: ${formatCurrency(projectedBalance, language)}.`,
        'warning'
      );
    } else {
      showToast(
        'Payment Complete',
        `Processed ${formatCurrency(totalAmount, language)} via ${paymentMethod.toUpperCase()}.${student?.parentPhone ? ' WhatsApp receipt sent.' : ''}`,
        'success'
      );
    }

    // Send itemized WhatsApp purchase receipt to the parent phone
    if (student?.parentPhone) {
      const itemLines = cart
        .map((i) => `• ${i.product.title} (${i.size}) ×${i.quantity} — EGP ${(i.product.price * i.quantity).toFixed(2)}`)
        .join('\n');

      const receiptBody =
        `🧾 *Étoile Ballet Academy — Purchase Receipt*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Customer:* ${student.name}\n` +
        `📅 *Date:* ${new Date().toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n` +
        `🛍️ *Items:*\n${itemLines}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 *Total:* EGP ${totalAmount.toFixed(2)}\n` +
        `💳 *Payment:* ${paymentMethod.toUpperCase()}${paymentMethod === 'wallet_debt' ? ' (Charged to Account)' : ''}\n` +
        `✅ *Status:* Confirmed & Paid\n\n` +
        `Thank you for shopping at Étoile Boutique! 🌟\n` +
        `شكراً لتسوقكم في بوتيك إيتوال! 🌟`;

      triggerOpenWaAlert(
        'purchase_receipt',
        student.parentPhone,
        student.parentName || student.name,
        receiptBody
      );
    }

    // Update financial revenue
    setFinancials((prev) => ({
      ...prev,
      retailGrossMargin: prev.retailGrossMargin + totalAmount * 0.45,
      netProfit: prev.netProfit + totalAmount * 0.45,
    }));

    // Sync the boutique sale to the server ledger (authoritative pricing and
    // stock live in PostgreSQL). Failures surface as toasts; the local
    // optimistic update above keeps the kiosk usable offline.
    const syncToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('etoile_family_token') || localStorage.getItem('etoile_instructor_token')
        : null;
    if (syncToken) {
      const payload = {
        items: cart.map((i) => ({
          productId: i.product.id,
          title: i.product.title,
          size: i.size,
          quantity: i.quantity,
          price: i.product.price,
        })),
        paymentMethod,
        studentId: targetStudentId,
      };
      api.post('/api/pos/checkout', payload)
        .then(() => {
          // Reconcile catalog stock from the server after an accepted sale.
          api.get('/api/pos/products')
            .then((r) => r.data)
            .then((data) => {
              if (Array.isArray(data)) setProducts(data);
            })
            .catch(() => {});
        })
        .catch((e: any) => {
          // Offline (no response) stays silent — the local optimistic update
          // above keeps the kiosk usable; only server rejections toast.
          if (!e?.response) return;
          showToast(
            'Server Ledger Rejected Sale',
            errMsg(e, 'The boutique sale was recorded locally but rejected by the server ledger.'),
            'error'
          );
        });
    }

    clearCart();
    return { success: true };
  };

  const triggerOpenWaAlert = async (
    event: OpenWaMessage['triggerEvent'],
    recipientPhone: string,
    recipientName: string,
    customBody?: string
  ) => {
    // Central transport attaches any portal session (family/instructor) and
    // refreshes it transparently; logged-out callers simply skip the server.
    try {
      await api.post('/api/openwa/dispatch', {
        recipientPhone,
        recipientName,
        triggerEvent: event,
        language,
        customBody,
      });
    } catch (err) {
      console.warn('Could not dispatch OpenWA message via API:', err);
    }

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
  };

  const settleStudentDebt = async (studentId: string, amount: number) => {
    try {
      await api.patch(`/api/students/${studentId}/wallet`, { amount });
    } catch {
      // offline fallback
    }
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
    showToast(
      language === 'ar' ? 'تم قيد السداد' : 'Payment Applied',
      language === 'ar'
        ? `تم تسجيل سداد ${formatCurrency(amount, 'ar')} بنجاح في حساب الطالب.`
        : `Settlement of ${formatCurrency(amount, 'en')} credited to student ledger.`,
      'success'
    );
  };

  const updateSubscriptionQuota = async (studentId: string, deltaSessions: number) => {
    try {
      await api.patch(`/api/students/${studentId}/quota`, { delta: deltaSessions });
    } catch {
      // offline fallback
    }
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
    showToast('Subscription Updated', `Quota adjusted for student.`, 'gold');
  };



  const logoutFamily = () => {
    // Best-effort server revocation, then local cleanup (slot-scoped: an
    // instructor session in the same browser is untouched).
    revokeClientSession('family').catch(() => {});
    setCurrentFamilyId(null);
    setStudents([]);
    setActiveStudentId('');
    setActiveView('landing');
    showToast(
      language === 'ar' ? 'تم تسجيل الخروج' : 'Signed Out',
      language === 'ar' ? 'تم إنهاء جلسة بوابة العائلة بنجاح' : 'Family portal session closed.',
      'gold'
    );
  };

  const loginInstructor = async (identifier: string, password?: string): Promise<boolean> => {
    const clean = identifier.trim();
    if (!clean) return false;

    try {
      const { data } = await rawApi.post('/api/auth/login', { identifier: clean, password: password || '' });

      if (data.access_token) {
        setSessionTokens(data.access_token, data.refresh_token, 'instructor');
      }
      setInstructorUser(data.user);
      setUserRole(data.user.role);
      await fetchCoursesAndSessions();
      setActiveView('client_portal');
      showToast(
        language === 'ar' ? 'تم تسجيل دخول هيئة التدريس' : 'Faculty Session Authorized',
        language === 'ar' ? `مرحباً بعودتك، ${data.user.name}` : `Welcome back, ${data.user.name}`,
        'gold'
      );
      return true;
    } catch (err) {
      console.error('Instructor login failed:', err);
    }
    return false;
  };

  const logoutInstructor = () => {
    revokeClientSession('instructor').catch(() => {});
    setInstructorUser(null);
    setInstructorSchedule(null);
    setActiveView('landing');
    showToast(
      language === 'ar' ? 'تم تسجيل الخروج' : 'Signed Out',
      language === 'ar' ? 'تم إنهاء جلسة بوابة هيئة التدريس بنجاح' : 'Faculty portal session closed.',
      'gold'
    );
  };

  // --------------------------------------------------------------------------
  // CARD CODE & WHATSAPP AUTHENTICATION FLOWS
  // --------------------------------------------------------------------------
  const loginWithCardCode = async (
    cardCode: string,
    password?: string
  ): Promise<{
    success: boolean;
    mustChangePassword?: boolean;
    userType?: 'student' | 'instructor';
    cardCode?: string;
    maskedPhone?: string;
    message?: string;
    error?: string;
  }> => {
    const clean = cardCode.trim();
    if (!clean) {
      return { success: false, error: 'Please enter your Academy Card Code.' };
    }

    try {
      const { data } = await rawApi.post('/api/auth/card-login', { cardCode: clean, password: password || '' });

      // Check if user must change password (first time login)
      if (data.mustChangePassword) {
        return {
          success: true,
          mustChangePassword: true,
          userType: data.userType,
          cardCode: data.cardCode,
          maskedPhone: data.maskedPhone,
          message: data.message,
        };
      }

      // Normal Login for Student (and Parents using Student Credentials)
      if (data.userType === 'student') {
        if (data.access_token) {
          setSessionTokens(data.access_token, data.refresh_token, 'family');
        }
        setCurrentFamilyId(data.familyId || data.student?.familyId || data.student.id);
        setStudents([data.student]);
        setActiveStudentId(data.student.id);
        await Promise.all([
          fetchStudentSchedule(data.student.id),
          fetchCoursesAndSessions(),
          refreshFamily(),
        ]);
        setActiveView('client_portal');
        showToast(
          language === 'ar' ? 'تم الدخول بنجاح' : 'Session Authorized',
          language === 'ar' ? `أهلاً بك يا ${data.student.name}` : `Welcome to your portal, ${data.student.name}`,
          'gold'
        );
        return { success: true, mustChangePassword: false, userType: 'student' };
      }

      // Normal Login for Instructor
      if (data.userType === 'instructor') {
        if (data.access_token) {
          setSessionTokens(data.access_token, data.refresh_token, 'instructor');
        }
        setInstructorUser(data.user);
        setUserRole(data.user.role);
        await Promise.all([
          fetchInstructorSchedule(data.user.id),
          fetchCoursesAndSessions(),
        ]);
        setActiveView('client_portal');
        showToast(
          language === 'ar' ? 'تم دخول هيئة التدريس' : 'Faculty Pass Verified',
          language === 'ar' ? `مرحباً بعودتك، ${data.user.name}` : `Welcome back, ${data.user.name}`,
          'gold'
        );
        return { success: true, mustChangePassword: false, userType: 'instructor' };
      }

      return { success: false, error: 'Unrecognized user type.' };
    } catch (err) {
      return { success: false, error: errMsg(err, 'Network connection failed.') };
    }
  };

  const requestInitialPassword = async (
    cardCode: string
  ): Promise<{
    success: boolean;
    userType?: 'student' | 'instructor';
    maskedPhone?: string;
    message?: string;
    error?: string;
  }> => {
    try {
      const { data } = await rawApi.post('/api/auth/request-initial-password', { cardCode: cardCode.trim() });
      return {
        success: true,
        userType: data.userType,
        maskedPhone: data.maskedPhone,
        message: data.message,
      };
    } catch (err) {
      return { success: false, error: errMsg(err, 'Network connection error.') };
    }
  };

  const completeFirstTimeSetup = async (
    cardCode: string,
    tempPassword: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    userType?: 'student' | 'instructor';
    message?: string;
    error?: string;
  }> => {
    try {
      const { data } = await rawApi.post('/api/auth/first-time-setup', { cardCode: cardCode.trim(), tempPassword, newPassword });

      if (data.userType === 'student') {
        if (data.access_token) {
          setSessionTokens(data.access_token, data.refresh_token, 'family');
        }
        setCurrentFamilyId(data.student.id);
        setStudents([data.student]);
        setActiveStudentId(data.student.id);
        await Promise.all([
          fetchStudentSchedule(data.student.id),
          fetchCoursesAndSessions(),
        ]);
        setActiveView('client_portal');
      } else if (data.userType === 'instructor') {
        if (data.access_token) {
          setSessionTokens(data.access_token, data.refresh_token, 'instructor');
        }
        setInstructorUser(data.user);
        setUserRole(data.user.role);
        await Promise.all([
          fetchInstructorSchedule(data.user.id),
          fetchCoursesAndSessions(),
        ]);
        setActiveView('client_portal');
      }

      showToast(
        language === 'ar' ? 'تم إنشاء كلمة المرور بنجاح' : 'Password Established!',
        data.message || 'Welcome to your Étoile Portal.',
        'gold'
      );

      return { success: true, userType: data.userType, message: data.message };
    } catch (err) {
      return { success: false, error: errMsg(err, 'Network connection error.') };
    }
  };

  const requestPasswordResetOtp = async (
    cardCode: string
  ): Promise<{
    success: boolean;
    maskedPhone?: string;
    message?: string;
    error?: string;
  }> => {
    try {
      const { data } = await rawApi.post('/api/auth/forgot-password/request-otp', { cardCode: cardCode.trim() });
      return {
        success: true,
        maskedPhone: data.maskedPhone,
        message: data.message,
      };
    } catch (err) {
      return { success: false, error: errMsg(err, 'Network connection error.') };
    }
  };

  const resetPasswordWithOtp = async (
    cardCode: string,
    otp: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    try {
      const { data } = await rawApi.post('/api/auth/forgot-password/reset', { cardCode: cardCode.trim(), otp: otp.trim(), newPassword });
      showToast(
        language === 'ar' ? 'تم تغيير كلمة المرور' : 'Password Reset Successfully',
        data.message || 'You can now sign in with your new password.',
        'gold'
      );
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: errMsg(err, 'Network connection error.') };
    }
  };



  const triggerSessionReminder = async (sessionId: string) => {
    try {
      const { data } = await api.post(`/api/courses/sessions/${sessionId}/send-reminder`);
      showToast(
        language === 'ar' ? 'تم إرسال التذكيرات' : 'WhatsApp Reminders Sent',
        language === 'ar'
          ? `تم إرسال تذكيرات الحصة لـ ${data.dispatched?.length || 0} طالب ومدرب.`
          : `Class reminders dispatched to ${data.dispatched?.length || 0} students and instructor.`,
        'success'
      );
      await fetchCoursesAndSessions();
      return data;
    } catch {
      showToast('Error', 'Failed to dispatch session reminders.', 'error');
    }
    return null;
  };

  const broadcastClassMessage = async (courseId: string, message: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('etoile_instructor_token') || localStorage.getItem('etoile_admin_token') || localStorage.getItem('etoile_token')
      : null;

    let apiDispatched = false;
    if (token) {
      try {
        await api.post(`/api/courses/${courseId}/broadcast`, { message });
        apiDispatched = true;
      } catch (err) {
        console.warn('Failed to broadcast via API, falling back to local queue:', err);
      }
    }

    if (!apiDispatched) {
      const enrollments = course.enrollments || [];
      enrollments.forEach((e) => {
        const student = e.student || students.find((s) => s.id === e.studentId);
        if (student && student.parentPhone) {
          triggerOpenWaAlert('class_reminder', student.parentPhone, student.parentName, message);
        }
      });
    }

    showToast(
      language === 'ar' ? 'تم تعميم الإشعار' : 'Class Broadcast Sent',
      language === 'ar'
        ? `تم إرسال التعميم لجميع طلاب دورة ${course.title}.`
        : `Broadcast dispatched to students enrolled in ${course.title}.`,
      'success'
    );
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        language,
        direction,
        activeView,
        activeBlogSlug,
        activePayRef,
        activeCheckinToken,
        activeStudentId,
        currentFamilyId,
        instructorUser,
        studentSchedule,
        instructorSchedule,
        courses,
        courseSessions,
        students,
        attendanceLogs,
        products,
        cart,
        openWaQueue,
        financials,
        toasts,
        setUserRole,
        setLanguage,
        setActiveView,
        setActiveBlogSlug,
        setActivePayRef,
        setActiveCheckinToken,
        setActiveStudentId,
        globalSearchQuery,
        setGlobalSearchQuery,
        loginWithCardCode,
        requestInitialPassword,
        completeFirstTimeSetup,
        requestPasswordResetOtp,
        resetPasswordWithOtp,
        fetchStudentSchedule,
        fetchInstructorSchedule,
        logoutFamily,
        loginInstructor,
        logoutInstructor,
        fetchCoursesAndSessions,
        triggerSessionReminder,
        broadcastClassMessage,
        checkInStudent,
        addToCart,
        removeFromCart,
        clearCart,
        checkoutCart,
        triggerOpenWaAlert,
        settleStudentDebt,
        updateSubscriptionQuota,
        showToast,
        removeToast,
        playAudioChime,
        portalContent,
        refreshPortalContent,
        refreshFamily,
      }}
    >
      {children}
    </AppContext.Provider>
  );

};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
