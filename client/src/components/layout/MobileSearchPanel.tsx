import React from 'react';
import { Search, X, GraduationCap, BookOpen } from 'lucide-react';

interface SearchHit {
  kind: 'course' | 'program' | 'faculty' | 'performance';
  id: string;
  title: string;
  sub: string;
  code?: string;
}

interface MobileSearchPanelProps {
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  searchFocused: boolean;
  setSearchFocused: (v: boolean) => void;
  recentSearches: string[];
  setRecentSearches: React.Dispatch<React.SetStateAction<string[]>>;
  searchResults: Array<{
    kind: 'course' | 'program' | 'faculty' | 'performance';
    id: string;
    title: string;
    sub: string;
    code?: string;
  }>;
  searchIdx: number;
  setSearchIdx: (i: number) => void;
  submitGlobalSearch: () => void;
  goJournalSearch: () => void;
  runSearchHit: (hit: {
    kind: 'course' | 'program' | 'faculty' | 'performance';
    id: string;
    title: string;
    sub: string;
    code?: string;
  }) => void;
  language: 'en' | 'ar';
  hitIcon: (kind: 'course' | 'program' | 'faculty' | 'performance') => React.ReactNode;
  mobileSearchOpen: boolean;
  setMobileSearchOpen: (v: boolean) => void;
  setMobileMenuOpen: (v: boolean) => void;
  setActiveView: (view: 'landing' | 'classes' | 'client_portal' | 'admin_crm' | 'blog' | 'blog_detail' | 'pay' | 'trial' | 'selfcheckin' | 'privacy' | 'terms' | 'faq') => void;
  mobileMenuOpen: boolean;
}

export const MobileSearchPanel: React.FC<MobileSearchPanelProps> = ({
  globalSearchQuery,
  setGlobalSearchQuery,
  searchFocused,
  setSearchFocused,
  recentSearches,
  setRecentSearches,
  searchResults,
  searchIdx,
  setSearchIdx,
  submitGlobalSearch,
  goJournalSearch,
  runSearchHit,
  language,
  hitIcon,
  mobileSearchOpen,
  setMobileSearchOpen,
  setMobileMenuOpen,
  setActiveView,
  mobileMenuOpen,
} = {} as MobileSearchPanelProps) => {
  if (!mobileSearchOpen) return null;

  return (
    <div className="md:hidden border-t border-brand-gold/20 bg-[#0c0f10] px-4 py-3">
      <div className="relative">
        <Search className="w-4 h-4 text-brand-gold/60 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
        <input
          autoFocus
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitGlobalSearch();
            else if (e.key === 'Escape') setSearchFocused(false);
            else if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIdx(Math.min(searchResults.length - 1, searchIdx + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIdx(Math.max(0, searchIdx - 1)); }
          }}
          placeholder={language === 'ar' ? 'ابحث عن حصة، مدرب، عرض...' : 'Search classes, coaches, shows...'}
          className="w-full bg-[#121617] border border-brand-gold/30 rounded-xl ps-9 pe-9 py-2.5 text-sm text-[#fdf1c2] placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold"
          aria-label={language === 'ar' ? 'بحث عام' : 'Global search'}
        />
        {globalSearchQuery && (
          <button
            onClick={() => setGlobalSearchQuery('')}
            className="absolute top-1/2 -translate-y-1/2 end-3 text-brand-muted hover:text-white p-1"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {globalSearchQuery.trim().length === 0 && recentSearches.length > 0 ? (
        <div className="mt-2 px-3 py-2">
          <p className="text-[11px] text-brand-gold/80 font-semibold mb-1.5">{language === 'ar' ? 'بحث مؤخر' : 'Recent searches'}</p>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setGlobalSearchQuery(s);
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] text-brand-muted bg-white/5 border border-brand-gold/15 hover:bg-white/10 hover:text-brand-gold transition flex-shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : globalSearchQuery.trim().length < 2 ? (
        <div className="mt-2 px-3 py-2 text-[11px] text-brand-muted">
          {language === 'ar' ? 'اكتب حرفين على الأقل — ابحث عن حصة، مدرب، عرض...' : 'Type 2+ characters — classes, coaches, shows...'}
        </div>
      ) : (
        <div className="mt-2 rounded-xl border border-brand-gold/25 overflow-hidden">
          {searchResults.length === 0 ? (
            <div className="p-3 flex gap-2">
              <button onClick={submitGlobalSearch} className="flex-1 py-2 rounded-lg bg-brand-gold text-black text-xs font-bold">
                {language === 'ar' ? 'عرض في الحصص' : 'View in Classes'}
              </button>
              <button onClick={goJournalSearch} className="flex-1 py-2 rounded-lg border border-brand-gold/40 text-brand-gold text-xs font-bold">
                {language === 'ar' ? 'المدونة' : 'Journal'}
              </button>
            </div>
          ) : (
            <React.Fragment>
              <div className="px-3 py-2 border-b border-brand-gold/20 flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    setGlobalSearchQuery(globalSearchQuery);
                    setActiveView('classes');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setSearchFocused(false);
                    setMobileMenuOpen(false);
                    setMobileSearchOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-brand-gold bg-brand-gold/15 border border-brand-gold/30 flex-shrink-0"
                >
                  <GraduationCap className="w-3 h-3 mr-1" /> {language === 'ar' ? 'الحصص' : 'Classes'}
                </button>
                <button
                  onClick={goJournalSearch}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-brand-gold bg-white/5 border border-brand-gold/20 flex-shrink-0"
                >
                  <BookOpen className="w-3 h-3 mr-1" /> {language === 'ar' ? 'المدونة' : 'Journal'}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {searchResults.map((hit, idx) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    onClick={() => runSearchHit(hit)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-start ${idx === searchIdx ? 'bg-brand-gold text-black' : 'text-[#fdf1c2]'}`}
                  >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center border border-brand-gold/20 bg-white/5 flex-shrink-0">
                      {hitIcon(hit.kind)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold truncate">{hit.title}</span>
                      <span className="block text-[11px] truncate opacity-70">{hit.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </React.Fragment>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileSearchPanel;
