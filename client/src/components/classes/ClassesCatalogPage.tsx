import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api, errMsg } from '../../utils/api';
import { exportCsv } from '../../utils/csv';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useQueryParamState } from '../../hooks/useQueryParamState';
import { CourseItem, CourseSession } from '../../types';
import { SmartImage } from '../ui/SmartImage';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Download,
  Rows3,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Filter,
  CheckCircle2,
  BookOpen,
  Info,
  CalendarDays,
  LayoutGrid,
  Layers,
  Award,
  ArrowRight,
  X,
  AlertCircle,
  Flame,
  UserCheck,
} from 'lucide-react';

interface ClassesCatalogPageProps {
  onOpenEnroll: (program?: string, courseCode?: string, courseTitle?: string) => void;
  initialProgramFilter?: string;
  onNavigateHome?: () => void;
}

export const ClassesCatalogPage: React.FC<ClassesCatalogPageProps> = ({
  onOpenEnroll,
  initialProgramFilter = 'all',
  onNavigateHome,
}) => {
  const {
    language,
    courses,
    courseSessions,
    fetchCoursesAndSessions,
    showToast,
    portalContent,
    setActiveView,
    students,
    currentFamilyId,
    activeStudentId,
    globalSearchQuery,
    setGlobalSearchQuery,
  } = useApp();

  // URL-synced filters (shareable, survives reload)
  const [selectedProgram, setSelectedProgram] = useQueryParamState('program', initialProgramFilter);
  const [selectedLevel, setSelectedLevel] = useQueryParamState('level', 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'timetable' | 'rows'>('grid');

  // Search: local state (debounced) + URL sync
  const [searchQuery, setSearchQuery] = useState(globalSearchQuery || '');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Expanded upcoming sessions per card
  const [expandedSessionsCourseId, setExpandedSessionsCourseId] = useState<string | null>(null);

  // Modal for detailed class syllabus & info
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<CourseItem | null>(null);

  // Keep navbar global search and catalog search in sync (both directions).
  useEffect(() => {
    if (globalSearchQuery !== searchQuery) setSearchQuery(globalSearchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearchQuery]);
  useEffect(() => {
    if (initialProgramFilter && initialProgramFilter !== selectedProgram) setSelectedProgram(initialProgramFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProgramFilter]);
  // Sync searchQuery to URL (debounced via replaceState)
  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      if (searchQuery) url.searchParams.set('q', searchQuery);
      else url.searchParams.delete('q');
      window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCoursesAndSessions();
      showToast(
        language === 'ar' ? 'تم تحديث جدول الحصص' : 'Schedule Refreshed',
        language === 'ar' ? 'تمت مزامنة الحصص والمجموعات المعتمدة بنجاح من الإدارة' : 'Successfully synchronized classes and groups from registry.',
        'gold'
      );
    } catch {
      showToast('Offline', 'Using cached schedule', 'warning');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Program display configuration
  const programLabels: Record<string, { en: string; ar: string; color: string; badgeBg: string }> = {
    classical: {
      en: 'Classical Ballet',
      ar: 'الباليه الكلاسيكي',
      color: 'text-[#e2be68]',
      badgeBg: 'bg-[#e2be68]/15 border-[#e2be68]/40 text-[#fdf1c2]',
    },
    contemporary: {
      en: 'Contemporary Dance',
      ar: 'الرقص المعاصر',
      color: 'text-sky-400',
      badgeBg: 'bg-sky-500/15 border-sky-400/40 text-sky-200',
    },
    youth: {
      en: 'Youth Program',
      ar: 'برنامج الناشئين',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 border-amber-400/40 text-amber-200',
    },
  };

  const levelLabels: Record<string, { en: string; ar: string }> = {
    'pre-pro': { en: 'Pre-Professional', ar: 'احترافي متقدم' },
    conservatory: { en: 'Conservatory', ar: 'كونسرفتوار' },
    intermediate: { en: 'Intermediate', ar: 'متوسط' },
    beginner: { en: 'Foundations & Beginner', ar: 'مبتدئ وتأسيسي' },
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Program filter
      if (selectedProgram !== 'all' && course.program !== selectedProgram) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'all' && course.level !== selectedLevel) {
        return false;
      }
      // Search query (also matches program key so navbar "classical" works)
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        const matchTitle = (course.title || '').toLowerCase().includes(query);
        const matchTitleAr = (course.titleAr || '').toLowerCase().includes(query);
        const matchCode = (course.code || '').toLowerCase().includes(query);
        const matchInstructor = (course.instructor?.name || '').toLowerCase().includes(query);
        const matchStudio = (course.studioRoom || '').toLowerCase().includes(query);
        const matchProgram = (course.program || '').toLowerCase().includes(query);
        const matchLevel = (course.level || '').toLowerCase().includes(query);
        if (!matchTitle && !matchTitleAr && !matchCode && !matchInstructor && !matchStudio && !matchProgram && !matchLevel) {
          return false;
        }
      }
      return true;
    });
  }, [courses, selectedProgram, selectedLevel, searchQuery]);

  // Aggregate stats
  const totalEnrolled = courses.reduce((acc, c) => acc + (c._count?.enrollments || c.enrollments?.length || 0), 0);
  const totalCapacity = courses.reduce((acc, c) => acc + (c.capacity || 20), 0);
  const totalSessionsCount = courses.reduce((acc, c) => acc + (c.sessions?.length || c._count?.sessions || 0), 0);

  // Group sessions by day of week for the timetable view
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleExportCsv = () => {
    exportCsv(
      `etoile-classes-${new Date().toISOString().split('T')[0]}`,
      ['code', 'title', 'program', 'level', 'instructor', 'dayOfWeek', 'startTime', 'endTime', 'studioRoom', 'capacity', 'enrolled'],
      filteredCourses.map((c) => ({
        code: c.code,
        title: c.title,
        program: c.program,
        level: c.level,
        instructor: c.instructor?.name || '',
        dayOfWeek: c.dayOfWeek || '',
        startTime: c.startTime || '',
        endTime: c.endTime || '',
        studioRoom: c.studioRoom || '',
        capacity: c.capacity || 0,
        enrolled: c._count?.enrollments || c.enrollments?.length || 0,
      }))
    );
    showToast(
      language === 'ar' ? 'تم تصدير الحصص' : 'Classes exported',
      language === 'ar' ? `تم تصدير ${filteredCourses.length} حصة إلى CSV.` : `Exported ${filteredCourses.length} classes to CSV.`,
      'gold'
    );
  };
  const dayTranslations: Record<string, string> = {
    Monday: 'الاثنين',
    Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء',
    Thursday: 'الخميس',
    Friday: 'الجمعة',
    Saturday: 'السبت',
    Sunday: 'الأحد',
  };

  return (
    <div className="min-h-screen bg-[#080a0b] text-[#dcd2bd] pb-28 pt-8">
      {/* 1. Regal Header & Live Registry Banner */}
      <section className="relative overflow-hidden border-b border-brand-gold/15 bg-gradient-to-b from-[#101416] via-[#0b0e0f] to-[#080a0b] py-14 sm:py-20 px-4 sm:px-8 lg:px-12">
        {/* Subtle Decorative Curves */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <svg className="w-full h-full" viewBox="0 0 1440 400" fill="none" preserveAspectRatio="none">
            <path d="M-100,320 C400,120 800,380 1550,80" stroke="#e2be68" strokeWidth="1" />
            <path d="M-100,350 C400,150 800,410 1550,110" stroke="#e2be68" strokeWidth="0.5" strokeDasharray="4 6" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="max-w-2xl">
            {/* Top Breadcrumb & Live Sync Pill */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-brand-gold/15 border border-brand-gold/40 text-brand-gold">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                {language === 'ar' ? 'السجل الأكاديمي المباشر' : 'Official Academy Syllabus & Cohorts'}
              </span>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border border-brand-gold/25 hover:border-brand-gold bg-[#121617]/80 text-brand-muted hover:text-brand-gold transition duration-200"
                title={language === 'ar' ? 'مزامنة الحصص مع خادم الإدارة' : 'Refresh courses from admin server'}
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-brand-gold' : ''}`} />
                <span>{language === 'ar' ? 'مزامنة مع الإدارة' : 'Live Sync'}</span>
              </button>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl gold-text-gradient uppercase tracking-wide leading-tight mb-4">
              {language === 'ar' ? 'الحصص والمجموعات التدريبية' : 'Classes & Studio Groups'}
            </h1>

            <p className="text-sm sm:text-base text-[#dcd2bd]/80 font-light leading-relaxed">
              {language === 'ar'
                ? 'استكشف الفصول والمجموعات المقررة المعتمدة من إدارة الكونسرفتوار الفنية، وجداول الحضور الأسبوعية، وهيئة التدريس المشرفة على كل تدريب.'
                : 'Explore live conservatory groups, masterclass cohorts, and studio schedules created directly by the Étoile Artistic Direction.'}
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="p-4 rounded-2xl bg-[#121618]/90 border border-brand-gold/30 text-center flex flex-col items-center justify-center min-w-[100px] sm:min-w-[120px] shadow-lg backdrop-blur-md">
              <span className="font-serif text-2xl sm:text-3xl text-brand-gold font-semibold mb-0.5">
                {courses.length}
              </span>
              <span className="text-[10px] sm:text-xs text-brand-muted uppercase tracking-wider">
                {language === 'ar' ? 'مجموعة نشطة' : 'Active Groups'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121618]/90 border border-brand-gold/30 text-center flex flex-col items-center justify-center min-w-[100px] sm:min-w-[120px] shadow-lg backdrop-blur-md">
              <span className="font-serif text-2xl sm:text-3xl text-[#fdf1c2] font-semibold mb-0.5">
                {totalSessionsCount}
              </span>
              <span className="text-[10px] sm:text-xs text-brand-muted uppercase tracking-wider">
                {language === 'ar' ? 'حصة مجدولة' : 'Sessions'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121618]/90 border border-brand-gold/30 text-center flex flex-col items-center justify-center min-w-[100px] sm:min-w-[120px] shadow-lg backdrop-blur-md">
              <span className="font-serif text-2xl sm:text-3xl text-brand-gold font-semibold mb-0.5">
                {totalCapacity > 0 ? `${Math.round((totalEnrolled / totalCapacity) * 100)}%` : '85%'}
              </span>
              <span className="text-[10px] sm:text-xs text-brand-muted uppercase tracking-wider">
                {language === 'ar' ? 'نسبة الإشغال' : 'Roster Fill'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trial CTA strip — additive, above the control bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-6">
        <button
          onClick={() => { setActiveView('trial'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="w-full p-4 rounded-2xl bg-brand-gold/10 border border-brand-gold/40 flex items-center justify-center gap-3 text-sm text-brand-gold hover:bg-brand-gold/20 transition"
        >
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold">{language === 'ar' ? 'جربي حصة تجريبية مجانية — احجزي موعدك' : 'Try a free trial class — book your slot'}</span>
        </button>
      </div>

      {/* 2. Control Bar: Search, Filters & View Toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111517] border border-brand-gold/25 shadow-xl flex flex-col gap-4">
          
          {/* Top Row: Search Input + View Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input (synced with navbar) */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-brand-gold/60 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setGlobalSearchQuery(e.target.value); }}
                placeholder={
                  language === 'ar'
                    ? 'ابحث باسم الحصة، الرمز (BAL-...)، الأستاذ، أو القاعة...'
                    : 'Search by class title, code (e.g. BAL-CL-101), instructor, or studio...'
                }
                className="w-full bg-[#090b0c] border border-brand-gold/30 rounded-xl pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2.5 text-xs sm:text-sm text-[#fdf1c2] placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold transition"
                aria-label={language === 'ar' ? 'بحث في الحصص' : 'Search classes'}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setGlobalSearchQuery(''); }}
                  className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-auto rtl:left-3 text-brand-muted hover:text-white p-1"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
              <span className="text-[11px] font-mono text-brand-muted px-2.5 py-2 rounded-lg border border-brand-gold/20 bg-black/40">
                {filteredCourses.length}
              </span>
              {/* View Mode Toggle: Cards vs Rows vs Timetable */}
              <div className="flex items-center gap-1.5 p-1 bg-[#090b0c] border border-brand-gold/20 rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  title={language === 'ar' ? 'بطاقات' : 'Cards'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === 'grid'
                      ? 'bg-brand-gold text-black font-semibold shadow-sm'
                      : 'text-brand-muted hover:text-brand-gold'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'بطاقات' : 'Cards'}</span>
                </button>

                <button
                  onClick={() => setViewMode('rows')}
                  aria-pressed={viewMode === 'rows'}
                  title={language === 'ar' ? 'صفوف' : 'Rows'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === 'rows'
                      ? 'bg-brand-gold text-black font-semibold shadow-sm'
                      : 'text-brand-muted hover:text-brand-gold'
                  }`}
                >
                  <Rows3 className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'صفوف' : 'Rows'}</span>
                </button>

                <button
                  onClick={() => setViewMode('timetable')}
                  aria-pressed={viewMode === 'timetable'}
                  title={language === 'ar' ? 'الجدول الأسبوعي' : 'Timetable'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === 'timetable'
                      ? 'bg-brand-gold text-black font-semibold shadow-sm'
                      : 'text-brand-muted hover:text-brand-gold'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'الجدول الأسبوعي' : 'Timetable'}</span>
                </button>
              </div>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-black text-xs font-bold transition"
                title={language === 'ar' ? 'تصدير النتائج CSV' : 'Export results to CSV'}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Program Tabs & Level Pills */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-brand-gold/10">
            {/* Program Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-brand-muted/70 flex items-center gap-1 shrink-0 mr-1 rtl:mr-0 rtl:ml-1">
                <Filter className="w-3 h-3 text-brand-gold" />
                {language === 'ar' ? 'البرنامج:' : 'Program:'}
              </span>
              
              <button
                onClick={() => setSelectedProgram('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  selectedProgram === 'all'
                    ? 'bg-brand-gold text-black font-semibold'
                    : 'bg-[#151a1d] text-brand-muted hover:text-brand-gold border border-brand-gold/20'
                }`}
              >
                {language === 'ar' ? 'كافة البرامج' : 'All Programs'} ({courses.length})
              </button>

              {(['classical', 'contemporary', 'youth'] as const).map((progKey) => {
                const count = courses.filter((c) => c.program === progKey).length;
                const label = language === 'ar' ? programLabels[progKey]?.ar : programLabels[progKey]?.en;
                const isActive = selectedProgram === progKey;
                return (
                  <button
                    key={progKey}
                    onClick={() => setSelectedProgram(progKey)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      isActive
                        ? 'bg-brand-gold text-black font-semibold'
                        : 'bg-[#151a1d] text-brand-muted hover:text-brand-gold border border-brand-gold/20'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Level Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-brand-muted/70 mr-1 rtl:mr-0 rtl:ml-1 shrink-0">
                {language === 'ar' ? 'المستوى:' : 'Level:'}
              </span>
              <button
                onClick={() => setSelectedLevel('all')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] transition ${
                  selectedLevel === 'all'
                    ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold'
                    : 'text-brand-muted/70 hover:text-brand-gold border border-transparent'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All'}
              </button>
              {Object.entries(levelLabels).map(([lvlKey, lvlName]) => (
                <button
                  key={lvlKey}
                  onClick={() => setSelectedLevel(lvlKey)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] transition ${
                    selectedLevel === lvlKey
                      ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold'
                      : 'text-brand-muted/70 hover:text-brand-gold border border-transparent'
                  }`}
                >
                  {language === 'ar' ? lvlName.ar : lvlName.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Catalog Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 mt-8">
        {filteredCourses.length === 0 ? (
          /* Empty State */
          <div className="p-12 sm:p-16 rounded-3xl bg-[#101416]/80 border border-brand-gold/20 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-2xl">
            <GraduationCap className="w-12 h-12 text-brand-gold/40 mb-4 stroke-1" />
            <h3 className="font-serif text-2xl text-brand-gold mb-2">
              {language === 'ar' ? 'لم يتم العثور على فصول مطابقة' : 'No Classes Matching Filter'}
            </h3>
            <p className="text-xs sm:text-sm text-brand-muted/80 max-w-sm mb-6 leading-relaxed">
              {language === 'ar'
                ? 'جرب ضبط معايير البحث أو تصفية البرامج لعرض الفصول والمجموعات المقررة الأخرى.'
                : 'Try adjusting your search query or reset filters to view other available academy courses.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setGlobalSearchQuery('');
                setSelectedProgram('all');
                setSelectedLevel('all');
              }}
              className="px-5 py-2.5 rounded-xl gold-btn text-black font-semibold text-xs transition"
            >
              {language === 'ar' ? 'إعادة ضبط كافة الفلاتر' : 'Reset All Filters'}
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* 3A. Grid Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredCourses.map((course) => {
              const enrolledCount = course._count?.enrollments || course.enrollments?.length || 0;
              const capacity = course.capacity || 20;
              const spotsLeft = Math.max(0, capacity - enrolledCount);
              const isFull = spotsLeft === 0;
              const isNearlyFull = spotsLeft > 0 && spotsLeft <= 3;
              const progConfig = programLabels[course.program] || programLabels.classical;
              const levelName = levelLabels[course.level]
                ? (language === 'ar' ? levelLabels[course.level].ar : levelLabels[course.level].en)
                : course.level;

              // Filter sessions specific to this course
              const upcomingSessions = (course.sessions && course.sessions.length > 0)
                ? course.sessions
                : courseSessions.filter((s) => s.courseId === course.id);

              const isSessionsExpanded = expandedSessionsCourseId === course.id;

              return (
                <div
                  key={course.id}
                  className="group relative rounded-3xl bg-[#101416]/95 border border-brand-gold/30 hover:border-brand-gold/80 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_35px_rgba(226,190,104,0.2)]"
                >
                  {/* Top Program Accent Stripe */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-brand-gold-light to-transparent"></div>

                  <div className="p-6 sm:p-7 flex flex-col flex-1">
                    {/* Header Badges: Code + Program + Level */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-brand-gold/15 border border-brand-gold/40 text-brand-gold tracking-wider">
                        {course.code}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${progConfig.badgeBg}`}>
                          {language === 'ar' ? progConfig.ar : progConfig.en}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/80">
                          {levelName}
                        </span>
                      </div>
                    </div>

                    {/* Course Title */}
                    <h3 className="font-serif text-xl sm:text-2xl text-white font-medium group-hover:text-brand-gold transition duration-200 mb-2 leading-snug">
                      {language === 'ar' ? (course.titleAr || course.title) : course.title}
                    </h3>
                    {course.titleAr && language !== 'ar' && (
                      <span className="text-xs text-brand-gold/70 font-serif mb-3 block rtl:hidden" dir="rtl">
                        {course.titleAr}
                      </span>
                    )}

                    {/* Course Description */}
                    <p className="text-xs text-brand-muted/85 font-light leading-relaxed mb-5 line-clamp-3">
                      {language === 'ar' ? (course.descriptionAr || course.description) : (course.description || 'Mastery of classical turnout, poise, musicality and expressive repertoire.')}
                    </p>

                    {/* Metadata Grid: Instructor, Days, Studio */}
                    <div className="space-y-2.5 py-3 border-y border-brand-gold/15 mb-5 text-xs text-[#dcd2bd]/90">
                      {/* Instructor */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full border border-brand-gold/60 overflow-hidden bg-black shrink-0">
                          <SmartImage
                            src={course.instructor?.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'}
                            alt={course.instructor?.name || 'Faculty'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] text-brand-muted block uppercase tracking-wider">
                            {language === 'ar' ? 'الأستاذ المشرف' : 'Faculty Master'}
                          </span>
                          <span className="font-medium text-white truncate">
                            {course.instructor?.name || 'Étoile Faculty'}
                          </span>
                        </div>
                      </div>

                      {/* Timings & Days */}
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-white block">
                            {course.dayOfWeek || 'Mon, Wed, Fri'}
                          </span>
                          <span className="text-[11px] text-brand-muted">
                            {course.startTime && course.endTime ? `${course.startTime} - ${course.endTime}` : '16:00 - 17:30'}
                          </span>
                        </div>
                      </div>

                      {/* Studio Room */}
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-brand-gold shrink-0" />
                        <span className="truncate text-white font-light">
                          {course.studioRoom || 'Grand Studio Petipa'}
                        </span>
                      </div>
                    </div>

                    {/* Capacity & Enrollment Status Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-brand-muted flex items-center gap-1">
                          <Users className="w-3 h-3 text-brand-gold" />
                          {language === 'ar' ? 'السعة والتسجيل:' : 'Enrolled Roster:'}
                        </span>
                        <span className="font-mono text-brand-gold">
                          {enrolledCount} / {capacity}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull
                              ? 'bg-rose-500'
                              : isNearlyFull
                              ? 'bg-amber-400'
                              : 'bg-brand-gold'
                          }`}
                          style={{ width: `${Math.min(100, Math.round((enrolledCount / capacity) * 100))}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        {isFull ? (
                          <span className="text-rose-400 font-medium">
                            {language === 'ar' ? 'المجموعة مكتملة (قائمة انتظار)' : 'Class Full • Waitlist Only'}
                          </span>
                        ) : isNearlyFull ? (
                          <span className="text-amber-300 font-medium animate-pulse">
                            {language === 'ar' ? `متبقي ${spotsLeft} مقاعد فقط!` : `Only ${spotsLeft} spots remaining!`}
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            {language === 'ar' ? `${spotsLeft} أماكن شاغرة متاحة` : `${spotsLeft} seats available`}
                          </span>
                        )}

                        <button
                          onClick={() => setSelectedCourseForDetails(course)}
                          className="text-brand-gold hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{language === 'ar' ? 'التفاصيل والمنهج' : 'Syllabus'}</span>
                          <Info className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Upcoming Scheduled Sessions Expandable Accordion */}
                    {upcomingSessions.length > 0 && (
                      <div className="mb-4 pt-2 border-t border-brand-gold/10">
                        <button
                          onClick={() => setExpandedSessionsCourseId(isSessionsExpanded ? null : course.id)}
                          className="w-full flex items-center justify-between text-xs text-brand-gold/80 hover:text-brand-gold py-1"
                        >
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                            {language === 'ar'
                              ? `الجلسات المجدولة (${upcomingSessions.length})`
                              : `Scheduled Sessions (${upcomingSessions.length})`}
                          </span>
                          <span className="text-[10px] text-brand-muted">
                            {isSessionsExpanded ? (language === 'ar' ? 'إخفاء' : 'Collapse') : (language === 'ar' ? 'عرض' : 'Expand')}
                          </span>
                        </button>

                        {isSessionsExpanded && (
                          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                            {upcomingSessions.map((session) => (
                              <div
                                key={session.id}
                                className="p-2.5 rounded-xl bg-[#090b0c] border border-brand-gold/20 text-[11px]"
                              >
                                <div className="flex items-center justify-between font-medium text-white mb-1">
                                  <span className="truncate">{session.title}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold shrink-0">
                                    {session.startTime}
                                  </span>
                                </div>
                                <div className="text-brand-muted text-[10px] flex items-center justify-between">
                                  <span>
                                    {new Date(session.sessionDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  <span>{session.studioRoom}</span>
                                </div>
                                {session.notes && (
                                  <p className="mt-1 text-[10px] text-brand-gold/70 italic border-t border-brand-gold/10 pt-1">
                                    {session.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom CTA Actions */}
                  <div className="p-6 pt-0 flex items-center gap-2.5">
                    <button
                      onClick={() => onOpenEnroll(course.program, course.code, course.title)}
                      className="flex-1 py-3 px-4 rounded-xl gold-btn text-black font-semibold text-xs tracking-wider uppercase transition shadow-md hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <span>{language === 'ar' ? 'التسجيل في المجموعة' : 'Enroll in Class'}</span>
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>

                    <button
                      onClick={() => setSelectedCourseForDetails(course)}
                      className="p-3 rounded-xl border border-brand-gold/30 hover:border-brand-gold text-brand-gold bg-[#14181a] hover:bg-brand-gold/10 transition"
                      title={language === 'ar' ? 'عرض تفاصيل الحصة الكاملة' : 'View full class syllabus & info'}
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'rows' ? (
          /* 3A2. Rows list view — compact, scannable, same data as cards */
          <div className="rounded-3xl bg-[#101416]/95 border border-brand-gold/30 overflow-hidden shadow-2xl">
            <div className="hidden sm:grid grid-cols-[1fr_140px_140px_110px_120px] gap-3 px-6 py-3 text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-gold/15 bg-[#0c0f10]">
              <span>{language === 'ar' ? 'الحصة' : 'Class'}</span>
              <span>{language === 'ar' ? 'المدرب' : 'Instructor'}</span>
              <span>{language === 'ar' ? 'الموعد' : 'Schedule'}</span>
              <span>{language === 'ar' ? 'السعة' : 'Enrolled'}</span>
              <span className="text-end">{language === 'ar' ? 'إجراء' : 'Action'}</span>
            </div>
            <div className="divide-y divide-brand-gold/10">
              {filteredCourses.map((course) => {
                const enrolledCount = course._count?.enrollments || course.enrollments?.length || 0;
                const capacity = course.capacity || 20;
                return (
                  <div key={course.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_140px_140px_110px_120px] gap-2 sm:gap-3 items-start sm:items-center px-5 sm:px-6 py-3.5 hover:bg-white/[0.02] transition">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {language === 'ar' ? (course.titleAr || course.title) : course.title}
                        <span className="ms-2 font-mono text-[10px] text-brand-gold">{course.code}</span>
                      </p>
                      <p className="text-[11px] text-brand-muted truncate">{course.studioRoom || ''} • {course.program} • {course.level}</p>
                    </div>
                    <span className="text-xs text-[#dcd2bd] truncate">{course.instructor?.name || 'Étoile Faculty'}</span>
                    <span className="text-[11px] text-brand-muted">{course.dayOfWeek || ''} {course.startTime ? `• ${course.startTime}` : ''}</span>
                    <span className="text-[11px] font-mono text-brand-gold">{enrolledCount}/{capacity}</span>
                    <span className="flex gap-2 sm:justify-end w-full sm:w-auto">
                      <button onClick={() => setSelectedCourseForDetails(course)} className="px-3 py-1.5 rounded-lg border border-brand-gold/30 text-brand-gold text-[11px] hover:bg-brand-gold/10 transition">
                        {language === 'ar' ? 'التفاصيل' : 'Details'}
                      </button>
                      <button onClick={() => onOpenEnroll(course.program, course.code, course.title)} className="px-3 py-1.5 rounded-lg bg-brand-gold text-black text-[11px] font-bold hover:brightness-110 transition">
                        {language === 'ar' ? 'تسجيل' : 'Enroll'}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 3B. Weekly Timetable / Schedule View */
          <div className="rounded-3xl bg-[#101416]/95 border border-brand-gold/30 p-6 sm:p-8 shadow-2xl overflow-x-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-gold/20">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl text-brand-gold mb-1">
                  {language === 'ar' ? 'الجدول الأسبوعي المعتمد' : 'Weekly Conservatory Timetable'}
                </h3>
                <p className="text-xs text-brand-muted">
                  {language === 'ar'
                    ? 'أوقات التدريبات اليومية في قاعات بيتيپا، نيجينسكي، وبافلوفا'
                    : 'Studio session allocations across Petipa, Nijinsky, and Pavlova halls'}
                </p>
              </div>

              <span className="text-xs text-brand-gold/70 font-mono px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30">
                {language === 'ar' ? 'تحديث حي' : 'Live Sync'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 min-w-[900px]">
              {daysOfWeek.map((day) => {
                // Find classes that run on this day
                const dayClasses = filteredCourses.filter((c) =>
                  (c.dayOfWeek || '').toLowerCase().includes(day.toLowerCase())
                );

                return (
                  <div
                    key={day}
                    className="flex flex-col rounded-2xl bg-[#090b0c] border border-brand-gold/20 overflow-hidden"
                  >
                    {/* Day Header */}
                    <div className="p-3 text-center bg-[#13181b] border-b border-brand-gold/20">
                      <span className="font-serif text-sm font-semibold text-brand-gold uppercase block">
                        {language === 'ar' ? dayTranslations[day] : day.substring(0, 3)}
                      </span>
                      <span className="text-[10px] text-brand-muted">
                        {dayClasses.length} {language === 'ar' ? 'حصص' : 'classes'}
                      </span>
                    </div>

                    {/* Classes on this day */}
                    <div className="p-2.5 space-y-2.5 flex-1 min-h-[220px]">
                      {dayClasses.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[11px] text-brand-muted/40 italic text-center py-8">
                          {language === 'ar' ? 'لا توجد حصص' : 'No Sessions'}
                        </div>
                      ) : (
                        dayClasses.map((course) => (
                          <div
                            key={course.id}
                            onClick={() => setSelectedCourseForDetails(course)}
                            className="p-3 rounded-xl bg-[#121618] border border-brand-gold/30 hover:border-brand-gold transition cursor-pointer group shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold">
                                {course.code}
                              </span>
                              <span className="text-[9px] text-brand-muted/80">
                                {course.startTime || '16:00'}
                              </span>
                            </div>

                            <h4 className="font-serif text-xs text-white group-hover:text-brand-gold transition line-clamp-2 mb-1">
                              {language === 'ar' ? (course.titleAr || course.title) : course.title}
                            </h4>

                            <div className="text-[10px] text-brand-muted flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-brand-gold shrink-0" />
                              <span className="truncate">{course.studioRoom || 'Studio Petipa'}</span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEnroll(course.program, course.code, course.title);
                              }}
                              className="w-full mt-2 py-1 rounded bg-brand-gold/15 hover:bg-brand-gold hover:text-black text-brand-gold text-[10px] font-medium transition text-center"
                            >
                              {language === 'ar' ? 'تسجيل' : 'Enroll'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Detailed Class Syllabus Modal */}
      {selectedCourseForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0f1214] border border-brand-gold/50 rounded-3xl shadow-[0_0_60px_rgba(226,190,104,0.3)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-brand-gold/20 flex items-center justify-between bg-[#14181b]">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-3 py-1 rounded-md bg-brand-gold/20 border border-brand-gold/50 text-brand-gold">
                  {selectedCourseForDetails.code}
                </span>
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl text-brand-gold font-medium">
                    {language === 'ar'
                      ? (selectedCourseForDetails.titleAr || selectedCourseForDetails.title)
                      : selectedCourseForDetails.title}
                  </h3>
                  <span className="text-xs text-brand-muted">
                    {selectedCourseForDetails.program.toUpperCase()} • {selectedCourseForDetails.level.toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCourseForDetails(null)}
                className="text-brand-gold/70 hover:text-brand-gold-light w-8 h-8 rounded-full border border-brand-gold/30 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Description */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-brand-gold mb-2 flex items-center gap-1.5 font-semibold">
                  <BookOpen className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'الوصف الأكاديمي والمنهج' : 'Curriculum & Pedagogical Focus'}
                </h4>
                <p className="text-brand-muted/90 leading-relaxed font-light bg-[#090b0c] p-4 rounded-xl border border-brand-gold/15">
                  {language === 'ar'
                    ? (selectedCourseForDetails.descriptionAr || selectedCourseForDetails.description)
                    : selectedCourseForDetails.description}
                </p>
              </div>

              {/* Master Instructor Info */}
              {selectedCourseForDetails.instructor && (
                <div className="p-4 rounded-2xl bg-[#14181b] border border-brand-gold/25 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-2 border-brand-gold overflow-hidden shrink-0">
                    <SmartImage
                      src={selectedCourseForDetails.instructor.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'}
                      alt={selectedCourseForDetails.instructor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-gold uppercase tracking-wider block">
                      {language === 'ar' ? 'الأستاذ المشرف على الدورة' : 'Course Master Faculty'}
                    </span>
                    <h5 className="font-serif text-lg text-white font-medium">
                      {language === 'ar' ? (selectedCourseForDetails.instructor.nameAr || selectedCourseForDetails.instructor.name) : selectedCourseForDetails.instructor.name}
                    </h5>
                    <span className="text-xs text-brand-muted/80">
                      {selectedCourseForDetails.instructor.email || selectedCourseForDetails.instructor.department}
                    </span>
                  </div>
                </div>
              )}

              {/* Timing, Studio, Capacity Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#090b0c] border border-brand-gold/15">
                  <span className="text-[10px] text-brand-muted uppercase block mb-1">
                    {language === 'ar' ? 'الأيام والأوقات' : 'Schedule'}
                  </span>
                  <span className="font-medium text-white block">
                    {selectedCourseForDetails.dayOfWeek}
                  </span>
                  <span className="text-xs text-brand-gold">
                    {selectedCourseForDetails.startTime} - {selectedCourseForDetails.endTime}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090b0c] border border-brand-gold/15">
                  <span className="text-[10px] text-brand-muted uppercase block mb-1">
                    {language === 'ar' ? 'القاعة' : 'Studio Hall'}
                  </span>
                  <span className="font-medium text-white block">
                    {selectedCourseForDetails.studioRoom || 'Grand Studio Petipa'}
                  </span>
                  <span className="text-xs text-brand-muted/70">
                    Floor: Harlequin Liberty Ballet
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090b0c] border border-brand-gold/15">
                  <span className="text-[10px] text-brand-muted uppercase block mb-1">
                    {language === 'ar' ? 'سعة المجموعة' : 'Cohort Size'}
                  </span>
                  <span className="font-medium text-white block">
                    {selectedCourseForDetails.capacity || 20} Dancers Max
                  </span>
                  <span className="text-xs text-emerald-400">
                    Active Enrollment
                  </span>
                </div>
              </div>

              {/* Scheduled Sessions List */}
              {selectedCourseForDetails.sessions && selectedCourseForDetails.sessions.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-brand-gold mb-2.5 flex items-center gap-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    {language === 'ar' ? 'الجلسات والتدريبات القادمة' : 'Upcoming Scheduled Sessions'}
                  </h4>
                  <div className="space-y-2">
                    {selectedCourseForDetails.sessions.map((ses) => (
                      <div
                        key={ses.id}
                        className="p-3 rounded-xl bg-[#090b0c] border border-brand-gold/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-medium text-white block">{ses.title}</span>
                          <span className="text-[11px] text-brand-muted">
                            {new Date(ses.sessionDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-mono text-xs">
                            {ses.startTime} - {ses.endTime}
                          </span>
                          <span className="text-brand-muted/80">{ses.studioRoom}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-brand-gold/20 bg-[#14181b] flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedCourseForDetails(null)}
                className="px-5 py-2.5 rounded-xl border border-brand-gold/30 hover:border-brand-gold text-brand-gold text-xs transition"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>

              {(() => {
                const c = selectedCourseForDetails;
                const count = c._count?.enrollments || c.enrollments?.length || 0;
                const full = count >= (c.capacity || 20);
                const mine = (students || []).filter((s) => s.familyId === (currentFamilyId || s.familyId));
                const dancer = mine.find((s) => s.id === activeStudentId) || mine[0];
                const alreadyIn = (c.enrollments || []).some((e: any) => dancer && (e.studentId === dancer.id || e.student?.id === dancer.id));
                if (full && dancer && !alreadyIn) {
                  return (
                    <button
                      onClick={async () => {
                        try {
                          const { data: body } = await api.post(`/api/courses/${c.id}/waitlist`, { studentId: dancer.id });
                          showToast(
                            language === 'ar' ? 'انضممت لقائمة الانتظار' : 'Joined waitlist',
                            language === 'ar' ? `رقمك #${body.position} — سنخطرك عند توفر مقعد.` : `You're #${body.position} — we'll notify you when a seat opens.`,
                            'success',
                          );
                          setSelectedCourseForDetails(null);
                        } catch (e) {
                          showToast(language === 'ar' ? 'تعذر الانضمام' : 'Join failed', errMsg(e), 'error');
                        }
                      }}
                      className="px-6 py-2.5 rounded-xl border border-amber-400/60 text-amber-300 font-semibold text-xs transition flex items-center gap-2 hover:bg-amber-400/10"
                    >
                      <span>{language === 'ar' ? 'انضمي لقائمة الانتظار' : 'Join waitlist'}</span>
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  );
                }
                return null;
              })()}

              <button
                onClick={() => {
                  const course = selectedCourseForDetails;
                  setSelectedCourseForDetails(null);
                  onOpenEnroll(course.program, course.code, course.title);
                }}
                className="px-6 py-2.5 rounded-xl gold-btn text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg"
              >
                <span>{language === 'ar' ? 'التقديم والانضمام لهذه المجموعة' : 'Apply for this Group'}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
