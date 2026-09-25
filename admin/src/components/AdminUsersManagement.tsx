import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { StaffMember, UserRole } from '../types';
import { StaffProfilePage } from './StaffProfilePage';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { ImageUploader } from './ImageUploader';
import {
  UserCog,
  ShieldCheck,
  UserPlus,
  Mail,
  Building2,
  Lock,
  Trash2,
  KeyRound,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  AlertTriangle,
  X,
  RefreshCw,
  UserCheck,
  Compass,
  Download,
  Camera,
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
];

export const AdminUsersManagement: React.FC = () => {
  const {
    staffList,
    currentUser,
    language,
    updateStaffRole,
    updateStaffAvatar,
    toggleStaffShift,
    createStaffUser,
    deleteStaffMember,
    resetStaffPassword,
    showToast,
  } = useAdmin();

  const isRtl = language === 'ar';
  const isSuperadminOrOwner = currentUser?.role === 'superadmin' || currentUser?.role === 'owner';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'on_duty' | 'off_shift'>('all');
  const staffView = useViewPrefs('staff-roster', 'cards');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [viewingStaffProfile, setViewingStaffProfile] = useState<string | null>(null);

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('receptionist');
  const [newDept, setNewDept] = useState('Operations & Admissions');
  const [newDeptAr, setNewDeptAr] = useState('العمليات والقبول');
  const [newPassword, setNewPassword] = useState('etoile2026');
  const [newAvatar, setNewAvatar] = useState(PRESET_AVATARS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset password state
  const [resetPassInput, setResetPassInput] = useState('');

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nameAr && s.nameAr.includes(searchQuery)) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.studio && s.studio.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    const matchesShift = shiftFilter === 'all' || s.shiftStatus === shiftFilter;

    return matchesSearch && matchesRole && matchesShift;
  });

  // Metrics
  const totalStaff = staffList.length;
  const onDutyCount = staffList.filter((s) => s.shiftStatus === 'on_duty').length;
  const directorsCount = staffList.filter((s) => s.role === 'superadmin' || s.role === 'owner').length;
  const teachersCount = staffList.filter((s) => s.role === 'instructor').length;

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim().length < 2) {
      showToast('Validation Error', 'Name is required (min 2 chars).', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail.trim())) {
      showToast('Validation Error', 'A valid email address is required.', 'error');
      return;
    }
    if (staffList.some((s) => s.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      showToast('Duplicate email', 'A staff account with this email already exists.', 'error');
      return;
    }
    if (newPassword.trim() && newPassword.trim().length < 6) {
      showToast('Validation Error', 'Password must be at least 6 characters.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await createStaffUser({
        name: newName.trim(),
        nameAr: newNameAr.trim() || undefined,
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        department: newDept.trim(),
        departmentAr: newDeptAr.trim(),
        password: newPassword.trim() || 'etoile2026',
        avatarUrl: newAvatar,
      });
      if (ok) {
        setShowAddModal(false);
        setNewName('');
        setNewNameAr('');
        setNewEmail('');
        setNewPassword('etoile2026');
        setNewDept('');
        setNewDeptAr('');
        setNewRole('receptionist');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!resetPassInput.trim()) { showToast('Validation Error', 'New password cannot be empty.', 'error'); return; }
    if (resetPassInput.trim().length < 4) { showToast('Validation Error', 'PIN / password must be at least 4 characters.', 'error'); return; }
    setIsSubmitting(true);
    try {
      const ok = await resetStaffPassword(selectedStaff.id, resetPassInput.trim());
      if (ok) {
        setShowPasswordModal(false);
        setResetPassInput('');
        setSelectedStaff(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    setIsSubmitting(true);
    try {
      const ok = await deleteStaffMember(selectedStaff.id);
      if (ok) {
        setShowDeleteModal(false);
        setSelectedStaff(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return {
          label: 'Academy Director',
          classes: 'status-pill-amber',
          icon: <Sparkles className="w-3 h-3 text-amber-300" />,
        };
      case 'owner':
        return {
          label: 'Board Member / Owner',
          classes: 'status-pill-purple',
          icon: <ShieldCheck className="w-3 h-3 text-purple-300" />,
        };
      case 'receptionist':
        return {
          label: 'Front-Desk Reception',
          classes: 'status-pill-blue',
          icon: <UserCheck className="w-3 h-3 text-sky-300" />,
        };
      case 'instructor':
        return {
          label: 'Ballet Instructor',
          classes: 'status-pill-emerald',
          icon: <Compass className="w-3 h-3 text-emerald-300" />,
        };
      default:
        return {
          label: role,
          classes: 'bg-[#1c2333] text-slate-300 border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-semibold',
          icon: <UserCog className="w-3 h-3" />,
        };
    }
  };

  // If viewing a staff profile, render the profile page
  if (viewingStaffProfile) {
    return (
      <StaffProfilePage
        staffId={viewingStaffProfile}
        onBack={() => setViewingStaffProfile(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
            <span>Total Staff</span>
            <UserCog className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
            {totalStaff}
          </div>
          <p className="text-[11px] text-slate-400">
            Registered system accounts
          </p>
        </div>

        <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase font-semibold text-emerald-400 tracking-wider">
            <span>On-Duty Now</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            {onDutyCount}
          </div>
          <p className="text-[11px] text-slate-400">
            Active front-desk & studios
          </p>
        </div>

        <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase font-semibold text-purple-400 tracking-wider">
            <span>Directors & Board</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
            {directorsCount}
          </div>
          <p className="text-[11px] text-slate-400">
            Full executive permissions
          </p>
        </div>

        <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase font-semibold text-amber-300 tracking-wider">
            <span>Ballet Teachers</span>
            <Compass className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-300">
            {teachersCount}
          </div>
          <p className="text-[11px] text-slate-400">
            Faculty instructors & coaches
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Action Button */}
      <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by staff name, email, or department..."
                className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 pl-10 pr-9 rtl:pr-10 rtl:pl-9 py-2.5 rounded-xl text-xs focus:outline-none focus:border-amber-400/50"
                aria-label="Search staff"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 rtl:right-auto rtl:left-2 top-2.5 text-slate-500 hover:text-white p-0.5" aria-label="Clear search">✕</button>
              )}
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
                  roleFilter === 'all'
                    ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                    : 'bg-[#111622] border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                All Roles
              </button>
              <button
                onClick={() => setRoleFilter('superadmin')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
                  roleFilter === 'superadmin'
                    ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                    : 'bg-[#111622] border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Directors
              </button>
              <button
                onClick={() => setRoleFilter('receptionist')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
                  roleFilter === 'receptionist'
                    ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                    : 'bg-[#111622] border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Reception
              </button>
              <button
                onClick={() => setRoleFilter('instructor')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
                  roleFilter === 'instructor'
                    ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                    : 'bg-[#111622] border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Teachers
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-mono text-slate-500">{filteredStaff.length}/{staffList.length}</span>
            <ViewSwitcher moduleKey="staff-roster" modes={['cards', 'rows']} value={{ mode: staffView.mode, density: staffView.density }} onChange={(p) => { staffView.setMode(p.mode); staffView.setDensity(p.density); }} />
            <button
              onClick={() => exportCsv(`staff-${new Date().toISOString().split('T')[0]}`, ['name', 'email', 'role', 'department', 'shiftStatus'], filteredStaff.map((s) => ({ name: s.name, email: s.email, role: s.role, department: s.department || '', shiftStatus: s.shiftStatus || '' })))}
              className="px-3 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" /><span>CSV</span>
            </button>
            {/* Add Staff / Admin User Button */}
            {isSuperadminOrOwner && (
              <button
                onClick={() => setShowAddModal(true)}
                className="action-btn-coral px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition flex-shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value as 'all' | 'on_duty' | 'off_shift')} className="px-3 py-2 rounded-xl text-xs bg-[#111622] border border-white/10 text-white" aria-label="Shift">
            <option value="all">All shifts</option>
            <option value="on_duty">on_duty</option>
            <option value="off_shift">off_shift</option>
          </select>
          <span className="text-[11px] text-slate-500">shift filter</span>
          {(searchQuery || roleFilter !== 'all' || shiftFilter !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setRoleFilter('all'); setShiftFilter('all'); }} className="text-xs text-slate-400 hover:text-rose-300 underline px-1 ms-auto">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Staff Cards / Rows Grid */}
      {staffView.mode === 'rows' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 bg-[#171d2b]">
          {filteredStaff.map((staff) => (
            <div key={staff.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/50 to-rose-500/50 border border-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {staff.name?.charAt(0) || 'E'}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-white truncate">{staff.name}</span>
                <span className="block text-[11px] text-slate-500 truncate">{staff.email} • {staff.role}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${staff.shiftStatus === 'on_duty' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-slate-400 border-white/15'}`}>
                {staff.shiftStatus || 'off_shift'}
              </span>
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStaff.map((staff) => {
          const isCurrentUser = currentUser?.id === staff.id;
          const badge = getRoleBadge(staff.role);
          const avatarSrc =
            staff.avatar ||
            staff.avatarUrl ||
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';

          return (
            <div
              key={staff.id}
              className={`bg-[#171d2b] border rounded-2xl p-5 space-y-4 shadow-md transition-all duration-200 flex flex-col justify-between hover:border-amber-400/40 hover:shadow-xl ${
                isCurrentUser
                  ? 'border-amber-400/60 shadow-amber-400/5 ring-1 ring-amber-400/30'
                  : 'border-white/10'
              }`}
            >
              <div className="space-y-4">
                {/* Header: ID + Shift Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 bg-[#111622] px-2 py-0.5 rounded-md border border-white/10">
                      {staff.id}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[9px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                        You
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => toggleStaffShift(staff.id)}
                    title="Toggle shift status"
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      staff.shiftStatus === 'on_duty'
                        ? 'status-pill-emerald shadow-sm'
                        : 'bg-[#111622] text-slate-400 border border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        staff.shiftStatus === 'on_duty' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    <span>
                      {staff.shiftStatus === 'on_duty' ? 'On Duty' : 'Off Shift'}
                    </span>
                  </button>
                </div>

                {/* Profile Avatar & Info — click to open the staff profile page */}
                <button
                  onClick={() => setViewingStaffProfile(staff.id)}
                  title="Open profile page"
                  className="flex items-center gap-3.5 text-start w-full rounded-xl p-1 -m-1 hover:bg-white/[0.04] transition cursor-pointer group/profile"
                >
                  <img
                    src={avatarSrc}
                    alt={staff.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-400/40 flex-shrink-0 shadow-md group-hover/profile:border-amber-300 transition"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-base font-bold text-white truncate group-hover/profile:text-amber-200 transition">
                      {staff.name}
                    </h3>
                    <p className="text-[11px] text-amber-300 truncate font-medium">
                      {staff.department || staff.studio || 'Faculty'}
                    </p>
                  </div>
                </button>

                {/* Role Badge */}
                <div className="pt-1">
                  <span className={`inline-flex items-center gap-1.5 ${badge.classes}`}>
                    {badge.icon}
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                    <span className="truncate font-mono text-slate-400">{staff.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                    <span className="truncate text-slate-400">
                      {staff.department || staff.studio || 'Conservatory'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Role Selector, Reset Password, Delete */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                {isSuperadminOrOwner && (
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Assigned Role:
                    </label>
                    <select
                      value={staff.role}
                      onChange={(e) => updateStaffRole(staff.id, e.target.value as UserRole)}
                      className="w-full bg-[#111622] border border-white/10 text-white px-2.5 py-1.5 rounded-xl text-xs cursor-pointer focus:outline-none focus:border-amber-400/50"
                    >
                      <option value="superadmin">
                        Academy Director (Superadmin)
                      </option>
                      <option value="owner">
                        Board Member / Owner
                      </option>
                      <option value="receptionist">
                        Front-Desk Receptionist
                      </option>
                      <option value="instructor">
                        Ballet Teacher / Coach
                      </option>
                    </select>
                  </div>
                )}

                {/* Secondary Actions: Password Reset & Delete */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedStaff(staff);
                      setResetPassInput('');
                      setShowPasswordModal(true);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-white/10 bg-[#111622] hover:bg-white/5 text-[11px] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer font-medium"
                  >
                    <KeyRound className="w-3 h-3 text-amber-300" />
                    <span>Reset PIN</span>
                  </button>

                  {isSuperadminOrOwner && !isCurrentUser && (
                    <button
                      onClick={() => {
                        setSelectedStaff(staff);
                        setShowDeleteModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-900/40 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 text-[11px] flex items-center justify-center transition cursor-pointer"
                      title="Delete user"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

                {/* View Profile Button */}
                <button
                  onClick={() => setViewingStaffProfile(staff.id)}
                  className="w-full px-3 py-1.5 rounded-xl border border-white/10 bg-[#111622] hover:bg-white/5 text-[11px] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer font-medium"
                >
                  <UserCog className="w-3 h-3 text-rose-400" />
                  <span>View Profile</span>
                </button>
            </div>
          );
        })}
      </div>
      )}

      {filteredStaff.length === 0 && (
        <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-12 text-center space-y-3">
          <UserCog className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="font-heading text-lg font-bold text-white">
            No staff members found
          </h3>
          <p className="text-xs text-slate-400">
            Try adjusting your search terms or filters.
          </p>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW ADMINISTRATOR / STAFF MEMBER
          ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-300">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-heading text-lg font-bold text-white">
                  Add New Administrator / Staff
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-300">
                    Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">
                    Full Name (Arabic)
                  </label>
                  <input
                    type="text"
                    value={newNameAr}
                    onChange={(e) => setNewNameAr(e.target.value)}
                    placeholder="e.g. سارة جنكينز"
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl font-arabic focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@etoile.fr"
                  className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-300">
                    System Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="superadmin">
                      Academy Director
                    </option>
                    <option value="owner">
                      Board Member / Owner
                    </option>
                    <option value="receptionist">
                      Front-Desk Reception
                    </option>
                    <option value="instructor">
                      Ballet Teacher
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">
                    Access Password / PIN *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. etoile2026"
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-300">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder="Admissions / Operations"
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">
                    Department (Arabic)
                  </label>
                  <input
                    type="text"
                    value={newDeptAr}
                    onChange={(e) => setNewDeptAr(e.target.value)}
                    placeholder="e.g. الاستقبال وشؤون القبول"
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl font-arabic focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              {/* Avatar Upload & Preset Selector */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <ImageUploader
                  value={newAvatar}
                  onChange={(val) => setNewAvatar(val)}
                  onRemove={() => setNewAvatar('')}
                  label="Profile Avatar (Optional)"
                  description="Upload a photo for this staff member (ballet teacher, receptionist, etc.) or pick a preset below."
                  optionalBadge={true}
                  language={language}
                  shape="rounded"
                  size="md"
                />

                {/* Preset Options */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Or choose a preset portrait:
                  </span>
                  <div className="flex items-center gap-2.5">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setNewAvatar(url)}
                        className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                          newAvatar === url
                            ? 'border-rose-400 scale-105 shadow-md shadow-rose-500/25 ring-2 ring-rose-500/30'
                            : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                        }`}
                        title={`Preset ${i + 1}`}
                      >
                        <img src={url} alt="Preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#1c2333] hover:bg-[#222a3d] border border-white/10 text-slate-300 hover:text-white font-medium cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="action-btn-coral px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <span>Create Staff Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RESET PASSWORD / PIN
          ========================================================================= */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 text-amber-300">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-heading text-base font-bold text-white">
                  Reset Staff PIN / Password
                </h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {`Enter new access credentials for ${selectedStaff.name}.`}
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">
                  New Password / PIN *
                </label>
                <input
                  type="text"
                  required
                  value={resetPassInput}
                  onChange={(e) => setResetPassInput(e.target.value)}
                  placeholder="e.g. etoile2026"
                  className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1c2333] hover:bg-[#222a3d] border border-white/10 text-slate-300 hover:text-white cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="action-btn-coral px-5 py-2 rounded-xl font-bold shadow-md cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DELETE STAFF CONFIRMATION
          ========================================================================= */}
      {showDeleteModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171d2b] border border-rose-500/40 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-200">
            <div className="flex items-center gap-2.5 text-rose-400 border-b border-white/10 pb-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-heading text-base font-bold text-white">
                Confirm Account Removal
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {`Are you sure you want to delete "${selectedStaff.name}" (${selectedStaff.email})? This staff member will immediately lose all dashboard access.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1c2333] hover:bg-[#222a3d] border border-white/10 text-slate-300 hover:text-white text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteStaff}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
