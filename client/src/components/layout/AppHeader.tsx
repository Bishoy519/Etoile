import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Globe,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  Lock,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';



export const AppHeader: React.FC<{ onOpenEnroll: () => void }> = ({ onOpenEnroll }) => {
  const {
    language,
    setLanguage,
    activeView,
    setActiveView,
    currentFamilyId,
    students,
    activeStudentId,
    instructorUser,
    studentSchedule,
    logoutFamily,
    logoutInstructor,
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'home' | 'classes' | 'instructors' | 'performance' | 'enroll'>('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 20);
      const totalDoc = document.documentElement.scrollHeight - window.innerHeight;
      if (totalDoc > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (y / totalDoc) * 100)));
      }

      if (activeView === 'landing' || location.pathname === '/') {
        const instructorsEl = document.getElementById('instructors-section');
        const performanceEl = document.getElementById('performance-section');

        const instructorsTop = instructorsEl ? instructorsEl.offsetTop - 160 : Infinity;
        const performanceTop = performanceEl ? performanceEl.offsetTop - 160 : Infinity;

        if (y >= performanceTop) {
          setActiveNav('performance');
        } else if (y >= instructorsTop) {
          setActiveNav('instructors');
        } else {
          setActiveNav('home');
        }
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeView, location.pathname]);

  const trialClassName = (activeView === 'trial' || location.pathname === '/trial')
        ? 'text-brand-gold font-semibold bg-brand-gold/10'
        : 'text-brand-muted/90 hover:text-brand-gold';

  const scrollToSection = (id: string, navKey: 'classes' | 'instructors' | 'performance') => {
    setActiveNav(navKey);
    if (location.pathname !== '/') {
      setActiveView('landing');
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isLoggedIn = Boolean(instructorUser || currentFamilyId);
  const adminPortalUrl = (import.meta as any).env?.VITE_ADMIN_URL || 'http://localhost:5174';
  const activeStudent = students.find((s) => s.id === activeStudentId) || students[0];
  const userName = instructorUser
    ? (instructorUser.name?.split(' ')[0] || 'Faculty')
    : (activeStudent?.name?.split(' ')[0] || studentSchedule?.student?.name?.split(' ')[0] || 'Dancer');

  const handleSignOut = () => {
    if (instructorUser) {
      logoutInstructor();
    } else {
      logoutFamily();
    }
    setActiveView('landing');
    navigate('/');
  };

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${
      isScrolled
        ? 'bg-[#080a0b]/95 backdrop-blur-2xl border-b border-brand-gold/30 shadow-[0_12px_36px_rgba(0,0,0,0.85)]'
        : 'bg-[#080a0b]/75 sm:bg-gradient-to-b sm:from-[#080a0b]/95 sm:to-[#080a0b]/40 backdrop-blur-md border-b border-brand-gold/20'
    }`}>
      {/* Subtle Scroll Progress Indicator */}
      <div
        className="absolute bottom-0 start-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-85 pointer-events-none transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center justify-between transition-all duration-300 ${
        isScrolled ? 'h-16 sm:h-18' : 'h-20 sm:h-22'
      }`}>
        
        {/* Left: Official Étoile Wordmark Logo */}
        <div 
          onClick={() => {
            setActiveView('landing');
            setActiveNav('home');
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          className="cursor-pointer flex items-center py-1 group select-none flex-shrink-0 z-10"
        >
          <img
            src="/etoile-wordmark-logo.png"
            alt="Étoile Ballet Academy"
            className={`w-auto object-contain drop-shadow-[0_2px_18px_rgba(226,190,104,0.35)] group-hover:scale-105 group-hover:brightness-110 transition-all duration-300 ${
              isScrolled ? 'h-9 sm:h-10' : 'h-10 sm:h-11'
            }`}
          />
        </div>

        {/* Center: Luxury Pill Navigation (Purely centered) */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 z-10 hero-pill-nav rounded-full p-1 items-center gap-0.5 shadow-2xl">
          <button
            onClick={() => {
              setActiveView('landing');
              setActiveNav('home');
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hero-pill-item ${
              (activeView === 'landing' || location.pathname === '/') && activeNav !== 'instructors' && activeNav !== 'performance'
                ? 'active'
                : ''
            }`}
          >
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </button>

          <button
            onClick={() => {
              setActiveView('classes');
              setActiveNav('classes');
              navigate('/classes');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hero-pill-item ${activeView === 'classes' || location.pathname === '/classes' ? 'active' : ''}`}
          >
            {language === 'ar' ? 'الحصص' : 'Classes'}
          </button>

          <button
            onClick={() => scrollToSection('instructors-section', 'instructors')}
            className={`hero-pill-item ${activeNav === 'instructors' && (activeView === 'landing' || location.pathname === '/') ? 'active' : ''}`}
          >
            {language === 'ar' ? 'المدربون' : 'Instructors'}
          </button>

          <button
            onClick={() => scrollToSection('performance-section', 'performance')}
            className={`hero-pill-item ${activeNav === 'performance' && (activeView === 'landing' || location.pathname === '/') ? 'active' : ''}`}
          >
            {language === 'ar' ? 'العروض' : 'Performance'}
          </button>

          <button
            onClick={() => {
              setActiveView('blog');
              navigate('/blog');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hero-pill-item ${activeView === 'blog' || activeView === 'blog_detail' || location.pathname.startsWith('/blog') ? 'active' : ''}`}
          >
            {language === 'ar' ? 'المدونة' : 'Journal'}
          </button>

          <button
            onClick={() => {
              setActiveView('trial');
              navigate('/trial');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hero-pill-item font-medium ${
              activeView === 'trial' || location.pathname === '/trial' ? 'active' : 'text-brand-gold hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse me-1.5 shadow-[0_0_8px_rgba(226,190,104,0.8)]"></span>
            {language === 'ar' ? 'حصة تجريبية' : 'Free Trial'}
          </button>

          <button
            onClick={() => {
              setActiveNav('enroll');
              onOpenEnroll();
            }}
            className="hero-pill-item pill-cta"
          >
            <Sparkles className="w-3 h-3 me-1 text-brand-gold" />
            {language === 'ar' ? 'التسجيل' : 'Enroll'}
          </button>
        </nav>

        {/* Right: Search + Authentication & Controls Group */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 z-10">
          

          {/* Authentication & Profile State */}
          {!isLoggedIn ? (
            /* Guest State: Crystal Clear "Sign In" Button */
            <button
              onClick={() => {
                setActiveView('client_portal');
                navigate('/portal');
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border text-xs sm:text-[13px] font-semibold tracking-wide transition-all duration-300 shadow-sm active:scale-95 btn-sheen ${
                activeView === 'client_portal' || location.pathname === '/portal'
                  ? 'border-brand-gold bg-brand-gold text-black shadow-[0_0_18px_rgba(226,190,104,0.4)]'
                  : 'border-brand-gold/50 bg-gradient-to-r from-brand-gold/20 via-brand-gold/10 to-transparent text-brand-gold hover:border-brand-gold hover:bg-brand-gold hover:text-black hover:shadow-[0_0_16px_rgba(226,190,104,0.3)]'
              }`}
              title="Sign in with your Student or Instructor Card Code"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
            </button>
          ) : (
            /* Logged-In State: My Portal + Dedicated Icon Controls */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  if (activeView === 'client_portal' || location.pathname === '/portal') {
                    setActiveView('landing');
                    navigate('/');
                  } else {
                    setActiveView('client_portal');
                    navigate('/portal');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold font-serif tracking-wider transition-all duration-200 active:scale-95 btn-sheen ${
                  activeView === 'client_portal' || location.pathname === '/portal'
                    ? 'border border-brand-gold/40 bg-[#121617]/90 text-brand-gold hover:border-brand-gold'
                    : 'bg-gradient-to-r from-[#dfb755] via-[#f6e298] to-[#b88629] text-black shadow-[0_0_16px_rgba(226,190,104,0.35)] hover:brightness-110'
                }`}
                title={activeView === 'client_portal' || location.pathname === '/portal' ? 'Return to Academy Showcase' : 'View My Portal'}
              >
                {activeView === 'client_portal' || location.pathname === '/portal' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{language === 'ar' ? 'الموقع العام' : 'Showcase'}</span>
                    <span className="sm:hidden">{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{language === 'ar' ? `بوابتي (${userName})` : `Portal (${userName})`}</span>
                  </>
                )}
              </button>

              {/* Dedicated Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center p-2 sm:px-2.5 sm:py-2 rounded-full border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-900/40 hover:border-red-400 hover:text-white text-xs font-medium transition duration-200 active:scale-95"
                title={language === 'ar' ? 'تسجيل الخروج' : 'Sign Out of Session'}
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden 2xl:inline ms-1">{language === 'ar' ? 'خروج' : 'Sign Out'}</span>
              </button>
            </div>
          )}

          {/* Staff & Admin Portal Link - Refined Discreet Keyhole Icon */}
          <a
            href={adminPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-brand-gold/25 bg-[#121617]/60 text-brand-gold/70 hover:text-brand-gold hover:border-brand-gold hover:bg-brand-gold/15 transition-all duration-200 shadow-sm"
            title={language === 'ar' ? 'بوابة إدارة الأكاديمية (للمشرفين والمالك)' : 'Étoile Staff & Administrator Portal'}
            aria-label="Admin Portal"
          >
            <Lock className="w-3.5 h-3.5" />
          </a>

          {/* Notification Feed Bell */}
          <NotificationBell />

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-full border border-brand-gold/25 bg-[#121617]/60 text-brand-gold hover:border-brand-gold hover:bg-brand-gold/15 text-xs font-semibold transition-all duration-200"
            aria-label="Toggle language"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-brand-gold/80" />
            <span className="text-[11px] tracking-wider">{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-full border border-brand-gold/30 text-brand-gold bg-[#121617]/80 hover:border-brand-gold transition"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>


      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-brand-gold/20 bg-[#0c0f10] px-6 py-5 flex flex-col gap-3 shadow-2xl">
          {/* Mobile Navigation Links */}
          <button
            onClick={() => {
              setActiveView('landing');
              setActiveNav('home');
              navigate('/');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`text-left rtl:text-right text-sm py-2 px-3 rounded-lg ${
              (activeView === 'landing' || location.pathname === '/') && activeNav !== 'instructors' && activeNav !== 'performance'
                ? 'text-brand-gold font-semibold bg-brand-gold/10'
                : 'text-brand-muted/90 hover:text-brand-gold'
            }`}
          >
            {language === 'ar' ? 'الصفحة الرئيسية' : 'Home'}
          </button>
          <button
            onClick={() => {
              setActiveView('classes');
              navigate('/classes');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`text-left rtl:text-right text-sm py-2 px-3 rounded-lg ${
              activeView === 'classes' || location.pathname === '/classes' ? 'text-brand-gold font-semibold bg-brand-gold/10' : 'text-brand-muted/90 hover:text-brand-gold'
            }`}
          >
            {language === 'ar' ? 'الحصص والمجموعات المعتمدة' : 'Classes & Studio Groups'}
          </button>
          <button
            onClick={() => {
              scrollToSection('instructors-section', 'instructors');
              setMobileMenuOpen(false);
            }}
            className={`text-left rtl:text-right text-sm py-2 px-3 rounded-lg ${
              activeNav === 'instructors' && (activeView === 'landing' || location.pathname === '/')
                ? 'text-brand-gold font-semibold bg-brand-gold/10'
                : 'text-brand-muted/90 hover:text-brand-gold'
            }`}
          >
            {language === 'ar' ? 'هيئة التدريس' : 'Instructors'}
          </button>
          <button
            onClick={() => {
              scrollToSection('performance-section', 'performance');
              setMobileMenuOpen(false);
            }}
            className={`text-left rtl:text-right text-sm py-2 px-3 rounded-lg ${
              activeNav === 'performance' && (activeView === 'landing' || location.pathname === '/')
                ? 'text-brand-gold font-semibold bg-brand-gold/10'
                : 'text-brand-muted/90 hover:text-brand-gold'
            }`}
          >
            {language === 'ar' ? 'الموسم المسرحي' : 'Performance'}
          </button>
          <button
            onClick={() => {
              setActiveView('blog');
              navigate('/blog');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`text-left rtl:text-right text-sm py-2 px-3 rounded-lg ${
              activeView === 'blog' || activeView === 'blog_detail' || location.pathname.startsWith('/blog') ? 'text-brand-gold font-semibold bg-brand-gold/10' : 'text-brand-muted/90 hover:text-brand-gold'
            }`}
          >
            {language === 'ar' ? 'المدونة' : 'Journal'}
          </button>
          <button
            onClick={() => {
              setActiveView('faq');
              navigate('/faq');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-left rtl:text-right text-sm py-2 px-3 rounded-lg text-brand-muted/90 hover:text-brand-gold"
          >
            {language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
          </button>
      <button
        onClick={() => {
          setActiveView('trial');
          navigate('/trial');
          setMobileMenuOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={`text-left rtl:text-right text-sm py-2 px-3 rounded-lg ${trialClassName}`}
      >
        {language === 'ar' ? 'حصة تجريبية مجانية' : 'Free Trial Class'}
      </button>
          <button
            onClick={() => {
              onOpenEnroll();
              setMobileMenuOpen(false);
            }}
            className="text-left rtl:text-right text-sm py-2 px-3 rounded-lg text-brand-gold font-semibold"
          >
            {language === 'ar' ? 'التسجيل بالأكاديمية' : 'Enroll Now'}
          </button>

          {/* Mobile Auth Actions: Prominent Sign In or Sign Out */}
          <div className="pt-3 border-t border-brand-gold/20 flex flex-col gap-2.5">
            {!isLoggedIn ? (
              <button
                onClick={() => {
                  setActiveView('client_portal');
                  navigate('/portal');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left rtl:text-right text-sm py-3 px-4 rounded-xl flex items-center justify-between border border-brand-gold bg-gradient-to-r from-brand-gold/25 to-brand-gold/10 text-brand-gold font-semibold shadow-[0_0_15px_rgba(226,190,104,0.2)]"
              >
                <div className="flex items-center gap-2.5">
                  <LogIn className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تسجيل الدخول (كود البطاقة)' : 'Sign In (Card Code)'}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold-light">
                  {language === 'ar' ? 'طلاب ومدربين' : 'Students & Faculty'}
                </span>
              </button>
            ) : (
              <>
                <div className="px-3 py-2 rounded-lg bg-black/50 border border-brand-gold/20 flex items-center justify-between text-xs">
                  <span className="text-brand-muted">{language === 'ar' ? 'الحساب الحالي:' : 'Active Session:'}</span>
                  <span className="text-brand-gold font-semibold">{userName}</span>
                </div>

                <button
                  onClick={() => {
                    if (activeView === 'client_portal' || location.pathname === '/portal') {
                      setActiveView('landing');
                      navigate('/');
                    } else {
                      setActiveView('client_portal');
                      navigate('/portal');
                    }
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left rtl:text-right text-sm py-2.5 px-3 rounded-xl flex items-center gap-2.5 border border-brand-gold/40 text-brand-gold bg-brand-gold/10 font-semibold"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {(activeView === 'client_portal' || location.pathname === '/portal')
                      ? (language === 'ar' ? 'الرجوع للواجهة الرئيسية' : 'Return to Showcase')
                      : (language === 'ar' ? 'فتح بوابتي الشخصية' : 'Open My Portal')}
                  </span>
                </button>

                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left rtl:text-right text-sm py-2.5 px-3 rounded-xl flex items-center gap-2.5 border border-red-500/40 bg-red-950/30 text-red-300 font-semibold hover:bg-red-900/40"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </button>
              </>
            )}

            <a
              href={adminPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="text-left rtl:text-right text-sm py-2 px-3 rounded-lg flex items-center justify-between border border-brand-gold/40 bg-brand-gold/10 text-brand-gold font-medium mt-1"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-gold" />
                <span>{language === 'ar' ? 'بوابة الإدارة' : 'Staff & Admin Portal'}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
