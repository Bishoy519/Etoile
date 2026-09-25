import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api } from '../utils/api';
import { ModuleSubSidebar } from './ModuleSubSidebar';
import {
  Globe,
  Image as ImageIcon,
  Sparkles,
  Users,
  Calendar,
  Layers,
  Save,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Megaphone,
  Check,
  Building,
  Phone,
  Mail,
  Edit3,
  Link,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  History,
} from 'lucide-react';
import { CmsVersionsView } from './CmsVersionsView';

interface AcademyBranding {
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

interface HeroContent {
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

interface ProgramContent {
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

interface FacultyMember {
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

interface PerformanceEvent {
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

interface PortalNotice {
  enabled: boolean;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  severity: 'info' | 'gold' | 'warning';
}

interface FooterLink {
  id: string;
  label: string;
  labelAr: string;
  url: string;
  icon?: string;
  openInNewTab: boolean;
  enabled: boolean;
  sortOrder: number;
}

interface PortalContentTree {
  branding: AcademyBranding;
  hero: HeroContent;
  programs: ProgramContent[];
  faculty: FacultyMember[];
  performances: PerformanceEvent[];
  notice: PortalNotice;
  footerLinks: FooterLink[];
  lastUpdated: string;
}

const DEFAULT_CONTENT: PortalContentTree = {
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

type CmsTab = 'hero' | 'branding' | 'programs' | 'faculty' | 'performances' | 'notice' | 'footer' | 'versions';

export const PortalCmsEditor: React.FC = () => {
  const { language, showToast } = useAdmin();
  const [activeSubTab, setActiveSubTab] = useState<CmsTab>('hero');
  const [content, setContent] = useState<PortalContentTree>(() => {
    const cached = localStorage.getItem('etoile_portal_cms_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // use default
      }
    }
    return DEFAULT_CONTENT;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  // Load latest content from API
  useEffect(() => {
    let isMounted = true;
    const fetchContent = async () => {
      try {
        const { data } = await api.get('/api/portal-content');
        if (isMounted && data) {
          setContent(data);
          localStorage.setItem('etoile_portal_cms_cache', JSON.stringify(data));
          setBackendConnected(true);
        }
      } catch {
        if (isMounted) setBackendConnected(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchContent();
    return () => {
      isMounted = false;
    };
  }, []);

  // Authenticated CMS mutations go through the central transport (transparent
  // session refresh); the public content GET above stays on the same client.
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('etoile_portal_cms_cache', JSON.stringify(content));
      const { data: updated } = await api.put('/api/portal-content', content);

      setContent(updated);
      setBackendConnected(true);
      showToast(
        language === 'ar' ? 'تم الحفظ والمزامنة بنجاح' : 'Changes Saved & Synced',
        language === 'ar'
          ? 'تم تحديث جميع بيانات بوابة وموقع الأكاديمية ونشرها للمستخدمين فوراً.'
          : 'All client portal content and images have been saved and pushed to the live website.',
        'success'
      );
    } catch {
      showToast(
        language === 'ar' ? 'تم الحفظ محلياً' : 'Saved Locally',
        language === 'ar'
          ? 'تم حفظ التعديلات في المتصفح، وسيتم مزامنتها مع الخادم عند الاتصال.'
          : 'Changes saved in browser session. Backend will sync once connected.',
        'gold'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (
      !window.confirm(
        language === 'ar'
          ? 'هل أنت متأكد من استعادة المحتوى الافتراضي بالكامل؟ ستفقد التعديلات غير المحفوظة.'
          : 'Are you sure you want to reset all portal content back to academy defaults?'
      )
    ) {
      return;
    }

    try {
      const { data } = await api.post('/api/portal-content/reset', {});
      setContent(data);
      localStorage.setItem('etoile_portal_cms_cache', JSON.stringify(data));
      showToast(
        language === 'ar' ? 'تمت الاستعادة' : 'Reset to Defaults',
        language === 'ar' ? 'تمت استعادة الإعدادات الأصلية بنجاح.' : 'Original content restored successfully.',
        'gold'
      );
    } catch {
      setContent(DEFAULT_CONTENT);
      localStorage.setItem('etoile_portal_cms_cache', JSON.stringify(DEFAULT_CONTENT));
    }
  };

  // Add Faculty
  const handleAddFaculty = () => {
    const newMember: FacultyMember = {
      id: `FAC-${Date.now().toString(36).toUpperCase()}`,
      name: 'New Master / Instructor',
      nameAr: 'أستاذ / مدرب باليه جديد',
      role: 'Principal Ballet Coach',
      roleAr: 'مدرب باليه رئيسي',
      badge: 'Soliste',
      bio: 'Specialist in classical partnering and stage repertoire technique.',
      bioAr: 'متخصص في تقنيات الشراكة الثنائية والريبرتوار المسرحي الكلاسيكي.',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      active: true,
    };
    setContent((prev) => ({
      ...prev,
      faculty: [...prev.faculty, newMember],
    }));
  };

  const handleDeleteFaculty = (id: string) => {
    setContent((prev) => ({
      ...prev,
      faculty: prev.faculty.filter((f) => f.id !== id),
    }));
  };

  // Add Performance
  const handleAddPerformance = () => {
    const newPerf: PerformanceEvent = {
      id: `PERF-${Date.now().toString(36).toUpperCase()}`,
      dates: 'October 15–18, 2026',
      datesAr: '15–18 أكتوبر 2026',
      venue: 'Grand Théâtre',
      venueAr: 'المسرح الكبير',
      title: 'Giselle // Autumn Premiere',
      titleAr: 'جيزيل // افتتاحية الخريف',
      description: 'Romantic ballet masterpiece presented with full live Philharmonic accompaniment.',
      descriptionAr: 'تحفة الباليه الرومانسي الخالدة بمصاحبة أوركسترا الفيلهارموني الحية بالكامل.',
      ctaText: 'Inquire About Box Seats',
      ctaTextAr: 'حجز مقاعد كبار الزوار',
      status: 'upcoming',
    };
    setContent((prev) => ({
      ...prev,
      performances: [...prev.performances, newPerf],
    }));
  };

  const handleDeletePerformance = (id: string) => {
    setContent((prev) => ({
      ...prev,
      performances: prev.performances.filter((p) => p.id !== id),
    }));
  };

  // Footer Links handlers
  const handleAddFooterLink = () => {
    const maxSort = (content.footerLinks || []).reduce((max, l) => Math.max(max, l.sortOrder), 0);
    const newLink: FooterLink = {
      id: `FL-${Date.now().toString(36).toUpperCase()}`,
      label: 'New Link',
      labelAr: 'رابط جديد',
      url: '/',
      icon: 'fa-link',
      openInNewTab: false,
      enabled: true,
      sortOrder: maxSort + 1,
    };
    setContent(prev => ({
      ...prev,
      footerLinks: [...(prev.footerLinks || []), newLink],
    }));
  };

  const handleDeleteFooterLink = (id: string) => {
    setContent(prev => ({
      ...prev,
      footerLinks: (prev.footerLinks || []).filter(l => l.id !== id),
    }));
  };

  const handleMoveFooterLink = (id: string, direction: 'up' | 'down') => {
    setContent(prev => {
      const links = [...(prev.footerLinks || [])].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = links.findIndex(l => l.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= links.length) return prev;
      const tmpSort = links[idx].sortOrder;
      links[idx] = { ...links[idx], sortOrder: links[swapIdx].sortOrder };
      links[swapIdx] = { ...links[swapIdx], sortOrder: tmpSort };
      return { ...prev, footerLinks: links };
    });
  };

  const updateFooterLink = (id: string, updates: Partial<FooterLink>) => {
    setContent(prev => ({
      ...prev,
      footerLinks: (prev.footerLinks || []).map(l => l.id === id ? { ...l, ...updates } : l),
    }));
  };

  const subTabs: { id: CmsTab; label: string; labelAr: string; icon: React.ReactNode }[] = [
    { id: 'hero', label: 'Hero Section', labelAr: 'الواجهة الرئيسية (Hero)', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'branding', label: 'Branding & Contacts', labelAr: 'الهوية والتواصل', icon: <Building className="w-4 h-4" /> },
    { id: 'programs', label: 'Training Programs', labelAr: 'البرامج التدريبية', icon: <Layers className="w-4 h-4" /> },
    { id: 'faculty', label: 'Faculty & Masters', labelAr: 'هيئة التدريس', icon: <Users className="w-4 h-4" /> },
    { id: 'performances', label: 'Performance Season', labelAr: 'موسم العروض', icon: <Calendar className="w-4 h-4" /> },
    { id: 'notice', label: 'Portal Announcement', labelAr: 'إعلان البوابة', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'footer', label: 'Footer Links', labelAr: 'روابط التذييل', icon: <Link className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      
      {/* Top Banner & Control Bar */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#F43F5E] text-xs font-mono uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4 text-[#F43F5E]" />
            <span>{language === 'ar' ? 'إدارة محتوى بوابة وموقع الأكاديمية' : 'Public & Client Portal CMS'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
            <span className="status-pill-emerald px-2 py-0.5 text-[10px] font-medium">
              {backendConnected === false ? 'Local Storage Mode' : 'Live REST API Connected'}
            </span>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-white">
            {language === 'ar' ? 'محرر محتوى بوابة العملاء والموقع' : 'Website & Client Portal Content Manager'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {language === 'ar'
              ? 'تعديل كافة العناوين، والصور، وأسماء الأساتذة، وبرامج التدريب، وجدول العروض التي تظهر في بوابة وموقع الأكاديمية.'
              : 'Customize hero headlines, background imagery, faculty profiles, training programs, and performance shows in real time.'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={(import.meta as any).env?.VITE_CLIENT_URL || 'http://localhost:5173'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 hover:border-[#F43F5E]/40 bg-[#111622] hover:bg-[#1c2333] text-xs font-semibold text-[#F43F5E] hover:text-[#fb7185] transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'معاينة الموقع المباشر' : 'Live Client Portal'}</span>
          </a>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-[#111622] hover:bg-[#1c2333] text-xs text-slate-300 hover:text-white transition cursor-pointer"
            title="Reset to default content"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'استعادة الافتراضي' : 'Reset'}</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="action-btn-coral flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ التعديلات ونشرها' : 'Save & Publish')}</span>
          </button>
        </div>
      </div>

      {/* Sub-Sidebar & Section Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <ModuleSubSidebar<CmsTab>
          activeId={activeSubTab}
          onChange={setActiveSubTab}
          language={language}
          title="CMS Sections"
          titleAr="أقسام الموقع"
          items={[
            { id: 'hero', label: 'Hero Section', labelAr: 'الواجهة الرئيسية (Hero)', icon: <ImageIcon className="w-4 h-4" /> },
            { id: 'branding', label: 'Branding & Contacts', labelAr: 'الهوية والتواصل', icon: <Building className="w-4 h-4" /> },
            { id: 'programs', label: 'Training Programs', labelAr: 'البرامج التدريبية', icon: <Layers className="w-4 h-4" />, count: content.programs.length },
            { id: 'faculty', label: 'Faculty & Masters', labelAr: 'هيئة التدريس', icon: <Users className="w-4 h-4" />, count: content.faculty.length },
            { id: 'performances', label: 'Performance Season', labelAr: 'موسم العروض', icon: <Calendar className="w-4 h-4" />, count: content.performances.length },
            { id: 'notice', label: 'Portal Announcement', labelAr: 'إعلان البوابة', icon: <Megaphone className="w-4 h-4" /> },
            { id: 'footer', label: 'Footer Links', labelAr: 'روابط التذييل', icon: <Link className="w-4 h-4" />, count: (content.footerLinks || []).length },
            { id: 'versions', label: 'Version History', labelAr: 'سجل النسخ', icon: <History className="w-4 h-4" /> },
          ]}
          actionButton={
            activeSubTab === 'faculty'
              ? {
                  label: 'Add Faculty',
                  labelAr: 'إضافة أستاذ جديد',
                  icon: <Plus className="w-4 h-4" />,
                  onClick: handleAddFaculty,
                }
              : activeSubTab === 'performances'
              ? {
                  label: 'Add Show',
                  labelAr: 'إضافة عرض مسرحي',
                  icon: <Plus className="w-4 h-4" />,
                  onClick: handleAddPerformance,
                }
              : activeSubTab === 'footer'
              ? {
                  label: 'Add Link',
                  labelAr: 'إضافة رابط',
                  icon: <Plus className="w-4 h-4" />,
                  onClick: handleAddFooterLink,
                }
              : undefined
          }
        />

        <div className="flex-1 min-w-0 w-full space-y-6">

      {/* ======================= TAB 1: HERO SECTION ======================= */}
      {activeSubTab === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="lg:col-span-7 bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>{language === 'ar' ? 'تخصيص الواجهة الرئيسية (Hero Section)' : 'Hero Section Elements'}</span>
              </h2>
              <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Landing Page Header
              </span>
            </div>

            {/* Headline English */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white block">
                Main Headline (English - 3 Lines Stacked)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={content.hero.headlineLine1}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, headlineLine1: e.target.value } })}
                  placeholder="Line 1 (e.g. ÉTOILE)"
                  className="px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                />
                <input
                  type="text"
                  value={content.hero.headlineLine2}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, headlineLine2: e.target.value } })}
                  placeholder="Line 2 (e.g. BALLET)"
                  className="px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                />
                <input
                  type="text"
                  value={content.hero.headlineLine3}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, headlineLine3: e.target.value } })}
                  placeholder="Line 3 (e.g. ACADEMY)"
                  className="px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            {/* Headline Arabic */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-rose-400 block text-right">
                العنوان الرئيسي (باللغة العربية - 3 أسطر)
              </label>
              <div className="grid grid-cols-3 gap-2" dir="rtl">
                <input
                  type="text"
                  value={content.hero.headlineLine1Ar}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, headlineLine1Ar: e.target.value } })}
                  placeholder="السطر 1 (أكاديمية)"
                  className="px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                />
                <input
                  type="text"
                  value={content.hero.headlineLine2Ar}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, headlineLine2Ar: e.target.value } })}
                  placeholder="السطر 2 (إيتوال)"
                  className="px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                />
                <input
                  type="text"
                  value={content.hero.headlineLine3Ar}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, headlineLine3Ar: e.target.value } })}
                  placeholder="السطر 3 (للباليه)"
                  className="px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                />
              </div>
            </div>

            {/* Subtitles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white block">Subtitle (English)</label>
                <input
                  type="text"
                  value={content.hero.subtitleLine1}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, subtitleLine1: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none mb-1.5"
                  placeholder="Line 1"
                />
                <input
                  type="text"
                  value={content.hero.subtitleLine2}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, subtitleLine2: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                  placeholder="Line 2"
                />
              </div>

              <div className="space-y-2" dir="rtl">
                <label className="text-xs font-semibold text-rose-400 block text-right">الوصف الفرعي (العربية)</label>
                <input
                  type="text"
                  value={content.hero.subtitleLine1Ar}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, subtitleLine1Ar: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans mb-1.5"
                  placeholder="السطر 1"
                />
                <input
                  type="text"
                  value={content.hero.subtitleLine2Ar}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, subtitleLine2Ar: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                  placeholder="السطر 2"
                />
              </div>
            </div>

            {/* CTA Button Text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-white block mb-1.5">Primary CTA Button (EN)</label>
                <input
                  type="text"
                  value={content.hero.ctaText}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, ctaText: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                />
              </div>
              <div dir="rtl">
                <label className="text-xs font-semibold text-rose-400 block mb-1.5 text-right">زر الحث على اتخاذ إجراء (عربي)</label>
                <input
                  type="text"
                  value={content.hero.ctaTextAr}
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, ctaTextAr: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                />
              </div>
            </div>

            {/* Background Image URL & Presets */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <label className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Hero Background Image URL</span>
                <span className="text-[10px] text-[var(--text-muted)] font-normal">Direct link or asset path</span>
              </label>
              <input
                type="text"
                value={content.hero.bgImageUrl}
                onChange={(e) => setContent({ ...content, hero: { ...content.hero, bgImageUrl: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] text-[var(--text-muted)]">Image Presets:</span>
                <button
                  type="button"
                  onClick={() => setContent({ ...content, hero: { ...content.hero, bgImageUrl: '/hero-ballerina.jpg' } })}
                  className="px-2 py-1 rounded bg-[#161c28] border border-[var(--border-subtle)] text-[10px] text-rose-400 hover:border-rose-500 transition"
                >
                  Golden Ballerina (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setContent({ ...content, hero: { ...content.hero, bgImageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1600&q=80' } })}
                  className="px-2 py-1 rounded bg-[#161c28] border border-[var(--border-subtle)] text-[10px] text-rose-400 hover:border-rose-500 transition"
                >
                  Theatrical Stage
                </button>
                <button
                  type="button"
                  onClick={() => setContent({ ...content, hero: { ...content.hero, bgImageUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1600&q=80' } })}
                  className="px-2 py-1 rounded bg-[#161c28] border border-[var(--border-subtle)] text-[10px] text-rose-400 hover:border-rose-500 transition"
                >
                  Pointe Arabesque
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="lg:col-span-5 bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Real-Time Hero Preview</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Live Rendering</span>
              </div>

              {/* Preview Box */}
              <div className="relative rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[380px] border border-rose-500/30 flex flex-col justify-between p-6 bg-black">
                {/* Background Image */}
                <img
                  src={content.hero.bgImageUrl}
                  alt="Hero Preview"
                  className="absolute inset-0 w-full h-full object-cover brightness-90 filter contrast-105 pointer-events-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/hero-ballerina.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 space-y-3">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-rose-400 font-mono block">
                    Étoile Ballet Academy
                  </span>
                  <div className="font-serif text-3xl sm:text-4xl text-[#f5eedc] font-normal leading-tight uppercase gold-text-gradient">
                    {content.hero.headlineLine1}<br />
                    {content.hero.headlineLine2}<br />
                    {content.hero.headlineLine3}
                  </div>
                  <p className="text-xs text-[#dcd2bd]/90 max-w-[220px] leading-relaxed">
                    {content.hero.subtitleLine1} {content.hero.subtitleLine2}
                  </p>
                </div>

                <div className="relative z-10 pt-4">
                  <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4a03e] via-[#e5bf65] to-[#c79430] text-black font-serif text-xs font-bold tracking-wider shadow-lg">
                    {content.hero.ctaText}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] mt-4">
              Tip: Click &quot;Save & Publish&quot; at the top to commit your changes to the live client portal.
            </p>
          </div>
        </div>
      )}

      {/* ======================= TAB 2: BRANDING & CONTACTS ======================= */}
      {activeSubTab === 'branding' && (
        <div className="bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 space-y-6 shadow-lg">
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'بيانات الهوية والتواصل' : 'Academy Identity, Address & Social Media'}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">Academy Official Name (EN)</label>
              <input
                type="text"
                value={content.branding.name}
                onChange={(e) => setContent({ ...content, branding: { ...content.branding, name: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
              />
            </div>
            <div dir="rtl">
              <label className="text-xs font-semibold text-rose-400 block mb-1.5 text-right">اسم الأكاديمية الرسمي (عربي)</label>
              <input
                type="text"
                value={content.branding.nameAr}
                onChange={(e) => setContent({ ...content, branding: { ...content.branding, nameAr: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">Official Phone Number</label>
              <input
                type="text"
                value={content.branding.phone}
                onChange={(e) => setContent({ ...content, branding: { ...content.branding, phone: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">General Inquiry Email</label>
              <input
                type="email"
                value={content.branding.email}
                onChange={(e) => setContent({ ...content, branding: { ...content.branding, email: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">Website URL</label>
              <input
                type="text"
                value={content.branding.website}
                onChange={(e) => setContent({ ...content, branding: { ...content.branding, website: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">Brand Logo Asset URL</label>
              <input
                type="text"
                value={content.branding.logoUrl}
                onChange={(e) => setContent({ ...content, branding: { ...content.branding, logoUrl: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">Physical Studio Address (EN)</label>
              <input
                type="text"
                value={content.branding.address}
                onChange={(e) => setContent({ ...content, branding: { ...content.branding, address: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
              />
            </div>
            <div dir="rtl">
              <label className="text-xs font-semibold text-rose-400 block mb-1.5 text-right">عنوان المقر والاستوديو (عربي)</label>
              <input
                type="text"
                value={content.branding.addressAr}
                onChange={(e) => setContent({ ...content, branding: { ...content.branding, addressAr: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {language === 'ar' ? 'قنوات التواصل الاجتماعي' : 'Social Media Channels'}
              </h3>
              <span className="text-[10px] text-[var(--text-muted)] italic">
                {language === 'ar' ? 'أفرغ الحقل لإخفاء الأيقونة من الموقع' : 'Clear a field to hide its icon from the footer'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mb-1">
                  <i className="fa-brands fa-x-twitter text-xs"></i> X (Twitter)
                </label>
                <input
                  type="text"
                  value={content.branding.socials.x || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      branding: {
                        ...content.branding,
                        socials: { ...content.branding.socials, x: e.target.value },
                      },
                    })
                  }
                  placeholder="https://x.com/..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mb-1">
                  <i className="fa-brands fa-instagram text-xs"></i> Instagram
                </label>
                <input
                  type="text"
                  value={content.branding.socials.instagram || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      branding: {
                        ...content.branding,
                        socials: { ...content.branding.socials, instagram: e.target.value },
                      },
                    })
                  }
                  placeholder="https://instagram.com/..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mb-1">
                  <i className="fa-brands fa-facebook-f text-xs"></i> Facebook
                </label>
                <input
                  type="text"
                  value={content.branding.socials.facebook || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      branding: {
                        ...content.branding,
                        socials: { ...content.branding.socials, facebook: e.target.value },
                      },
                    })
                  }
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mb-1">
                  <i className="fa-brands fa-youtube text-xs"></i> YouTube
                </label>
                <input
                  type="text"
                  value={content.branding.socials.youtube || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      branding: {
                        ...content.branding,
                        socials: { ...content.branding.socials, youtube: e.target.value },
                      },
                    })
                  }
                  placeholder="https://youtube.com/..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mb-1">
                  <i className="fa-brands fa-tiktok text-xs"></i> TikTok
                </label>
                <input
                  type="text"
                  value={content.branding.socials.tiktok || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      branding: {
                        ...content.branding,
                        socials: { ...content.branding.socials, tiktok: e.target.value },
                      },
                    })
                  }
                  placeholder="https://tiktok.com/@..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mb-1">
                  <i className="fa-brands fa-snapchat text-xs"></i> Snapchat
                </label>
                <input
                  type="text"
                  value={content.branding.socials.snapchat || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      branding: {
                        ...content.branding,
                        socials: { ...content.branding.socials, snapchat: e.target.value },
                      },
                    })
                  }
                  placeholder="https://snapchat.com/add/..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 3: TRAINING PROGRAMS ======================= */}
      {activeSubTab === 'programs' && (
        <div className="space-y-6">
          <div className="bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-400" />
                <span>{language === 'ar' ? 'تعديل البرامج التدريبية المتاحة' : 'Academy Training Programs & Syllabus'}</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {language === 'ar' ? 'تعديل نصوص وبطاقات برامج الباليه والرقص المعاصر والناشئين.' : 'Update titles, descriptions, age brackets, pricing, and curriculum highlights.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {content.programs.map((prog, idx) => (
              <div
                key={prog.id || idx}
                className="bg-[#171d2b] border border-[#F43F5E]/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      {prog.key}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      ${prog.pricePerTerm} / term
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white block mb-1">Program Title (EN)</label>
                    <input
                      type="text"
                      value={prog.title}
                      onChange={(e) => {
                        const next = [...content.programs];
                        next[idx].title = e.target.value;
                        setContent({ ...content, programs: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                    />
                  </div>

                  <div dir="rtl">
                    <label className="text-[11px] font-semibold text-rose-400 block mb-1 text-right">عنوان البرنامج (عربي)</label>
                    <input
                      type="text"
                      value={prog.titleAr}
                      onChange={(e) => {
                        const next = [...content.programs];
                        next[idx].titleAr = e.target.value;
                        setContent({ ...content, programs: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white block mb-1">Description (EN)</label>
                    <textarea
                      rows={3}
                      value={prog.description}
                      onChange={(e) => {
                        const next = [...content.programs];
                        next[idx].description = e.target.value;
                        setContent({ ...content, programs: next });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none resize-none"
                    />
                  </div>

                  <div dir="rtl">
                    <label className="text-[11px] font-semibold text-rose-400 block mb-1 text-right">الوصف (عربي)</label>
                    <textarea
                      rows={3}
                      value={prog.descriptionAr}
                      onChange={(e) => {
                        const next = [...content.programs];
                        next[idx].descriptionAr = e.target.value;
                        setContent({ ...content, programs: next });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-1">Age Bracket</label>
                      <input
                        type="text"
                        value={prog.ageGroup}
                        onChange={(e) => {
                          const next = [...content.programs];
                          next[idx].ageGroup = e.target.value;
                          setContent({ ...content, programs: next });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-1">Price per Term ($)</label>
                      <input
                        type="number"
                        value={prog.pricePerTerm}
                        onChange={(e) => {
                          const next = [...content.programs];
                          next[idx].pricePerTerm = parseFloat(e.target.value) || 0;
                          setContent({ ...content, programs: next });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-rose-400/80 font-mono bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  {prog.schedule}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= TAB 4: FACULTY & MASTERS ======================= */}
      {activeSubTab === 'faculty' && (
        <div className="space-y-6">
          <div className="bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-400" />
                <span>{language === 'ar' ? 'هيئة كبار الأساتذة والمدربين' : 'Distinguished Faculty & Ballet Masters'}</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {language === 'ar' ? 'إضافة وتعديل بيانات المعلمين والمدربين وصورهم الشخصية وألقابهم.' : 'Manage instructor names, bios, badges, and portrait photos.'}
              </p>
            </div>
            <button
              onClick={handleAddFaculty}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-500-light text-black font-semibold text-xs transition active:scale-95 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'إضافة أستاذ جديد' : 'Add Faculty Member'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.faculty.map((member, idx) => (
              <div
                key={member.id}
                className="bg-[#171d2b] border border-[#F43F5E]/35 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-rose-500 transition duration-200"
              >
                <div className="space-y-3">
                  {/* Photo & Badge Header */}
                  <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-3">
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-rose-500/60 shadow-md shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[9px] font-bold text-black uppercase bg-rose-500 px-2 py-0.5 rounded-full mb-1">
                        {member.badge}
                      </span>
                      <span className="block text-xs font-bold text-white truncate">
                        {member.name}
                      </span>
                      <span className="block text-[10px] text-[var(--text-muted)] truncate">
                        {member.role}
                      </span>
                    </div>
                    <button
                      onClick={() => { if (window.confirm("Delete this faculty member?")) handleDeleteFaculty(member.id); }}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition"
                      title="Delete Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Name fields */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10.5px] font-semibold text-white block mb-1">Name (EN)</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const next = [...content.faculty];
                          next[idx].name = e.target.value;
                          setContent({ ...content, faculty: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                      />
                    </div>
                    <div dir="rtl">
                      <label className="text-[10.5px] font-semibold text-rose-400 block mb-1 text-right">الاسم (عربي)</label>
                      <input
                        type="text"
                        value={member.nameAr}
                        onChange={(e) => {
                          const next = [...content.faculty];
                          next[idx].nameAr = e.target.value;
                          setContent({ ...content, faculty: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                      />
                    </div>
                  </div>

                  {/* Role / Title */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10.5px] font-semibold text-white block mb-1">Role / Title (EN)</label>
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) => {
                          const next = [...content.faculty];
                          next[idx].role = e.target.value;
                          setContent({ ...content, faculty: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                      />
                    </div>
                    <div dir="rtl">
                      <label className="text-[10.5px] font-semibold text-rose-400 block mb-1 text-right">المسمى الوظيفي (عربي)</label>
                      <input
                        type="text"
                        value={member.roleAr}
                        onChange={(e) => {
                          const next = [...content.faculty];
                          next[idx].roleAr = e.target.value;
                          setContent({ ...content, faculty: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                      />
                    </div>
                  </div>

                  {/* Badge & Photo URL */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10.5px] text-[var(--text-muted)] block mb-1">Badge Tag</label>
                      <input
                        type="text"
                        value={member.badge}
                        onChange={(e) => {
                          const next = [...content.faculty];
                          next[idx].badge = e.target.value;
                          setContent({ ...content, faculty: next });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-[var(--text-muted)] block mb-1">Photo URL</label>
                      <input
                        type="text"
                        value={member.photoUrl}
                        onChange={(e) => {
                          const next = [...content.faculty];
                          next[idx].photoUrl = e.target.value;
                          setContent({ ...content, faculty: next });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white outline-none font-mono text-[10px]"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="text-[10.5px] font-semibold text-white block mb-1">Short Bio (EN)</label>
                    <textarea
                      rows={2}
                      value={member.bio}
                      onChange={(e) => {
                        const next = [...content.faculty];
                        next[idx].bio = e.target.value;
                        setContent({ ...content, faculty: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none resize-none"
                    />
                  </div>
                  <div dir="rtl">
                    <label className="text-[10.5px] font-semibold text-rose-400 block mb-1 text-right">نبذة فنية (عربي)</label>
                    <textarea
                      rows={2}
                      value={member.bioAr}
                      onChange={(e) => {
                        const next = [...content.faculty];
                        next[idx].bioAr = e.target.value;
                        setContent({ ...content, faculty: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Visible in Faculty Section</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= TAB 5: PERFORMANCE SEASON ======================= */}
      {activeSubTab === 'performances' && (
        <div className="space-y-6">
          <div className="bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-400" />
                <span>{language === 'ar' ? 'عروض الموسم المسرحي' : 'Performance Season & Repertoire'}</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {language === 'ar' ? 'تعديل تواريخ المسارح، وأسماء العروض، ونصوص حجز التذاكر.' : 'Manage productions, performance dates, venues, and ticket inquiry CTAs.'}
              </p>
            </div>
            <button
              onClick={handleAddPerformance}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-500-light text-black font-semibold text-xs transition active:scale-95 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'إضافة عرض جديد' : 'Add Production'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.performances.map((perf, idx) => (
              <div
                key={perf.id}
                className="bg-[#171d2b] border border-[#F43F5E]/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <span className="text-[10px] font-semibold text-rose-400 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30">
                      {perf.dates}
                    </span>
                    <button
                      onClick={() => { if (window.confirm("Delete this production?")) handleDeletePerformance(perf.id); }}
                      className="p-1 rounded text-rose-400 hover:text-rose-200 transition"
                      title="Delete Production"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white block mb-1">Production Title (EN)</label>
                    <input
                      type="text"
                      value={perf.title}
                      onChange={(e) => {
                        const next = [...content.performances];
                        next[idx].title = e.target.value;
                        setContent({ ...content, performances: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                    />
                  </div>

                  <div dir="rtl">
                    <label className="text-[11px] font-semibold text-rose-400 block mb-1 text-right">عنوان العرض (عربي)</label>
                    <input
                      type="text"
                      value={perf.titleAr}
                      onChange={(e) => {
                        const next = [...content.performances];
                        next[idx].titleAr = e.target.value;
                        setContent({ ...content, performances: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-1">Dates Range</label>
                      <input
                        type="text"
                        value={perf.dates}
                        onChange={(e) => {
                          const next = [...content.performances];
                          next[idx].dates = e.target.value;
                          setContent({ ...content, performances: next });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-1">Theater / Venue</label>
                      <input
                        type="text"
                        value={perf.venue}
                        onChange={(e) => {
                          const next = [...content.performances];
                          next[idx].venue = e.target.value;
                          setContent({ ...content, performances: next });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white block mb-1">Synopsis / Description</label>
                    <textarea
                      rows={3}
                      value={perf.description}
                      onChange={(e) => {
                        const next = [...content.performances];
                        next[idx].description = e.target.value;
                        setContent({ ...content, performances: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-muted)] italic truncate max-w-[150px]">{perf.venue}</span>
                  <span className="text-rose-400 font-semibold uppercase text-[10px]">{perf.ctaText}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= TAB 6: PORTAL ANNOUNCEMENT ======================= */}
      {activeSubTab === 'notice' && (
        <div className="bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 space-y-6 shadow-lg">
          <div className="border-b border-[var(--border-subtle)] pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'إعلان وتنبيه بوابة العائلات' : 'Family Portal Announcement Banner'}</span>
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={content.notice.enabled}
                onChange={(e) => setContent({ ...content, notice: { ...content.notice, enabled: e.target.checked } })}
                className="w-4 h-4 accent-[#F43F5E]"
              />
              <span className="text-xs text-white font-medium">
                {content.notice.enabled ? (language === 'ar' ? 'مفعل' : 'Banner Active') : (language === 'ar' ? 'معطل' : 'Banner Disabled')}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">Banner Title (EN)</label>
              <input
                type="text"
                value={content.notice.title}
                onChange={(e) => setContent({ ...content, notice: { ...content.notice, title: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
              />
            </div>
            <div dir="rtl">
              <label className="text-xs font-semibold text-rose-400 block mb-1.5 text-right">عنوان التنبيه (عربي)</label>
              <input
                type="text"
                value={content.notice.titleAr}
                onChange={(e) => setContent({ ...content, notice: { ...content.notice, titleAr: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">Announcement Message (EN)</label>
              <textarea
                rows={3}
                value={content.notice.message}
                onChange={(e) => setContent({ ...content, notice: { ...content.notice, message: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none resize-none"
              />
            </div>
            <div dir="rtl">
              <label className="text-xs font-semibold text-rose-400 block mb-1.5 text-right">نص الرسالة (عربي)</label>
              <textarea
                rows={3}
                value={content.notice.messageAr}
                onChange={(e) => setContent({ ...content, notice: { ...content.notice, messageAr: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans resize-none"
              />
            </div>
          </div>

          {/* Live Banner Preview */}
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">
              Preview of Announcement Banner in Client Portal
            </span>
            <div className="rounded-2xl border border-rose-500/50 bg-gradient-to-r from-[#171c26] to-[#12161f] p-4 flex items-start gap-3 shadow-md">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-rose-400">{content.notice.title}</h4>
                <p className="text-xs text-[#dcd2bd]/90 mt-0.5 leading-relaxed">{content.notice.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 7: FOOTER LINKS ======================= */}
      {activeSubTab === 'footer' && (
        <div className="bg-[#171d2b] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Link className="w-4 h-4 text-rose-400" />
              <span>{language === 'ar' ? 'إدارة روابط التذييل (Footer)' : 'Footer Quick Links Manager'}</span>
            </h2>
            <button
              onClick={handleAddFooterLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-500-light text-black text-xs font-semibold transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إضافة رابط' : 'Add Link'}</span>
            </button>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {language === 'ar'
              ? 'أضف وعدّل الروابط التي تظهر في تذييل الموقع (Footer) للعملاء. يمكنك تعديل العنوان بالعربية والإنجليزية، الرابط، الأيقونة، وترتيب الظهور.'
              : 'Add and manage the navigation links displayed in the client portal footer. Each link supports bilingual labels, Font Awesome icons, custom URLs, and sort ordering.'}
          </p>

          {(!content.footerLinks || content.footerLinks.length === 0) ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-xs">
              <Link className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)] opacity-40" />
              <p>{language === 'ar' ? 'لم تتم إضافة أي روابط بعد.' : 'No footer links added yet.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...(content.footerLinks || [])]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((link, idx, arr) => (
                  <div
                    key={link.id}
                    className={`rounded-xl border ${
                      link.enabled
                        ? 'border-rose-500/30 bg-[#161c2b]'
                        : 'border-slate-700/40 bg-[#111622] opacity-60'
                    } p-4 space-y-3 transition-all`}
                  >
                    {/* Link Header Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold border border-rose-500/30">
                          {idx + 1}
                        </span>
                        {link.icon && (
                          <i className={`fa-solid ${link.icon} text-sm text-rose-400`}></i>
                        )}
                        <span className="text-xs font-semibold text-white">{link.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">→ {link.url}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Move Up */}
                        <button
                          onClick={() => handleMoveFooterLink(link.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded-lg hover:bg-[#1e2436] text-[var(--text-secondary)] hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        {/* Move Down */}
                        <button
                          onClick={() => handleMoveFooterLink(link.id, 'down')}
                          disabled={idx === arr.length - 1}
                          className="p-1 rounded-lg hover:bg-[#1e2436] text-[var(--text-secondary)] hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        {/* Toggle Enabled */}
                        <button
                          onClick={() => updateFooterLink(link.id, { enabled: !link.enabled })}
                          className={`p-1 rounded-lg transition ${link.enabled ? 'text-emerald-400 hover:bg-emerald-950/30' : 'text-slate-500 hover:bg-slate-800/30'}`}
                          title={link.enabled ? 'Disable' : 'Enable'}
                        >
                          {link.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => { if (window.confirm("Delete this link?")) handleDeleteFooterLink(link.id); }}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/30 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Edit Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">Label (EN)</label>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => updateFooterLink(link.id, { label: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none"
                        />
                      </div>
                      <div dir="rtl">
                        <label className="text-[10px] font-semibold text-rose-400 block mb-1 text-right">التسمية (عربي)</label>
                        <input
                          type="text"
                          value={link.labelAr}
                          onChange={(e) => updateFooterLink(link.id, { labelAr: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none text-right font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">URL / Path</label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateFooterLink(link.id, { url: e.target.value })}
                          placeholder="/page or https://..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">Icon (FA Class)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={link.icon || ''}
                            onChange={(e) => updateFooterLink(link.id, { icon: e.target.value })}
                            placeholder="fa-link"
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#111622] border border-[var(--border-subtle)] text-xs text-white focus:border-rose-500 outline-none font-mono"
                          />
                          {link.icon && (
                            <span className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                              <i className={`fa-solid ${link.icon} text-xs text-rose-400`}></i>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Open in New Tab Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={link.openInNewTab}
                        onChange={(e) => updateFooterLink(link.id, { openInNewTab: e.target.checked })}
                        className="accent-rose-500 w-3.5 h-3.5"
                      />
                      <span className="text-[var(--text-secondary)]">
                        {language === 'ar' ? 'فتح في نافذة جديدة' : 'Open in new tab'}
                      </span>
                      {link.openInNewTab && <ExternalLink className="w-3 h-3 text-rose-400" />}
                    </label>
                  </div>
                ))}
            </div>
          )}

          {/* Footer Preview */}
          {content.footerLinks && content.footerLinks.filter(l => l.enabled).length > 0 && (
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-3">
                {language === 'ar' ? 'معاينة روابط التذييل' : 'Footer Links Preview'}
              </span>
              <div className="rounded-2xl bg-gradient-to-r from-[#d4a03e] via-[#e5bf65] to-[#c79430] p-5">
                <div className="flex flex-col items-center gap-2">
                  <span className="font-serif text-sm font-bold text-black">
                    {language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
                  </span>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {[...content.footerLinks]
                      .filter(l => l.enabled)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map(link => (
                        <span key={link.id} className="flex items-center gap-1.5 text-sm text-black/90 font-medium">
                          {link.icon && <i className={`fa-solid ${link.icon} text-xs text-black/60`}></i>}
                          <span>{language === 'ar' ? link.labelAr : link.label}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 8: VERSION HISTORY ======================= */}
      {activeSubTab === 'versions' && (
        <CmsVersionsView onRestored={(c) => setContent(c as typeof content)} />
      )}
        </div>
      </div>
    </div>
  );
};
