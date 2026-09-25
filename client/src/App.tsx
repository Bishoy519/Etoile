import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ActiveView } from './types';
import { AppHeader } from './components/layout/AppHeader';
import { ToastContainer } from './components/layout/ToastContainer';
import { LandingPage } from './components/landing/LandingPage';
import { EnrollModal } from './components/landing/EnrollModal';
import { ProtectedPortalRoute } from './components/ProtectedRoute';
import { ClientLoginPage } from './components/client/ClientLoginPage';

import { ClassesCatalogPage } from './components/classes/ClassesCatalogPage';
import { BlogListPage, BlogDetailPage } from './components/blog/BlogPages';
import { PrivacyPage, TermsPage, FaqPage } from './components/legal/LegalPages';
import { PayPage } from './components/billing/PayPage';
import { TrialBookingPage } from './components/trial/TrialBookingPage';
import { SelfCheckinPage } from './components/checkin/SelfCheckinPage';

const VIEW_TO_PATH: Record<ActiveView, string> = {
  landing: '/',
  classes: '/classes',
  client_portal: '/portal',
  admin_crm: '/portal',
  blog: '/blog',
  blog_detail: '/blog',
  pay: '/pay',
  trial: '/trial',
  selfcheckin: '/selfcheckin',
  privacy: '/privacy',
  terms: '/terms',
  faq: '/faq',
};

const BlogDetailRoute: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { activeBlogSlug, setActiveBlogSlug, setActiveView, currentFamilyId, instructorUser } = useApp();

  const currentSlug = slug || activeBlogSlug || '';

  useEffect(() => {
    if (slug && slug !== activeBlogSlug) {
      setActiveBlogSlug(slug);
    }
  }, [slug, activeBlogSlug, setActiveBlogSlug]);

  const handleBack = () => {
    if (currentFamilyId || instructorUser) {
      setActiveView('client_portal');
      navigate('/portal');
    } else {
      setActiveView('blog');
      navigate('/blog');
    }
  };

  return <BlogDetailPage slug={currentSlug} onBack={handleBack} />;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    activeView,
    setActiveView,
    activeBlogSlug,
    setActiveBlogSlug,
    activeCheckinToken,
  } = useApp();

  const [globalEnrollOpen, setGlobalEnrollOpen] = useState(false);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('all');
  const [enrollConfig, setEnrollConfig] = useState<{
    program: string;
    courseCode?: string;
    courseTitle?: string;
  }>({ program: 'classical' });

  // 1. Sync from URL to activeView on URL change (e.g. back/forward, direct address entry)
  useEffect(() => {
    const p = location.pathname;
    let targetView: ActiveView = 'landing';
    if (p === '/classes') targetView = 'classes';
    else if (p === '/portal' || p === '/login') targetView = 'client_portal';
    else if (p.startsWith('/blog/')) {
      targetView = 'blog_detail';
      const slug = p.replace('/blog/', '');
      if (slug) setActiveBlogSlug(decodeURIComponent(slug));
    } else if (p === '/blog') targetView = 'blog';
    else if (p === '/pay') targetView = 'pay';
    else if (p === '/trial') targetView = 'trial';
    else if (p === '/selfcheckin') targetView = 'selfcheckin';
    else if (p === '/privacy') targetView = 'privacy';
    else if (p === '/terms') targetView = 'terms';
    else if (p === '/faq') targetView = 'faq';
    else if (p === '/') targetView = 'landing';

    if (activeView !== targetView) {
      setActiveView(targetView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // 2. Sync from activeView to URL on activeView change (e.g. user clicked button calling setActiveView)
  useEffect(() => {
    if (activeView === 'blog_detail') {
      if (activeBlogSlug) {
        const expected = `/blog/${encodeURIComponent(activeBlogSlug)}`;
        if (location.pathname !== expected) {
          navigate(expected);
        }
      } else if (location.pathname !== '/blog') {
        navigate('/blog');
      }
      return;
    }
    const expectedPath = VIEW_TO_PATH[activeView] || '/';
    if (location.pathname !== expectedPath) {
      navigate(expectedPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, activeBlogSlug]);

  const handleOpenGeneralEnroll = (program = 'classical') => {
    setEnrollConfig({ program, courseCode: undefined, courseTitle: undefined });
    setGlobalEnrollOpen(true);
  };

  const handleOpenClassEnroll = (program = 'classical', courseCode?: string, courseTitle?: string) => {
    setEnrollConfig({ program, courseCode, courseTitle });
    setGlobalEnrollOpen(true);
  };

  const handleNavigateToClasses = (programKey = 'all') => {
    setSelectedProgramFilter(programKey);
    navigate('/classes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openBlogPost = (slug: string) => {
    setActiveBlogSlug(slug);
    navigate('/blog/' + encodeURIComponent(slug));
    window.scrollTo({ top: 0 });
  };

  // Deep link: /?checkin=TOKEN from a scanned session QR.
  useEffect(() => {
    if (activeCheckinToken && location.pathname !== '/selfcheckin') {
      navigate('/selfcheckin');
      window.scrollTo({ top: 0 });
    }
  }, [activeCheckinToken, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-[#080a0b] text-[#dcd2bd] flex flex-col antialiased selection:bg-brand-gold selection:text-black">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AppHeader onOpenEnroll={() => handleOpenGeneralEnroll()} />

      <main id="main-content" className="flex-1" aria-label="Main content">
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onOpenEnroll={() => handleOpenGeneralEnroll()}
                onNavigateToClasses={handleNavigateToClasses}
              />
            }
          />
          <Route
            path="/classes"
            element={
              <ClassesCatalogPage
                initialProgramFilter={selectedProgramFilter}
                onOpenEnroll={handleOpenClassEnroll}
                onNavigateHome={() => {
                  navigate('/');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            }
          />
          <Route path="/portal" element={<ProtectedPortalRoute />} />
          <Route path="/login" element={<ClientLoginPage />} />
          <Route path="/blog" element={<BlogListPage onOpenPost={openBlogPost} />} />
          <Route path="/blog/:slug" element={<BlogDetailRoute />} />
          <Route path="/pay" element={<PayPage />} />
          <Route path="/trial" element={<TrialBookingPage />} />
          <Route path="/selfcheckin" element={<SelfCheckinPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <ToastContainer />

      <EnrollModal
        isOpen={globalEnrollOpen}
        onClose={() => setGlobalEnrollOpen(false)}
        defaultProgram={enrollConfig.program}
        defaultCourseCode={enrollConfig.courseCode}
        defaultCourseTitle={enrollConfig.courseTitle}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
