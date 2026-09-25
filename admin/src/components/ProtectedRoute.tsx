import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { AdminTabId } from '../types';
import { ShieldCheck } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  tabId?: AdminTabId;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, tabId }) => {
  const { currentUser, userRole, roleConfigs, language } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleConfig = roleConfigs[currentUser?.role || userRole] || roleConfigs.superadmin;

  if (tabId && !roleConfig.allowedTabs.includes(tabId)) {
    return (
      <div className="premium-card p-10 text-center max-w-lg mx-auto space-y-4 animate-fade-up">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="font-heading text-xl font-bold">
          {language === 'ar' ? 'غير مصرح' : 'Access restricted'}
        </h3>
        <p className="text-xs text-slate-400">
          {language === 'ar'
            ? `دورك (${roleConfig.titleAr}) لا يملك صلاحية هذه الصفحة.`
            : `Your role (${roleConfig.title}) cannot open this module.`}
        </p>
        <button
          onClick={() => navigate('/' + roleConfig.defaultTab)}
          className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold"
        >
          {language === 'ar' ? 'عودة' : 'Return to workspace'}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
