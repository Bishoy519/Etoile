import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProgramModal } from './ProgramModal';
import { EnrollModal } from './EnrollModal';
import { StageAtmosphereCanvas } from './StageAtmosphereCanvas';
import { ChevronRight, ArrowDown, Crown, Feather, Star, ArrowRight, LogIn, UserCheck, Sparkles } from 'lucide-react';

export const LandingPage: React.FC<{
  onOpenEnroll: () => void;
  onNavigateToClasses?: (programKey?: string) => void;
}> = ({ onOpenEnroll, onNavigateToClasses }) => {
  const { language, setActiveView, portalContent, instructorUser, currentFamilyId } = useApp();
  const isLoggedIn = Boolean(instructorUser || currentFamilyId);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollDefaultProgram, setEnrollDefaultProgram] = useState('classical');

  const handleProgramClick = (key: string) => {
    setSelectedProgram(key);
  };

  const handleDirectEnroll = (key: string) => {
    setSelectedProgram(null);
    setEnrollDefaultProgram(key);
    setEnrollModalOpen(true);
  };

  return (
    <div className="w-full relative">
      {/* 1. Hero Section typically matching screenshot */}
      <section className="relative min-h-[900px] lg:min-h-screen w-full flex items-center overflow-hidden pt-16 pb-20">
        {/* Theatrical Spotlight Ambient Glow */}
        <div className="theatrical-spotlight"></div>

        {/* Hero Background Theatrical Ballerina */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={portalContent.hero.bgImageUrl || '/hero-ballerina.jpg'}
            alt="Étoile Ballerina performing under dramatic golden theatrical spotlight"
            className="w-full h-full object-cover object-[center_right] sm:object-center brightness-105 filter contrast-105 transition-transform duration-1000 ease-out scale-100 hover:scale-[1.02]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/hero-ballerina.jpg';
            }}
          />
          {/* Vignette gradients to ensure pristine typography contrast on the left */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#080a0b] via-[#080a0b]/80 sm:via-[#080a0b]/60 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#080a0b] via-[#080a0b]/80 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#080a0b]/80 to-transparent"></div>

          {/* Interactive Golden Stardust & Atmospheric Bokeh Canvas */}
          <StageAtmosphereCanvas />
        </div>

        {/* Hero Content on Left typically matching screenshot */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full flex flex-col justify-center">
          <div className="max-w-xl">
            {/* Stacked 3-line regal serif headline with animated gold shimmer & staggered reveals */}
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-normal leading-[1.05] tracking-wide uppercase mb-6 select-none">
              {language === 'ar' ? (
                <>
                  <span className="block gold-text-animated animate-hero-1">{portalContent.hero.headlineLine1Ar || 'أكاديمية'}</span>
                  <span className="block gold-text-animated animate-hero-2">{portalContent.hero.headlineLine2Ar || 'إيتوال'}</span>
                  <span className="block gold-text-animated animate-hero-3">{portalContent.hero.headlineLine3Ar || 'للباليه'}</span>
                </>
              ) : (
                <>
                  <span className="block gold-text-animated animate-hero-1">{portalContent.hero.headlineLine1 || 'ÉTOILE'}</span>
                  <span className="block gold-text-animated animate-hero-2">{portalContent.hero.headlineLine2 || 'BALLET'}</span>
                  <span className="block gold-text-animated animate-hero-3">{portalContent.hero.headlineLine3 || 'ACADEMY'}</span>
                </>
              )}
            </h1>

            {/* Subtitle in 2 lines with smooth fade up */}
            <p className="font-sans text-base sm:text-lg md:text-xl text-[#dcd2bd]/90 font-light tracking-wide max-w-md mb-9 leading-relaxed animate-hero-sub">
              {language === 'ar' ? (
                <>
                  {portalContent.hero.subtitleLine1Ar || 'الريادة والتميز في فنون'}<br/>
                  {portalContent.hero.subtitleLine2Ar || 'الباليه الكلاسيكي والرقص المعاصر'}
                </>
              ) : (
                <>
                  {portalContent.hero.subtitleLine1 || 'Excellence in Classical and'}<br/>
                  {portalContent.hero.subtitleLine2 || 'Contemporary Dance'}
                </>
              )}
            </p>

            {/* Action buttons: Discover Programs + Sign In / Portal Access */}
            <div className="flex flex-wrap items-center gap-4 animate-hero-cta">
              <a
                href="#programs-section"
                className="gold-btn-hero gold-glow-pulse btn-sheen inline-block px-8 py-3.5 rounded-xl font-serif text-base sm:text-lg font-semibold tracking-wider hover:brightness-110 active:scale-[0.98] transition shadow-[0_0_25px_rgba(226,190,104,0.45)]"
              >
                {language === 'ar'
                  ? (portalContent.hero.ctaTextAr || 'اكتشف برامج الأكاديمية')
                  : (portalContent.hero.ctaText || 'Discover Our Academy')}
              </a>

              <button
                onClick={() => setActiveView('client_portal')}
                className="gold-btn-outline btn-sheen inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-brand-gold/50 bg-[#121617]/80 hover:bg-brand-gold/15 hover:border-brand-gold text-brand-gold font-serif text-base sm:text-lg font-medium transition shadow-md backdrop-blur-md active:scale-[0.98]"
              >
                {isLoggedIn ? (
                  <>
                    <UserCheck className="w-5 h-5" />
                    <span>{language === 'ar' ? 'الدخول إلى بوابتي' : 'Open My Portal'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>{language === 'ar' ? 'تسجيل الدخول بالبطاقة' : 'Card Sign In'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Golden Downward Chevron Indicator from screenshot */}
        <a
          href="#programs-section"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-brand-gold hover:text-brand-gold-light animate-bounce p-2 transition"
          aria-label="Scroll to programs"
        >
          <svg className="w-8 h-8 text-brand-gold drop-shadow-[0_0_10px_rgba(226,190,104,0.7)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </a>
      </section>

      {/* 2. Programs Section typically matching screenshot */}
      <section id="programs-section" className="relative py-28 bg-[#080a0b] overflow-hidden">
        {/* Fine gold swirl wave curves sweeping across background */}
        <div className="absolute inset-0 pointer-events-none opacity-30 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 1440 650" fill="none" preserveAspectRatio="none">
            <path d="M-100,520 C350,300 750,580 1550,150" stroke="#e2be68" strokeWidth="1.2" />
            <path d="M-100,490 C350,270 750,550 1550,120" stroke="#e2be68" strokeWidth="0.8" />
            <path d="M-100,550 C350,330 750,610 1550,180" stroke="#e2be68" strokeWidth="0.7" />
            <path d="M-100,460 C350,240 750,520 1550,90" stroke="#fdf1c2" strokeWidth="0.5" strokeDasharray="3 5" />
            <path d="M-50,380 C450,550 850,220 1500,420" stroke="#e2be68" strokeWidth="0.6" strokeDasharray="4 6" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center">
          {/* Majestic Centered Heading */}
          <div className="text-center mb-16 max-w-xl">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] gold-text-gradient mb-2">
              {language === 'ar' ? 'برامجنا التدريبية' : 'OUR PROGRAMS'}
            </h2>
          </div>

          {/* Dynamic Glowing Gold Cards from portalContent.programs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 w-full max-w-5xl">
            {portalContent.programs.map((prog) => {
              const iconSrc =
                prog.key === 'contemporary'
                  ? '/icons/program-contemporary.png'
                  : prog.key === 'youth'
                  ? '/icons/program-youth.png'
                  : '/icons/program-classical.png';

              return (
                <div
                  key={prog.id || prog.key}
                  onClick={() => handleProgramClick(prog.key || prog.id)}
                  className="group relative rounded-3xl overflow-hidden gold-card flex flex-col items-center text-center p-8 sm:p-9 min-h-[480px] transition-all duration-300 cursor-pointer"
                >
                  {/* Subtle background photo */}
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    <img
                      src={prog.bgImageUrl || '/hero-ballerina.jpg'}
                      alt={language === 'ar' ? prog.titleAr : prog.title}
                      className="w-full h-full object-cover opacity-20 group-hover:scale-105 group-hover:opacity-30 transition-all duration-500 filter contrast-125"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090b0c] via-[#090b0c]/85 to-[#090b0c]/60"></div>
                  </div>

                  <div className="relative z-10 flex flex-col items-center justify-between h-full w-full">
                    {/* Silhouette Icon */}
                    <div className="h-28 flex items-center justify-center mb-2">
                      <img
                        src={iconSrc}
                        alt={language === 'ar' ? prog.titleAr : prog.title}
                        className="h-24 w-auto max-w-[125px] object-contain drop-shadow-[0_0_16px_rgba(226,190,104,0.65)] transition-transform duration-300 group-hover:scale-110 select-none pointer-events-none filter contrast-110"
                      />
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-2xl tracking-[0.16em] uppercase gold-text-gradient mb-3">
                      {language === 'ar' ? prog.titleAr : prog.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-[#dcd2bd]/85 leading-relaxed font-light mb-6 max-w-[220px]">
                      {language === 'ar' ? prog.descriptionAr : prog.description}
                    </p>

                    {/* Bottom Chevron Button */}
                    <div className="gold-chevron-btn w-9 h-9 rounded-lg flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-black stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Link to Dedicated Classes Catalog Page */}
          <div className="mt-12 sm:mt-14 text-center">
            <button
              onClick={() => onNavigateToClasses?.('all')}
              className="inline-flex items-center gap-3 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-brand-gold/20 via-brand-gold/10 to-transparent border border-brand-gold/60 text-brand-gold hover:border-brand-gold hover:bg-brand-gold hover:text-black font-serif text-sm sm:text-base font-semibold tracking-wide transition-all duration-300 shadow-[0_0_25px_rgba(226,190,104,0.25)] hover:shadow-[0_0_35px_rgba(226,190,104,0.45)] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-brand-gold group-hover:text-black" />
              <span>
                {language === 'ar'
                  ? 'استعراض كافة الحصص والمجموعات المعتمدة والجدول الأسبوعي'
                  : 'Explore All Academy Classes, Cohorts & Weekly Timetable'}
              </span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Instructors Section */}
      <section id="instructors-section" className="relative py-28 bg-[#0b0e0f] border-t border-brand-gold/15">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-brand-gold/70 block mb-2">
              {language === 'ar' ? 'كبار الأساتذة' : 'Artistic Pedigree'}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.16em] gold-text-gradient mb-4">
              {language === 'ar' ? 'هيئة التدريس المتميزة' : 'Distinguished Faculty'}
            </h2>
            <p className="text-sm text-brand-muted/70 font-light max-w-xl mx-auto">
              {language === 'ar'
                ? 'أساتذة ومدربو باليه عالميون من أوبرا باريس والمملكة المتحدة وسانت بطرسبرغ.'
                : 'World-renowned maîtres de ballet and laureates from Paris, London, and Saint Petersburg dedicated to shaping virtuoso dancers.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {portalContent.faculty.map((member) => (
              <div
                key={member.id}
                className="p-6 rounded-2xl bg-[#121617] border border-brand-gold/30 hover:border-brand-gold transition duration-300 flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 rounded-full border-2 border-brand-gold/60 p-1 mb-4 relative">
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  {member.badge && (
                    <span className="absolute bottom-0 right-0 bg-brand-gold text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {member.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-2xl text-brand-gold tracking-wide mb-1">
                  {language === 'ar' ? member.nameAr : member.name}
                </h3>
                <span className="text-xs text-brand-muted/60 uppercase tracking-wider mb-4">
                  {language === 'ar' ? member.roleAr : member.role}
                </span>
                <p className="text-xs text-brand-muted/80 font-light leading-relaxed">
                  {language === 'ar' ? member.bioAr : member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Performance Season Section */}
      <section id="performance-section" className="relative py-28 bg-[#080a0b] border-t border-brand-gold/15">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-brand-gold/70 block mb-2">
              {language === 'ar' ? 'المسرح والعروض' : 'Stage & Repertoire'}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.16em] gold-text-gradient mb-4">
              {language === 'ar' ? 'موسم عروض 2026' : '2026 Performance Season'}
            </h2>
            <p className="text-sm text-brand-muted/70 font-light max-w-xl mx-auto">
              {language === 'ar'
                ? 'يشارك راقصو إيتوال على خشبة المسرح الكبير برفقة الأوركسترا السيمفونية الحية.'
                : 'Witness our dancers command the grand stage in timeless masterworks alongside resident orchestra musicians.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {portalContent.performances.map((perf) => (
              <div
                key={perf.id}
                className="rounded-2xl border border-brand-gold/40 bg-[#101314] p-6 flex flex-col justify-between hover:border-brand-gold transition duration-300"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[11px] font-semibold text-brand-gold px-2.5 py-1 rounded bg-brand-gold/10 border border-brand-gold/30">
                      {language === 'ar' ? perf.datesAr : perf.dates}
                    </span>
                    <span className="text-[11px] text-brand-gold-light/90 italic">
                      {language === 'ar' ? perf.venueAr : perf.venue}
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl text-[#fdf1c2] mb-2">
                    {language === 'ar' ? perf.titleAr : perf.title}
                  </h3>
                  <p className="text-xs text-brand-muted/75 font-light leading-relaxed mb-6">
                    {language === 'ar' ? perf.descriptionAr : perf.description}
                  </p>
                </div>
                <button
                  onClick={() => setEnrollModalOpen(true)}
                  className="text-xs font-serif uppercase tracking-wider text-brand-gold hover:text-brand-gold-light flex items-center gap-2"
                >
                  <span>{language === 'ar' ? (perf.ctaTextAr || 'حجز مقاعد كبار الزوار') : (perf.ctaText || 'Inquire About Box Seats')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Golden Metallic Footer typically matching screenshot */}
      <footer className="w-full bg-gradient-to-r from-[#d4a03e] via-[#e5bf65] to-[#c79430] text-black py-10 px-8 sm:px-14 lg:px-20 border-t border-[#f7e39d] shadow-[0_-10px_35px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          {/* Top Row: Contact + Links + Social */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            {/* Contact Info (Left) */}
            <div className="flex flex-col text-left space-y-1 font-sans text-sm font-medium text-black">
              <span className="font-serif text-base font-bold tracking-wide text-black mb-1">
                {language === 'ar' ? 'اتصل بنا' : 'Contact Us'}
              </span>
              <span className="text-black/90 font-medium">{portalContent.branding.phone}</span>
              <span className="text-black/90 font-medium">{portalContent.branding.email}</span>
              <span className="text-black/90 font-medium">{portalContent.branding.website}</span>
            </div>

            {/* Dynamic Footer Links (Center) */}
            {portalContent.footerLinks && portalContent.footerLinks.filter(l => l.enabled).length > 0 && (
              <div className="flex flex-col items-start sm:items-center space-y-1.5">
                <span className="font-serif text-base font-bold tracking-wide text-black mb-1">
                  {language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {[...portalContent.footerLinks]
                    .filter(link => link.enabled)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(link => (
                      <a
                        key={link.id}
                        href={link.url}
                        target={link.openInNewTab ? '_blank' : '_self'}
                        rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                        className="flex items-center gap-1.5 text-sm text-black/90 hover:text-black font-medium hover:underline underline-offset-2 transition-all"
                      >
                        {link.icon && (
                          <i className={`fa-solid ${link.icon} text-xs text-black/60`}></i>
                        )}
                        <span>{language === 'ar' ? link.labelAr : link.label}</span>
                      </a>
                    ))}
                </div>
              </div>
            )}

            {/* Social Icons & Copyright (Right) */}
            <div className="flex flex-col items-start sm:items-end space-y-3">
              <div className="flex items-center space-x-3">
                {portalContent.branding.socials?.x && (
                  <a
                    href={portalContent.branding.socials.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#e2be68] hover:scale-110 active:scale-95 transition"
                    aria-label="X / Twitter"
                  >
                    <i className="fa-brands fa-x-twitter text-sm"></i>
                  </a>
                )}
                {portalContent.branding.socials?.facebook && (
                  <a
                    href={portalContent.branding.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#e2be68] hover:scale-110 active:scale-95 transition"
                    aria-label="Facebook"
                  >
                    <i className="fa-brands fa-facebook-f text-sm"></i>
                  </a>
                )}
                {portalContent.branding.socials?.instagram && (
                  <a
                    href={portalContent.branding.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#e2be68] hover:scale-110 active:scale-95 transition"
                    aria-label="Instagram"
                  >
                    <i className="fa-brands fa-instagram text-sm"></i>
                  </a>
                )}
                {portalContent.branding.socials?.youtube && (
                  <a
                    href={portalContent.branding.socials.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#e2be68] hover:scale-110 active:scale-95 transition"
                    aria-label="YouTube"
                  >
                    <i className="fa-brands fa-youtube text-sm"></i>
                  </a>
                )}
                {portalContent.branding.socials?.tiktok && (
                  <a
                    href={portalContent.branding.socials.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#e2be68] hover:scale-110 active:scale-95 transition"
                    aria-label="TikTok"
                  >
                    <i className="fa-brands fa-tiktok text-sm"></i>
                  </a>
                )}
                {portalContent.branding.socials?.snapchat && (
                  <a
                    href={portalContent.branding.socials.snapchat}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#e2be68] hover:scale-110 active:scale-95 transition"
                    aria-label="Snapchat"
                  >
                    <i className="fa-brands fa-snapchat text-sm"></i>
                  </a>
                )}
              </div>
              <p className="text-xs text-black font-semibold tracking-wide">
                © {new Date().getFullYear()} {language === 'ar' ? (portalContent.branding.nameAr || 'أكاديمية إتوال للباليه') : (portalContent.branding.name || 'Étoile Ballet Academy')}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Program Modal */}
      <ProgramModal
        programKey={selectedProgram}
        onClose={() => setSelectedProgram(null)}
        onEnroll={handleDirectEnroll}
      />

      {/* Enrollment Modal */}
      <EnrollModal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        defaultProgram={enrollDefaultProgram}
      />
    </div>
  );
};
