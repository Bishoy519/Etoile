import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api } from '../utils/api';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { CourseItem, CourseSession } from '../types';
import { StudentProfilePage } from './StudentProfilePage';
import { StaffProfilePage } from './StaffProfilePage';
import { CourseWaitlist } from './CourseWaitlist';
import {
  GraduationCap,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Send,
  Bell,
  Settings,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  BookOpen,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
  MessageSquare,
  Flame,
  Download,
} from 'lucide-react';

export const CourseManagement: React.FC = () => {
  const {
    courses,
    courseSessions,
    reminderConfig,
    students,
    staffList,
    language,
    showToast,
    showConfirmNotification,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollStudentInCourse,
    unenrollStudentFromCourse,
    createCourseSession,
    deleteCourseSession,
    sendCourseSessionReminder,
    updateReminderConfig,
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedCourseQuery = useDebouncedValue(searchQuery, 200);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const courseView = useViewPrefs('courses-catalog', 'cards');
  
  // Modals state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<CourseItem | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'sessions' | 'enrollments'>('sessions');

  // Person profile overlays — course modal state is preserved underneath
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [viewingStaffId, setViewingStaffId] = useState<string | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Form states for Course creation
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    program: 'classical' as 'classical' | 'contemporary' | 'youth',
    level: 'conservatory',
    capacity: 20,
    instructorId: '',
    dayOfWeek: 'Monday, Wednesday',
    startTime: '16:00',
    endTime: '17:30',
    studioRoom: 'Grand Studio Petipa',
    branchCode: 'ZAM',
  });

  const [branches, setBranches] = useState<{ code: string; name: string; nameAr?: string }[]>([
    { code: 'ZAM', name: 'Zamalek — Studio Opéra' },
    { code: 'NCAIRO', name: 'New Cairo — Studio Pavlova' },
  ]);
  useEffect(() => {
    api.get('/api/branches')
      .then((r) => r.data)
      .then((d: unknown) => { if (Array.isArray(d) && d.length > 0) setBranches(d); })
      .catch(() => {});
  }, []);

  // Form state for new session
  const [newSessionData, setNewSessionData] = useState({
    title: '',
    sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '16:00',
    endTime: '17:30',
    studioRoom: 'Grand Studio Petipa',
    instructorId: '',
    notes: '',
  });

  // Form state for student enrollment
  const [enrollStudentId, setEnrollStudentId] = useState('');

  // Form state for reminder settings
  const [settingsData, setSettingsData] = useState({
    enabled: reminderConfig?.enabled ?? true,
    sendMinutesBefore: reminderConfig?.sendMinutesBefore ?? 60,
    studentTemplateEn: reminderConfig?.studentTemplateEn ?? '',
    studentTemplateAr: reminderConfig?.studentTemplateAr ?? '',
    instructorTemplateEn: reminderConfig?.instructorTemplateEn ?? '',
    instructorTemplateAr: reminderConfig?.instructorTemplateAr ?? '',
    autoCron: reminderConfig?.autoCron ?? true,
  });

  const instructors = staffList.filter((s) => s.role === 'instructor' || s.role === 'superadmin' || s.role === 'owner');

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      code: `BAL-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      titleAr: '',
      description: '',
      descriptionAr: '',
      program: 'classical',
      level: 'pre-pro',
      capacity: 16,
      instructorId: instructors[0]?.id || '',
      dayOfWeek: 'Monday, Wednesday, Friday',
      startTime: '16:00',
      endTime: '17:30',
      studioRoom: 'Grand Studio Petipa',
      branchCode: 'ZAM',
    });
    setShowCourseModal(true);
  };

  const handleOpenEditModal = (course: CourseItem) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      title: course.title,
      titleAr: course.titleAr || '',
      description: course.description || '',
      descriptionAr: course.descriptionAr || '',
      program: course.program,
      level: course.level,
      capacity: course.capacity,
      instructorId: course.instructorId || '',
      dayOfWeek: course.dayOfWeek || 'Monday, Wednesday',
      startTime: course.startTime || '16:00',
      endTime: course.endTime || '17:30',
      studioRoom: course.studioRoom || 'Grand Studio Petipa',
      branchCode: course.branchCode || 'ZAM',
    });
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      showToast('Validation Error', 'Course title is required (min 3 chars).', 'error');
      return;
    }
    if (!formData.code.trim()) {
      showToast('Validation Error', 'Course code is required.', 'error');
      return;
    }
    const cap = Number(formData.capacity);
    if (!Number.isFinite(cap) || !Number.isInteger(cap) || cap < 1 || cap > 100) {
      showToast('Validation Error', 'Capacity must be a whole number between 1 and 100.', 'error');
      return;
    }
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      showToast('Validation Error', 'End time must be after start time.', 'error');
      return;
    }
    if (!formData.instructorId) {
      showToast('Validation Error', 'Please assign an instructor.', 'error');
      return;
    }

    try {
      if (editingCourse) {
        const res = await updateCourse(editingCourse.id, formData);
        if (!res) { showToast('Save failed', 'Could not update course. Try again.', 'error'); return; }
      } else {
        const res = await createCourse(formData);
        if (!res) { showToast('Save failed', 'Could not create course. Try again.', 'error'); return; }
      }
      setShowCourseModal(false);
    } catch {
      showToast('Save failed', 'Could not save course. Try again.', 'error');
    }
  };

  const handleDeleteCourse = async (course: CourseItem) => {
    showConfirmNotification({
      title: language === 'ar' ? 'حذف الدورة التدريبية' : 'Delete Course',
      message: language === 'ar'
        ? `هل أنت متأكد من حذف دورة "${course.title}"؟`
        : `Are you sure you want to delete course "${course.title}"?`,
      confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete Course',
      cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
      type: 'error',
      onConfirm: async () => {
        await deleteCourse(course.id);
        if (selectedCourseForDetails?.id === course.id) {
          setSelectedCourseForDetails(null);
        }
      },
    });
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForDetails) { showToast('No course', 'Select a course first.', 'error'); return; }
    if (!newSessionData.title.trim() || newSessionData.title.trim().length < 3) {
      showToast('Error', 'Session title is required (min 3 chars).', 'error');
      return;
    }
    if (!newSessionData.sessionDate) {
      showToast('Error', 'Session date is required.', 'error');
      return;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(newSessionData.sessionDate); d.setHours(0, 0, 0, 0);
    if (d < today) {
      showToast('Error', 'Session date cannot be in the past.', 'error');
      return;
    }
    if (newSessionData.startTime && newSessionData.endTime && newSessionData.startTime >= newSessionData.endTime) {
      showToast('Error', 'End time must be after start time.', 'error');
      return;
    }

    try {
      const res = await createCourseSession({
        courseId: selectedCourseForDetails.id,
        title: newSessionData.title.trim(),
        sessionDate: newSessionData.sessionDate,
        startTime: newSessionData.startTime,
        endTime: newSessionData.endTime,
        studioRoom: newSessionData.studioRoom || selectedCourseForDetails.studioRoom,
        instructorId: newSessionData.instructorId || selectedCourseForDetails.instructorId,
        notes: newSessionData.notes,
      });
      if (!res) { showToast('Error', 'Could not schedule session. Try again.', 'error'); return; }
    } catch {
      showToast('Error', 'Could not schedule session. Try again.', 'error');
      return;
    }

    setNewSessionData({
      title: '',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '17:30',
      studioRoom: selectedCourseForDetails.studioRoom || 'Grand Studio Petipa',
      instructorId: selectedCourseForDetails.instructorId || '',
      notes: '',
    });
  };

  const handleEnrollStudent = async () => {
    if (!selectedCourseForDetails || !enrollStudentId) { showToast('Cannot enroll', 'Select a student first.', 'error'); return; }
    const already = selectedCourseForDetails.enrollments?.some((en) => en.studentId === enrollStudentId);
    if (already) { showToast('Already enrolled', 'This student is already on the roster.', 'warning'); return; }
    try {
      const ok = await enrollStudentInCourse(selectedCourseForDetails.id, enrollStudentId);
      if (!ok) { showToast('Enroll failed', 'Could not enroll student. Try again.', 'error'); return; }
    } catch {
      showToast('Enroll failed', 'Could not enroll student. Try again.', 'error');
      return;
    }
    setEnrollStudentId('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsData.studentTemplateEn.trim() && !settingsData.studentTemplateAr.trim()) {
      showToast('Validation Error', 'At least one student template is required.', 'error');
      return;
    }
    try {
      const res = await updateReminderConfig(settingsData);
      if (!res) { showToast('Save failed', 'Could not save reminder settings.', 'error'); return; }
    } catch {
      showToast('Save failed', 'Could not save reminder settings.', 'error');
      return;
    }
    setShowSettingsModal(false);
  };

  // Filtered courses
  const filteredCourses = useMemo(() => (courses || []).filter((c) => {
    const q = debouncedCourseQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      c.title.toLowerCase().includes(q) ||
      (c.titleAr && c.titleAr.includes(debouncedCourseQuery.trim())) ||
      c.code.toLowerCase().includes(q) ||
      (c.instructor?.name && c.instructor.name.toLowerCase().includes(q)) ||
      (c.level || '').toLowerCase().includes(q);

    const matchesProgram = selectedProgram === 'all' || c.program === selectedProgram;
    const matchesLevel = levelFilter === 'all' || c.level === levelFilter;
    return matchesSearch && matchesProgram && matchesLevel;
  }), [courses, debouncedCourseQuery, selectedProgram, levelFilter]);

  const handleExportCourses = () => {
    exportCsv(`courses-${new Date().toISOString().split('T')[0]}`, ['code', 'title', 'program', 'level', 'instructor', 'capacity', 'enrolled'], filteredCourses.map((c) => ({
      code: c.code, title: c.title, program: c.program, level: c.level,
      instructor: c.instructor?.name || '', capacity: c.capacity, enrolled: c._count?.enrollments || c.enrollments?.length || 0,
    })));
    showToast(language === 'ar' ? 'تم تصدير الدورات' : 'Courses exported', `${filteredCourses.length} rows → CSV`, 'success');
  };

  if (viewingStudentId) {
    return (
      <StudentProfilePage
        studentId={viewingStudentId}
        onBack={() => setViewingStudentId(null)}
      />
    );
  }

  if (viewingStaffId) {
    return (
      <StaffProfilePage
        staffId={viewingStaffId}
        onBack={() => setViewingStaffId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-widest font-semibold mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>{language === 'ar' ? 'الأكاديمية والماستركلاس' : 'Curriculum & Faculty'}</span>
          </div>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white">
            {language === 'ar' ? 'إدارة الدورات والحصص التدريبية' : 'Courses & Class Sessions'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ar'
              ? 'إنشاء الدورات وتعيين المدربين وإلحاق الطلاب وجدولة الحصص وإرسال تذكيرات واتساب التلقائية.'
              : 'Create courses, assign faculty instructors, enroll students, schedule sessions, and automate pre-session WhatsApp notifications.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              if (reminderConfig) {
                setSettingsData({
                  enabled: reminderConfig.enabled,
                  sendMinutesBefore: reminderConfig.sendMinutesBefore,
                  studentTemplateEn: reminderConfig.studentTemplateEn,
                  studentTemplateAr: reminderConfig.studentTemplateAr,
                  instructorTemplateEn: reminderConfig.instructorTemplateEn,
                  instructorTemplateAr: reminderConfig.instructorTemplateAr,
                  autoCron: reminderConfig.autoCron,
                });
              }
              setShowSettingsModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/10 bg-[#171d2b] hover:bg-[#1c2333] text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-300" />
            <span>{language === 'ar' ? 'إعدادات تذكير واتساب' : 'Reminder Settings'}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto action-btn-coral px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة دورة جديدة' : 'New Course'}</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold uppercase">
            <span>{language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}</span>
            <BookOpen className="w-4 h-4 text-amber-300" />
          </div>
          <p className="font-heading font-bold text-3xl text-white font-mono">
            {courses?.length || 0}
          </p>
          <span className="text-[10px] text-emerald-400 mt-1 block font-medium">
            {language === 'ar' ? 'نشطة في الجدول الأكاديمي' : 'Active in Academic Syllabus'}
          </span>
        </div>

        <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold uppercase">
            <span>{language === 'ar' ? 'الحصص المجدولة' : 'Upcoming Sessions'}</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <p className="font-heading font-bold text-3xl text-sky-300 font-mono">
            {courseSessions?.length || 0}
          </p>
          <span className="text-[10px] text-sky-400 mt-1 block font-medium">
            {language === 'ar' ? 'حصص هذا الأسبوع' : 'Scheduled this cycle'}
          </span>
        </div>

        <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold uppercase">
            <span>{language === 'ar' ? 'الطلاب المقيدون' : 'Enrolled Dancers'}</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="font-heading font-bold text-3xl text-purple-300 font-mono">
            {(courses || []).reduce((acc, c) => acc + (c._count?.enrollments || 0), 0)}
          </p>
          <span className="text-[10px] text-purple-400 mt-1 block font-medium">
            {language === 'ar' ? 'تسجيلات نشطة بالصفوف' : 'Across all programs'}
          </span>
        </div>

        <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold uppercase">
            <span>{language === 'ar' ? 'إرسال تذكيرات واتساب' : 'WhatsApp Automation'}</span>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-heading font-bold text-2xl text-emerald-400 flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{reminderConfig?.enabled ? `${reminderConfig.sendMinutesBefore}m Prior` : 'Disabled'}</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {language === 'ar' ? 'تلقائي قبل الحصة للطلاب والمدرب' : 'Auto sent before sessions'}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 bg-[#171d2b] border border-white/10 rounded-2xl p-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'البحث عن دورة أو مدرب...' : 'Search course, code, or teacher...'}
              className="w-full bg-[#111622] border border-white/10 rounded-xl pl-9 pr-9 rtl:pl-3 rtl:pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
              aria-label={language === 'ar' ? 'بحث الدورات' : 'Search courses'}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1" aria-label="Clear search">✕</button>
            )}
          </div>

          <div className="flex items-center gap-2 ms-auto">
            <span className="text-[11px] font-mono text-slate-500">{filteredCourses.length}/{(courses || []).length}</span>
            <ViewSwitcher moduleKey="courses-catalog" modes={['cards', 'table', 'rows']} value={{ mode: courseView.mode, density: courseView.density }} onChange={(p) => { courseView.setMode(p.mode); courseView.setDensity(p.density); }} />
            <button onClick={handleExportCourses} className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5" title="Export CSV">
              <Download className="w-3.5 h-3.5" /><span>CSV</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Programs', labelAr: 'الكل' },
            { id: 'classical', label: 'Classical', labelAr: 'الكلاسيكي' },
            { id: 'contemporary', label: 'Contemporary', labelAr: 'المعاصر' },
            { id: 'youth', label: 'Youth', labelAr: 'الناشئين' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedProgram(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedProgram === tab.id
                  ? 'nav-pill-active bg-white text-slate-950 shadow-md shadow-white/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {language === 'ar' ? tab.labelAr : tab.label}
            </button>
          ))}
          <span className="w-px h-5 bg-white/10 mx-1" />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="px-3 py-1.5 rounded-xl text-xs bg-[#111622] border border-white/10 text-white" aria-label="Level">
            <option value="all">{language === 'ar' ? 'كل المستويات' : 'All levels'}</option>
            <option value="beginner">beginner</option>
            <option value="intermediate">intermediate</option>
            <option value="conservatory">conservatory</option>
            <option value="pre-pro">pre-pro</option>
          </select>
          {(searchQuery || selectedProgram !== 'all' || levelFilter !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setSelectedProgram('all'); setLevelFilter('all'); }} className="text-xs text-slate-400 hover:text-rose-300 underline px-1">
              {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* Courses Catalog: cards / table / rows */}
      {courseView.mode === 'rows' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 bg-[#171d2b]">
          {filteredCourses.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">No courses match.</div>
          ) : (
            filteredCourses.map((course) => {
              const enrolledCount = course._count?.enrollments || course.enrollments?.length || 0;
              return (
                <div key={course.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#111622] border border-white/10 text-amber-300 flex-shrink-0">{course.code}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">{course.title}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{course.program} • {course.level} • {course.instructor?.name || ''}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">{enrolledCount}/{course.capacity}</span>
                  <button onClick={() => setSelectedCourseForDetails(course)} className="px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-slate-300 hover:text-white flex-shrink-0">Details</button>
                </div>
              );
            })
          )}
        </div>
      ) : courseView.mode === 'table' ? (
        <div className="rounded-2xl border border-white/10 overflow-x-auto bg-[#171d2b]">
          <table className="w-full text-start text-xs min-w-[720px]">
            <thead className="bg-[#131823] text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4 text-start">Code</th>
                <th className="py-3 px-4 text-start">Title</th>
                <th className="py-3 px-4 text-start">Program</th>
                <th className="py-3 px-4 text-start">Instructor</th>
                <th className="py-3 px-4 text-start">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-white/[0.03] cursor-pointer" onClick={() => setSelectedCourseForDetails(course)}>
                  <td className="py-2.5 px-4 font-mono text-amber-300">{course.code}</td>
                  <td className="py-2.5 px-4 font-semibold text-white">{course.title}</td>
                  <td className="py-2.5 px-4 text-slate-400 capitalize">{course.program}</td>
                  <td className="py-2.5 px-4 text-slate-300">{course.instructor?.name || '—'}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-300">{course._count?.enrollments || course.enrollments?.length || 0}/{course.capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const enrolledCount = course._count?.enrollments || course.enrollments?.length || 0;
          const capacityPercent = Math.min(100, Math.round((enrolledCount / (course.capacity || 1)) * 100));

          return (
            <div
              key={course.id}
              className="bg-[#171d2b] border border-white/10 hover:border-amber-400/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-300 group"
            >
              <div className="space-y-3.5">
                {/* Badges & Code */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-md bg-[#111622] border border-white/10 text-amber-300 font-bold">
                    {course.code}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        course.program === 'classical'
                          ? 'status-pill-amber'
                          : course.program === 'contemporary'
                          ? 'status-pill-emerald'
                          : 'status-pill-pink'
                      }
                    >
                      {course.program}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c2333] text-slate-300 border border-white/10 font-medium">
                      {course.level}
                    </span>
                  </div>
                </div>

                {/* Course Titles */}
                <div>
                  <h3 className="font-heading font-bold text-lg text-white group-hover:text-amber-300 transition">
                    {language === 'ar' && course.titleAr ? course.titleAr : course.title}
                  </h3>
                  {course.titleAr && language !== 'ar' && (
                    <p className="text-xs text-slate-400 font-arabic mt-0.5">{course.titleAr}</p>
                  )}
                  {course.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {language === 'ar' && course.descriptionAr ? course.descriptionAr : course.description}
                    </p>
                  )}
                </div>

                {/* Assigned Instructor — click to open the instructor profile page */}
                {course.instructor?.id || course.instructorId ? (
                  <button
                    onClick={() => setViewingStaffId(course.instructor?.id || course.instructorId || '')}
                    title={language === 'ar' ? 'فتح صفحة المدرب' : 'Open instructor page'}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-[#111622] border border-white/5 text-start w-full hover:border-amber-400/40 transition cursor-pointer group/instructor"
                  >
                    <img
                      src={
                        course.instructor?.avatarUrl ||
                        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={course.instructor?.name || 'Instructor'}
                      className="w-9 h-9 rounded-full object-cover border border-amber-400/30"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {language === 'ar' ? 'المدرب المسؤول:' : 'Faculty Instructor:'}
                      </span>
                      <span className="text-xs font-bold text-white truncate block group-hover/instructor:text-amber-200 transition">
                        {course.instructor?.name || (language === 'ar' ? 'غير مسند بعد' : 'Unassigned')}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#111622] border border-white/5">
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80"
                      alt="Instructor"
                      className="w-9 h-9 rounded-full object-cover border border-amber-400/30"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {language === 'ar' ? 'المدرب المسؤول:' : 'Faculty Instructor:'}
                      </span>
                      <span className="text-xs font-bold text-white truncate block">
                        {language === 'ar' ? 'غير مسند بعد' : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Logistics */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span className="truncate">{course.startTime} - {course.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-300" />
                    <span className="truncate">{course.studioRoom || 'Studio'}</span>
                    {course.branchCode && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 shrink-0">
                        {course.branchCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Capacity Gauge */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {language === 'ar' ? 'السعة الاستيعابية:' : 'Enrolled Capacity:'}
                    </span>
                    <span className="font-mono font-bold text-white">
                      {enrolledCount} / {course.capacity}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#111622] rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        capacityPercent >= 100
                          ? 'bg-rose-500'
                          : capacityPercent >= 75
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setSelectedCourseForDetails(course);
                    setActiveDetailTab('sessions');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'الجدول والتذكيرات' : 'Sessions & WhatsApp'}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedCourseForDetails(course);
                    setActiveDetailTab('enrollments');
                  }}
                  className="p-2 rounded-xl border border-white/10 hover:border-amber-400/50 bg-[#1c2333] text-slate-300 hover:text-white transition cursor-pointer"
                  title="Manage Enrolled Students"
                >
                  <Users className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleOpenEditModal(course)}
                  className="p-2 rounded-xl border border-white/10 hover:border-amber-400/50 bg-[#1c2333] text-slate-300 hover:text-white transition cursor-pointer"
                  title="Edit Course"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteCourse(course)}
                  className="p-2 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition cursor-pointer"
                  title="Delete Course"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Course Details, Sessions & Reminders Drawer */}
      {/* ========================================================================= */}
      {selectedCourseForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111622]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold flex-shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-amber-300 font-bold">
                      {selectedCourseForDetails.code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c2333] text-slate-300 uppercase border border-white/5 font-semibold">
                      {selectedCourseForDetails.program}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white truncate">
                    {selectedCourseForDetails.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedCourseForDetails(null)}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition flex-shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 px-3 sm:px-6 pt-3 border-b border-white/10 bg-[#111622]/40 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveDetailTab('sessions')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition flex-shrink-0 cursor-pointer ${
                  activeDetailTab === 'sessions'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'جدول الحصص والتذكيرات' : 'Sessions & WhatsApp Reminders'}</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('enrollments')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition flex-shrink-0 cursor-pointer ${
                  activeDetailTab === 'enrollments'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar' ? 'الطلاب المقيدون' : 'Enrolled Dancers'} (
                  {selectedCourseForDetails._count?.enrollments || 0})
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
              {activeDetailTab === 'sessions' && (
                <div className="space-y-6">
                  {/* Schedule New Session Form */}
                  <form
                    onSubmit={handleCreateSession}
                    className="p-5 rounded-2xl bg-[#111622] border border-white/10 space-y-3.5"
                  >
                    <span className="font-heading font-bold text-xs text-amber-300 block uppercase tracking-wider">
                      {language === 'ar' ? 'جدولة حصة تدريبية جديدة لهذا الكورس' : 'Schedule New Class Session'}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                          {language === 'ar' ? 'عنوان الحصة / الموضوع' : 'Session Topic / Title'}
                        </label>
                        <input
                          type="text"
                          required
                          value={newSessionData.title}
                          onChange={(e) => setNewSessionData({ ...newSessionData, title: e.target.value })}
                          placeholder="e.g. Grand Pas de Deux Variations & Pointe"
                          className="w-full bg-[#171d2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                          {language === 'ar' ? 'التاريخ' : 'Date'}
                        </label>
                        <input
                          type="date"
                          required
                          value={newSessionData.sessionDate}
                          onChange={(e) => setNewSessionData({ ...newSessionData, sessionDate: e.target.value })}
                          className="w-full bg-[#171d2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                          {language === 'ar' ? 'وقت البدء' : 'Start Time'}
                        </label>
                        <input
                          type="time"
                          value={newSessionData.startTime}
                          onChange={(e) => setNewSessionData({ ...newSessionData, startTime: e.target.value })}
                          className="w-full bg-[#171d2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                          {language === 'ar' ? 'وقت الانتهاء' : 'End Time'}
                        </label>
                        <input
                          type="time"
                          value={newSessionData.endTime}
                          onChange={(e) => setNewSessionData({ ...newSessionData, endTime: e.target.value })}
                          className="w-full bg-[#171d2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                          {language === 'ar' ? 'القاعة / الاستوديو' : 'Studio Room'}
                        </label>
                        <input
                          type="text"
                          value={newSessionData.studioRoom}
                          onChange={(e) => setNewSessionData({ ...newSessionData, studioRoom: e.target.value })}
                          className="w-full bg-[#171d2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="action-btn-coral px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'إضافة الحصة للجدول' : 'Add Session to Calendar'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Scheduled Sessions List */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-sm text-white">
                      {language === 'ar' ? 'الحصص المجدولة وتذكيرات واتساب' : 'Scheduled Sessions & WhatsApp Alerts'}
                    </h4>

                    {courseSessions.filter((s) => s.courseId === selectedCourseForDetails.id).length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center italic">
                        {language === 'ar' ? 'لا توجد حصص مجدولة حالياً لهذا الكورس.' : 'No sessions scheduled yet for this course.'}
                      </p>
                    ) : (
                      courseSessions
                        .filter((s) => s.courseId === selectedCourseForDetails.id)
                        .map((session) => (
                          <div
                            key={session.id}
                            className="p-4 rounded-2xl bg-[#111622] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {session.title}
                                </span>
                                {session.reminderSent ? (
                                  <span className="status-pill-emerald flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Reminder Dispatched</span>
                                  </span>
                                ) : (
                                  <span className="status-pill-amber">
                                    Pending Reminder
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-amber-300" />
                                  <span>{session.sessionDate.split('T')[0]}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                                  <span>{session.startTime} - {session.endTime}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                                  <span>{session.studioRoom}</span>
                                </span>
                              </div>
                            </div>

                            {/* Session Action Buttons */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                onClick={() => sendCourseSessionReminder(session.id)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                title="Send WhatsApp message now to all enrolled students and the instructor"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'إرسال تذكير واتساب الآن' : 'Send WhatsApp Now'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  showConfirmNotification({
                                    title: language === 'ar' ? 'حذف الحصة' : 'Delete Session',
                                    message: language === 'ar' ? 'هل تريد حذف هذه الحصة من الجدول؟' : 'Delete this session from the schedule?',
                                    confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete Session',
                                    cancelLabel: language === 'ar' ? 'إلغاء' : 'Cancel',
                                    type: 'error',
                                    onConfirm: () => deleteCourseSession(session.id),
                                  });
                                }}
                                className="p-2 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition cursor-pointer"
                                title="Delete Session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {activeDetailTab === 'enrollments' && (
                <div className="space-y-6">
                  {/* Enroll New Student Dropdown */}
                  <div className="p-5 rounded-2xl bg-[#111622] border border-white/10 flex flex-col sm:flex-row items-end gap-3">
                    <div className="flex-1 w-full">
                      <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                        {language === 'ar' ? 'اختيار طالب لإلحاقه بالدورة' : 'Select Registered Student to Enroll'}
                      </label>
                      <select
                        value={enrollStudentId}
                        onChange={(e) => setEnrollStudentId(e.target.value)}
                        className="w-full bg-[#171d2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                      >
                        <option value="">{language === 'ar' ? '-- اختر راقصاً/ة --' : '-- Choose Student --'}</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.barcode}) - {s.level}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleEnrollStudent}
                      disabled={!enrollStudentId}
                      className="action-btn-coral px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition active:scale-95 cursor-pointer shadow-md"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تسجيل في الدورة' : 'Enroll Dancer'}</span>
                    </button>
                  </div>

                  {/* Enrolled Students Table */}
                  <div className="space-y-2">
                    <h4 className="font-heading font-bold text-sm text-white">
                      {language === 'ar' ? 'سجل الطلاب المقيدين حالياً' : 'Currently Enrolled Dancers'}
                    </h4>

                    {students.filter((s) =>
                      selectedCourseForDetails.enrollments?.some((e) => e.studentId === s.id)
                    ).length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center italic">
                        {language === 'ar' ? 'لا يوجد طلاب مقيدون في هذا الكورس بعد.' : 'No students enrolled in this course yet.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {students
                          .filter((s) =>
                            selectedCourseForDetails.enrollments?.some((e) => e.studentId === s.id)
                          )
                          .map((student) => (
                            <div
                              key={student.id}
                              onClick={() => setViewingStudentId(student.id)}
                              title={language === 'ar' ? 'فتح صفحة الطالب' : 'Open student page'}
                              className="p-3.5 rounded-xl bg-[#111622] border border-white/5 flex items-center justify-between hover:border-amber-400/40 transition cursor-pointer group/enrolled"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={student.photoUrl}
                                  alt={student.name}
                                  className="w-10 h-10 rounded-full object-cover border border-amber-400/30"
                                />
                                <div>
                                  <span className="font-bold text-xs text-white block group-hover/enrolled:text-amber-200 transition">
                                    {student.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {student.barcode} • {student.parentPhone}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showConfirmNotification({
                                    title: language === 'ar' ? 'إلغاء القيد' : 'Unenroll Student',
                                    message: language === 'ar' ? `إلغاء قيد ${student.name} من الدورة؟` : `Unenroll ${student.name} from this course?`,
                                    confirmLabel: language === 'ar' ? 'إلغاء القيد' : 'Unenroll',
                                    cancelLabel: language === 'ar' ? 'تراجع' : 'Cancel',
                                    type: 'warning',
                                    onConfirm: () => unenrollStudentFromCourse(selectedCourseForDetails.id, student.id),
                                  });
                                }}
                                className="px-3 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition cursor-pointer"
                              >
                                {language === 'ar' ? 'إلغاء القيد' : 'Unenroll'}
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {selectedCourseForDetails && (
                    <CourseWaitlist
                      courseId={selectedCourseForDetails.id}
                      courseCode={selectedCourseForDetails.code}
                      onChanged={async () => {
                        try {
                          const { data } = await api.get(`/api/courses/${selectedCourseForDetails.id}`);
                          if (data) setSelectedCourseForDetails(data);
                        } catch {
                          // keep stale view on offline
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Create / Edit Course */}
      {/* ========================================================================= */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-slate-200">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111622]/60">
              <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                {editingCourse
                  ? (language === 'ar' ? 'تعديل بيانات الدورة' : 'Edit Course')
                  : (language === 'ar' ? 'إضافة دورة تدريبية جديدة' : 'Create New Course')}
              </h3>
              <button
                onClick={() => setShowCourseModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'كود الدورة الفريد' : 'Course Code'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'البرنامج الأكاديمي' : 'Discipline / Program'}
                  </label>
                  <select
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value as any })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="classical">Classical Ballet</option>
                    <option value="contemporary">Contemporary Dance</option>
                    <option value="youth">Youth Division</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'اسم الدورة (بالإنجليزية)' : 'Course Title (EN)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Conservatory Classical Pointe & Variations"
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'اسم الدورة (بالعربية)' : 'Course Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.titleAr}
                    onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                    placeholder="مثال: كونسرفتوار الباليه الكلاسيكي والبوانت"
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-arabic focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'المدرب المسؤول' : 'Assigned Instructor'}
                  </label>
                  <select
                    value={formData.instructorId}
                    onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="">{language === 'ar' ? '-- غير محدد --' : '-- Unassigned --'}</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'السعة القصوى للطلاب' : 'Student Capacity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 20 })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'أيام الأسبوع' : 'Days of Week'}
                  </label>
                  <input
                    type="text"
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    placeholder="e.g. Mon, Wed, Fri"
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'القاعة / الاستوديو' : 'Studio Room'}
                  </label>
                  <input
                    type="text"
                    value={formData.studioRoom}
                    onChange={(e) => setFormData({ ...formData, studioRoom: e.target.value })}
                    placeholder="e.g. Grand Studio Petipa"
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'الفرع' : 'Branch'}
                  </label>
                  <select
                    value={formData.branchCode}
                    onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  >
                    {branches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} — {language === 'ar' ? b.nameAr || b.name : b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'وقت البدء' : 'Start Time'}
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-medium">
                    {language === 'ar' ? 'وقت الانتهاء' : 'End Time'}
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#1c2333] hover:bg-[#222a3d] border border-white/10 text-xs text-slate-300 hover:text-white cursor-pointer transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="action-btn-coral px-6 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition cursor-pointer shadow-lg"
                >
                  {editingCourse
                    ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                    : (language === 'ar' ? 'إنشاء الدورة الآن' : 'Create Course')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Dynamic WhatsApp Reminder Settings */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-slate-200">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111622]/60">
              <div className="flex items-center gap-2.5 text-amber-300">
                <Settings className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                  {language === 'ar' ? 'إعدادات الإرسال التلقائي لتذكيرات واتساب' : 'Dynamic WhatsApp Pre-Session Reminders'}
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white flex-shrink-0 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-xs">
              {/* Automation Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#111622] border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-white block">
                      {language === 'ar' ? 'تفعيل الإرسال التلقائي' : 'Enable Automated Reminders'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {language === 'ar' ? 'إرسال رسائل واتساب تلقائياً قبل بدء الحصة' : 'Automatically message enrolled students & instructor'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData.enabled}
                    onChange={(e) => setSettingsData({ ...settingsData, enabled: e.target.checked })}
                    className="w-5 h-5 accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="font-bold text-xs text-white block mb-1">
                    {language === 'ar' ? 'وقت الإرسال المسبق' : 'Send Timing Window'}
                  </label>
                  <select
                    value={settingsData.sendMinutesBefore}
                    onChange={(e) => setSettingsData({ ...settingsData, sendMinutesBefore: parseInt(e.target.value) || 60 })}
                    className="w-full bg-[#171d2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400/50"
                  >
                    <option value={15}>15 minutes before session</option>
                    <option value={30}>30 minutes before session</option>
                    <option value={60}>1 hour before session</option>
                    <option value={120}>2 hours before session</option>
                    <option value={1440}>24 hours (1 day) before session</option>
                  </select>
                </div>
              </div>

              {/* Tag placeholders legend */}
              <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/20 space-y-1">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'المتغيرات الديناميكية المدعومة بالقوالب:' : 'Dynamic Template Variables:'}</span>
                </span>
                <p className="text-[11px] text-slate-300 font-mono">
                  {`{studentName}, {parentName}, {courseTitle}, {instructorName}, {time}, {studio}, {minutes}, {enrolledCount}`}
                </p>
              </div>

              {/* Student Message Templates */}
              <div className="space-y-3">
                <h4 className="font-heading font-bold text-sm text-white">
                  {language === 'ar' ? 'قالب رسالة الطالب / ولي الأمر' : 'Student & Parent WhatsApp Template'}
                </h4>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-medium">English Template</label>
                  <textarea
                    rows={2}
                    value={settingsData.studentTemplateEn}
                    onChange={(e) => setSettingsData({ ...settingsData, studentTemplateEn: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-medium">Arabic Template</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={settingsData.studentTemplateAr}
                    onChange={(e) => setSettingsData({ ...settingsData, studentTemplateAr: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl p-3 text-xs text-white font-arabic focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              {/* Instructor Message Templates */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="font-heading font-bold text-sm text-white">
                  {language === 'ar' ? 'قالب رسالة المدرب الأكاديمي' : 'Faculty Instructor WhatsApp Template'}
                </h4>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-medium">English Template</label>
                  <textarea
                    rows={2}
                    value={settingsData.instructorTemplateEn}
                    onChange={(e) => setSettingsData({ ...settingsData, instructorTemplateEn: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-medium">Arabic Template</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={settingsData.instructorTemplateAr}
                    onChange={(e) => setSettingsData({ ...settingsData, instructorTemplateAr: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 rounded-xl p-3 text-xs text-white font-arabic focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-[var(--text-secondary)] hover:text-white"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="gold-btn px-6 py-2.5 rounded-xl text-black font-semibold text-xs active:scale-95 transition"
                >
                  {language === 'ar' ? 'حفظ إعدادات التذكير' : 'Save Reminder Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
