import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CourseSession, CourseItem } from '../../types';
import { exportCsv } from '../../utils/csv';
import { StudentDetailModal } from './StudentDetailModal';
import { RollCallBar, MarkToggle, GradeModal } from './InstructorGrading';
import { InstructorPayStrip } from './InstructorPayStrip';
import { SmartImage } from '../ui/SmartImage';
import { api, errMsg } from '../../utils/api';
import {
  GraduationCap,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Send,
  Bell,
  Sparkles,
  LogOut,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Search,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Radio,
  ClipboardCheck,
  Star,
  QrCode,
  Download,
  LayoutGrid,
  Rows3,
  X,
} from 'lucide-react';

export const InstructorPortal: React.FC = () => {
  const {
    instructorUser,
    instructorSchedule,
    logoutInstructor,
    courses,
    courseSessions,
    language,
    triggerSessionReminder,
    broadcastClassMessage,
    showToast,
  } = useApp();

  // Prefer specific assigned courses from backend instructorSchedule
  const myCourses =
    instructorSchedule?.assignedCourses && instructorSchedule.assignedCourses.length > 0
      ? instructorSchedule.assignedCourses
      : courses.filter(
          (c) =>
            !instructorUser?.id ||
            c.instructorId === instructorUser.id ||
            instructorUser.role === 'superadmin' ||
            instructorUser.role === 'owner'
        );

  // Prefer specific teaching sessions from backend instructorSchedule
  const mySessions =
    instructorSchedule?.weeklySessions && instructorSchedule.weeklySessions.length > 0
      ? instructorSchedule.weeklySessions
      : courseSessions
          .filter((s) => myCourses.some((c) => c.id === s.courseId || (s.groupId && c.id === s.groupId)) || s.instructorId === instructorUser?.id)
          .sort(
            (a, b) =>
              new Date(`${a.sessionDate}T${a.startTime}`).getTime() -
              new Date(`${b.sessionDate}T${b.startTime}`).getTime()
          );

  const instructorCardCode =
    instructorSchedule?.instructor?.cardCode || instructorUser?.cardCode || instructorUser?.id || '';
  const totalEnrolledStudents =
    instructorSchedule?.totalStudentsCount !== undefined
      ? instructorSchedule.totalStudentsCount
      : myCourses.reduce((acc, c) => acc + (c.enrollments?.length || 0), 0);


  // Filter tabs: 'week' | 'today' | 'all'
  const [filterTab, setFilterTab] = useState<'week' | 'today' | 'all'>('week');
  const [sessionSearch, setSessionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sessionView, setSessionView] = useState<'cards' | 'rows'>('cards');
  const [selectedSession, setSelectedSession] = useState<CourseSession | null>(null);

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedCourseForBroadcast, setSelectedCourseForBroadcast] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Sending reminder loading tracker
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Roster student detail sheet
  const [selectedRosterStudent, setSelectedRosterStudent] = useState<any | null>(null);

  // Roll-call + grading state (per selected session)
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [gradeStudent, setGradeStudent] = useState<any | null>(null);

  // Self check-in QR modal
  const [qr, setQr] = useState<{ qrDataUrl: string; url: string; expiresAt: string; label: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    setAttendanceMode(false);
    setMarks({});
    setGradeStudent(null);
    setQr(null);
  }, [selectedSession?.id]);

  const openQr = async () => {
    if (!selectedSession) return;
    setQrLoading(true);
    try {
      const { data } = await api.get(`/api/courses/sessions/${selectedSession.id}/checkin-qr`);
      setQr(data);
    } catch (e) {
      showToast(language === 'ar' ? 'تعذر إنشاء الرمز' : 'QR failed', errMsg(e), 'error');
    } finally {
      setQrLoading(false);
    }
  };

  // Today's date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredSessions = mySessions.filter((s) => {
    if (filterTab === 'today') {
      if (s.sessionDate !== todayStr) return false;
    } else if (filterTab === 'week') {
      const now = new Date();
      const sesDate = new Date(s.sessionDate);
      const diffDays = (sesDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
      if (!(diffDays >= -1 && diffDays <= 7)) return false;
    }
    if (statusFilter !== 'all' && (s.status || 'scheduled') !== statusFilter) return false;
    const needle = sessionSearch.trim().toLowerCase();
    if (needle) {
      const hay = `${s.title} ${s.studioRoom} ${s.sessionDate} ${s.startTime}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const handleExportSessions = () => {
    exportCsv(`instructor-sessions-${todayStr}`, ['title', 'sessionDate', 'startTime', 'endTime', 'studioRoom', 'status'], filteredSessions.map((s) => ({
      title: s.title, sessionDate: s.sessionDate, startTime: s.startTime, endTime: s.endTime, studioRoom: s.studioRoom, status: s.status || 'scheduled',
    })));
    showToast(language === 'ar' ? 'تم تصدير الحصص' : 'Sessions exported', `${filteredSessions.length} sessions → CSV`, 'gold');
  };

  const handleSendReminder = async (sessionId: string) => {
    setSendingReminderId(sessionId);
    try {
      await triggerSessionReminder(sessionId);
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForBroadcast || !broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    try {
      await broadcastClassMessage(selectedCourseForBroadcast, broadcastMessage.trim());
      setShowBroadcastModal(false);
      setBroadcastMessage('');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const activeCourse = selectedSession ? courses.find((c) => c.id === selectedSession.courseId || (selectedSession.groupId && c.id === selectedSession.groupId)) : null;
  const enrolledStudents = activeCourse?.enrollments || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <InstructorPayStrip />
      {/* Welcome & Faculty Header Card */}
      <div className="bg-[#101314] border border-brand-gold/40 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#caa868]/30 to-[#090c0d] border-2 border-brand-gold/60 flex items-center justify-center text-brand-gold overflow-hidden shadow-[0_0_20px_rgba(202,168,104,0.3)]">
              {instructorUser?.avatarUrl ? (
                <img
                  src={instructorUser.avatarUrl}
                  alt={instructorUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#101314] ring-2 ring-emerald-500/20" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-gold/90 px-2 py-0.5 rounded bg-brand-gold/10 border border-brand-gold/30">
                {language === 'ar' ? 'هيئة التدريس المعتمدة' : 'Conservatory Faculty'}
              </span>
              <span className="text-[10px] font-mono font-bold text-[#fdf1c2] px-2 py-0.5 rounded bg-black/60 border border-brand-gold/40">
                Card ID: {instructorCardCode}
              </span>
              <span className="text-xs text-brand-muted/70 capitalize">
                {instructorUser?.role || 'Instructor'}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#fdf1c2] font-medium">
              {instructorUser?.name || (language === 'ar' ? 'أستاذ الباليه' : 'Faculty Instructor')}
            </h2>
            <p className="text-xs text-brand-muted/80 mt-1">
              {instructorUser?.email} {instructorUser?.phone ? `• ${instructorUser.phone}` : ''}
            </p>
          </div>
        </div>



        {/* Action Controls: Instant Broadcast & Sign Out */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              if (myCourses.length > 0) {
                setSelectedCourseForBroadcast(myCourses[0].id);
              }
              setShowBroadcastModal(true);
            }}
            className="gold-btn w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-black flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(202,168,104,0.3)] transition active:scale-95 min-h-[42px]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تعميم واتساب للفصل' : 'Broadcast to Class'}</span>
          </button>

          <button
            onClick={logoutInstructor}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-brand-gold/30 hover:border-brand-gold bg-[#121617] hover:bg-[#181d1f] text-xs text-brand-gold transition flex items-center justify-center gap-2 min-h-[42px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-brand-gold/25 bg-[#0e1112] space-y-1">
          <span className="text-[11px] text-brand-gold/80 uppercase font-mono tracking-wider block">
            {language === 'ar' ? 'حصص الأسبوع المقررة' : 'Scheduled This Week'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-white">{mySessions.length}</span>
            <span className="text-xs text-brand-muted/70">{language === 'ar' ? 'حصص تدريب' : 'sessions'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-brand-gold/25 bg-[#0e1112] space-y-1">
          <span className="text-[11px] text-brand-gold/80 uppercase font-mono tracking-wider block">
            {language === 'ar' ? 'حصص اليوم النشطة' : 'Sessions Today'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-emerald-400">
              {mySessions.filter((s) => s.sessionDate === todayStr).length}
            </span>
            <span className="text-xs text-brand-muted/70">{language === 'ar' ? 'اليوم' : 'today'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-brand-gold/25 bg-[#0e1112] space-y-1">
          <span className="text-[11px] text-brand-gold/80 uppercase font-mono tracking-wider block">
            {language === 'ar' ? 'الدورات المسندة' : 'Assigned Courses'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#fdf1c2]">{myCourses.length}</span>
            <span className="text-xs text-brand-muted/70">{language === 'ar' ? 'مقررات' : 'courses'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-brand-gold/25 bg-[#0e1112] space-y-1">
          <span className="text-[11px] text-brand-gold/80 uppercase font-mono tracking-wider block">
            {language === 'ar' ? 'إجمالي الطلاب المسجلين' : 'Enrolled Students'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-brand-gold">
              {totalEnrolledStudents}
            </span>
            <span className="text-xs text-brand-muted/70">{language === 'ar' ? 'راقص' : 'dancers'}</span>
          </div>
        </div>
      </div>


      {/* SESSIONS SCHEDULE & ROSTER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Scheduled Sessions to Attend */}
        <div className="lg:col-span-7 bg-[#101314] border border-brand-gold/30 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-gold/20 pb-4">
            <div className="flex items-center gap-2.5 text-brand-gold">
              <Calendar className="w-5 h-5" />
              <h3 className="font-serif text-xl text-[#fdf1c2]">
                {language === 'ar' ? 'جدول الحصص والالتزام الأسبوعي' : 'Weekly Attendance Schedule'}
              </h3>
            </div>

            {/* Filter Pills */}
            <div className="inline-flex rounded-xl p-1 bg-[#080a0b] border border-brand-gold/20 text-xs">
              <button
                onClick={() => setFilterTab('week')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterTab === 'week' ? 'bg-brand-gold text-black font-semibold' : 'text-brand-muted hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الأسبوع الحالي' : 'This Week'}
              </button>
              <button
                onClick={() => setFilterTab('today')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterTab === 'today' ? 'bg-brand-gold text-black font-semibold' : 'text-brand-muted hover:text-white'
                }`}
              >
                {language === 'ar' ? 'اليوم' : 'Today'}
              </button>
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterTab === 'all' ? 'bg-brand-gold text-black font-semibold' : 'text-brand-muted hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All'}
              </button>
            </div>
          </div>

          {/* Search + status filter + rows/cards + CSV */}
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-brand-gold/60 pointer-events-none" />
              <input
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن حصة، قاعة، تاريخ...' : 'Search sessions, studio, date...'}
                className="w-full bg-[#080a0b] border border-brand-gold/25 rounded-xl ps-9 pe-9 py-2 text-xs text-[#fdf1c2] placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold"
                aria-label={language === 'ar' ? 'بحث الحصص' : 'Search sessions'}
              />
              {sessionSearch && (
                <button onClick={() => setSessionSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white p-1" aria-label="Clear search">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>
            <div className="flex items-center gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#080a0b] border border-brand-gold/25 rounded-xl px-3 py-2 text-xs text-brand-gold" aria-label="Status">
                <option value="all">{language === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
                <option value="scheduled">scheduled</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
              <div className="flex items-center gap-1 p-1 bg-[#080a0b] border border-brand-gold/20 rounded-xl" role="group" aria-label="Layout">
                <button onClick={() => setSessionView('cards')} aria-pressed={sessionView === 'cards'} title="Cards" className={`p-1.5 rounded-lg transition ${sessionView === 'cards' ? 'bg-brand-gold text-black' : 'text-brand-muted hover:text-brand-gold'}`}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setSessionView('rows')} aria-pressed={sessionView === 'rows'} title="Rows" className={`p-1.5 rounded-lg transition ${sessionView === 'rows' ? 'bg-brand-gold text-black' : 'text-brand-muted hover:text-brand-gold'}`}>
                  <Rows3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <button onClick={handleExportSessions} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-black text-[11px] font-bold transition" title="Export CSV">
                <Download className="w-3.5 h-3.5" /><span>CSV</span>
              </button>
            </div>
          </div>

          <div className={sessionView === 'rows' ? 'divide-y divide-brand-gold/10 rounded-2xl border border-brand-gold/20 overflow-hidden' : 'space-y-3'}>
            {filteredSessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-brand-muted/70 border border-dashed border-brand-gold/20 rounded-2xl">
                {language === 'ar'
                  ? 'لا توجد حصص مجدولة تطابق معايير العرض المحددة.'
                  : 'No scheduled sessions match the selected filter.'}
              </div>
            ) : sessionView === 'rows' ? (
              filteredSessions.map((ses) => (
                <button
                  key={ses.id}
                  onClick={() => setSelectedSession(ses)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition hover:bg-white/[0.03] ${selectedSession?.id === ses.id ? 'bg-brand-gold/10' : ''}`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-white truncate">{ses.title}</span>
                    <span className="block text-[11px] text-brand-muted truncate">{ses.sessionDate} • {ses.startTime} • {ses.studioRoom}</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-brand-gold/30 text-brand-gold flex-shrink-0">{ses.status || 'scheduled'}</span>
                </button>
              ))
            ) : (
              filteredSessions.map((ses) => {
                const isToday = ses.sessionDate === todayStr;
                const isSelected = selectedSession?.id === ses.id;
                const course = courses.find((c) => c.id === ses.courseId || (ses.groupId && c.id === ses.groupId));

                return (
                  <div
                    key={ses.id}
                    onClick={() => setSelectedSession(ses)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-brand-gold bg-[#181d20] shadow-[0_0_20px_rgba(202,168,104,0.2)]'
                        : isToday
                        ? 'border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-500/60'
                        : 'border-brand-gold/20 bg-[#0c0e10] hover:border-brand-gold/40'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {isToday && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                            {language === 'ar' ? 'اليوم' : 'Today'}
                          </span>
                        )}
                        {(course?.code || ses.title) && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                            {course?.code || ses.title.slice(0, 3).toUpperCase()}
                          </span>
                        )}
                        <h4 className="font-serif text-base font-semibold text-[#fdf1c2]">
                          {ses.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-brand-muted/80">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                          <span>{ses.sessionDate}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-brand-gold" />
                          <span>{ses.startTime} - {ses.endTime}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[#dfbe82]">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{ses.studioRoom}</span>
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400 font-mono">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {course?.enrollments?.length || course?._count?.enrollments || 0} {language === 'ar' ? 'طلاب' : 'students'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Actions: Send WhatsApp pre-session reminder */}
                    <div className="flex items-center gap-2 self-start sm:self-auto" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleSendReminder(ses.id)}
                        disabled={sendingReminderId === ses.id}
                        title={language === 'ar' ? 'إرسال تذكير واتساب فوري للطلاب والمدرب' : 'Send pre-session WhatsApp reminder'}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                          ses.reminderSent
                            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'gold-btn text-black'
                        }`}
                      >
                        <Bell className={`w-3.5 h-3.5 ${sendingReminderId === ses.id ? 'animate-spin' : ''}`} />
                        <span>
                          {sendingReminderId === ses.id
                            ? language === 'ar'
                              ? 'جارٍ الإرسال...'
                              : 'Sending...'
                            : ses.reminderSent
                            ? language === 'ar'
                              ? 'تم التذكير ✓'
                              : 'Reminder Sent'
                            : language === 'ar'
                            ? 'تذكير واتساب'
                            : 'Send Reminder'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Session Roster & Instant Details */}
        <div className="lg:col-span-5 bg-[#101314] border border-brand-gold/30 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-brand-gold/20 pb-4">
            <div className="flex items-center gap-2 text-brand-gold">
              <Users className="w-5 h-5" />
              <h3 className="font-serif text-lg text-[#fdf1c2]">
                {language === 'ar' ? 'قائمة طلاب الحصة المحددة' : 'Class Student Roster'}
              </h3>
            </div>
            {selectedSession && (
              <span className="text-[11px] font-mono text-brand-gold">
                {selectedSession.sessionDate} • {selectedSession.startTime}
              </span>
            )}
          </div>

          {selectedSession ? (
            <div className="space-y-4">
              {/* Roll-call toggle */}
              <div className="flex gap-2">
              <button
                onClick={() => { setAttendanceMode((v) => !v); setMarks({}); }}
                aria-pressed={attendanceMode}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  attendanceMode
                    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                    : 'border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                {attendanceMode
                  ? (language === 'ar' ? 'إنهاء وضع الحضور' : 'Exit roll-call mode')
                  : (language === 'ar' ? 'تسجيل حضور الحصة' : 'Take attendance')}
              </button>
              <button
                onClick={openQr}
                disabled={qrLoading}
                className="py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 disabled:opacity-50"
                title={language === 'ar' ? 'رمز الحضور الذاتي' : 'Self check-in QR'}
              >
                <QrCode className="w-4 h-4" />
                {language === 'ar' ? 'رمز QR' : 'QR'}
              </button>
              </div>
              {/* Session Summary Card */}
              <div className="p-4 rounded-2xl bg-[#090b0d] border border-brand-gold/25 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-base text-[#fdf1c2] font-semibold">
                    {selectedSession.title}
                  </h4>
                  <span className="text-xs text-brand-gold font-mono">
                    {selectedSession.studioRoom}
                  </span>
                </div>
                <p className="text-xs text-brand-muted/80">
                  {language === 'ar'
                    ? `إجمالي الطلاب المقيدين في الدورة: ${enrolledStudents.length} طلاب.`
                    : `Total enrolled students in course: ${enrolledStudents.length}.`}
                </p>
              </div>

              {/* Student List */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {enrolledStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-brand-muted/70">
                    {language === 'ar'
                      ? 'لا يوجد طلاب مسجلون في هذه الدورة حالياً.'
                      : 'No students currently enrolled in this course.'}
                  </div>
                ) : (
                  enrolledStudents.map((enrollment) => {
                    const stu = enrollment.student;
                    if (!stu) return null;

                    return (
                      <div
                        key={enrollment.id}
                        onClick={() => { if (!attendanceMode) setSelectedRosterStudent(stu); }}
                        title={language === 'ar' ? 'فتح صفحة الطالب' : 'Open student page'}
                        className={`w-full p-3.5 rounded-xl border border-brand-gold/20 bg-[#0c0f10] hover:border-brand-gold/60 hover:bg-[#101415] transition flex items-center justify-between gap-3 text-xs text-start group/roster ${attendanceMode ? '' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3">
                          <SmartImage
                            src={stu.photoUrl || '/hero-ballerina.jpg'}
                            alt={stu.name}
                            className="w-10 h-10 rounded-xl object-cover border border-brand-gold/40 shrink-0"
                          />
                          <div>
                            <span className="font-semibold text-white block group-hover/roster:text-[#fdf1c2] transition">
                              {language === 'ar' ? stu.nameAr || stu.name : stu.name}
                            </span>
                            <span className="text-[11px] text-brand-muted/70 block">
                              {stu.level} • {stu.parentName} ({stu.parentPhone})
                            </span>
                          </div>
                        </div>

                        <span className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setGradeStudent(stu); }}
                            title={language === 'ar' ? 'تقييم الطالب' : 'Grade dancer'}
                            aria-label={language === 'ar' ? `تقييم ${stu.name}` : `Grade ${stu.name}`}
                            className="p-2 rounded-lg border border-brand-gold/30 text-brand-gold hover:bg-brand-gold/15 transition"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          {attendanceMode ? (
                            <MarkToggle
                              value={marks[stu.id]}
                              onChange={(present) => setMarks((m) => ({ ...m, [stu.id]: present }))}
                            />
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono shrink-0">
                              {language === 'ar' ? 'مسجل ومؤكد' : 'Confirmed'}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              {attendanceMode && selectedSession && (
                <RollCallBar
                  sessionId={selectedSession.id}
                  marks={marks}
                  count={Object.keys(marks).length}
                  onSaved={(msg) => {
                    showToast(language === 'ar' ? 'تم حفظ الحضور' : 'Attendance saved', msg, 'success');
                    setMarks({});
                    setAttendanceMode(false);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-brand-muted/70 border border-dashed border-brand-gold/20 rounded-2xl space-y-2">
              <Users className="w-8 h-8 text-brand-gold/40 mx-auto" />
              <p>
                {language === 'ar'
                  ? 'اختر إحدى الحصص من الجدول الأسبوعي على اليسار لعرض سجل طلابها.'
                  : 'Select a session from the schedule on the left to inspect its student roster.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast WhatsApp Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#101314] border border-brand-gold/60 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brand-gold/30 pb-3">
              <div className="flex items-center gap-2 text-brand-gold">
                <Send className="w-5 h-5" />
                <h3 className="font-serif text-xl text-[#fdf1c2]">
                  {language === 'ar' ? 'تعميم واتساب لطلاب الدورة' : 'Broadcast to Class WhatsApp'}
                </h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-brand-muted hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-brand-muted/80 leading-relaxed">
              {language === 'ar'
                ? 'سيتم إرسال هذا الإشعار مباشرة إلى أرقام واتساب جميع أولياء أمور الطلاب المسجلين بالدورة المحددة.'
                : 'This announcement will be dispatched directly to all parents of students enrolled in the selected course.'}
            </p>

            <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-brand-gold mb-1">
                  {language === 'ar' ? 'الدورة المستهدفة' : 'Target Course'}
                </label>
                <select
                  value={selectedCourseForBroadcast}
                  onChange={(e) => setSelectedCourseForBroadcast(e.target.value)}
                  className="w-full form-gold-input px-3 py-2.5 rounded-xl bg-[#090b0d] text-xs text-white border border-brand-gold/40 cursor-pointer"
                >
                  {myCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title} ({c.enrollments?.length || c._count?.enrollments || 0} students)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-brand-gold mb-1">
                  {language === 'ar' ? 'نص التعميم' : 'Announcement Message'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'مرحباً بالجميع! يُرجى العلم بأن تمرينات الإحماء تبدأ غداً قبل 15 دقيقة في استوديو الأوبرا...'
                      : 'Dear dancers, please note that floor barre and warm-ups will commence 15 minutes prior in Studio Opéra...'
                  }
                  className="w-full form-gold-input p-3 rounded-xl bg-[#090b0d] text-xs text-white border border-brand-gold/40 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-brand-gold/20">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-brand-muted/70 hover:text-white"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="gold-btn px-6 py-2.5 rounded-xl text-black font-semibold text-xs flex items-center gap-2"
                >
                  <Send className={`w-3.5 h-3.5 ${sendingBroadcast ? 'animate-spin' : ''}`} />
                  <span>
                    {sendingBroadcast
                      ? language === 'ar'
                        ? 'جارٍ التعميم...'
                        : 'Broadcasting...'
                      : language === 'ar'
                      ? 'إرسال التعميم الآن'
                      : 'Dispatch Broadcast'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster student detail sheet */}
      {selectedRosterStudent && (
        <StudentDetailModal
          student={selectedRosterStudent}
          contextTitle={
            activeCourse
              ? language === 'ar'
                ? `${activeCourse.titleAr || activeCourse.title}`
                : `${activeCourse.title}`
              : undefined
          }
          onClose={() => setSelectedRosterStudent(null)}
        />
      )}

      {/* Grading modal */}
      {gradeStudent && (
        <GradeModal
          student={gradeStudent}
          evaluator={instructorUser?.name || 'Instructor'}
          onClose={() => setGradeStudent(null)}
        />
      )}

      {/* Self check-in QR */}
      {qr && (
        <div role="dialog" aria-modal="true" aria-label="Self check-in QR" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setQr(null)}>
          <div className="bg-[#101314] border border-brand-gold/60 rounded-2xl max-w-sm w-full p-6 text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl text-[#fdf1c2]">{language === 'ar' ? 'امسح لتسجيل الحضور' : 'Scan to check in'}</h3>
            <p className="text-xs text-brand-muted">{qr.label}</p>
            <img src={qr.qrDataUrl} alt="Session check-in QR" className="w-64 h-64 mx-auto rounded-xl bg-white p-2" />
            <p className="text-[11px] text-brand-muted/70 font-mono" dir="ltr">valid to {new Date(qr.expiresAt).toLocaleString()}</p>
            <button onClick={() => setQr(null)} className="gold-btn px-6 py-2.5 rounded-xl text-black text-xs font-bold">
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
