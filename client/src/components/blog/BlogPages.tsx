import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { BlogPost } from '../../types';
import { exportCsv } from '../../utils/csv';
import { rawApi } from '../../utils/api';
import {
  Search, Clock, Eye, ArrowLeft, Share2, Download, LayoutGrid, Rows3,
  X, Play, Film, Image as ImageIcon, Sparkles, Tag, ChevronRight, BookOpen, Users,
} from 'lucide-react';
import { SmartImage } from '../ui/SmartImage';
import { VideoEmbed, ImageGallery } from './BlogMediaComponents';

export const FALLBACK_POSTS: BlogPost[] = [
  {
    id: 'seed-1',
    slug: 'pointe-shoe-fitting-guide',
    title: 'Masterclass: Pointe Shoe Fitting & Foot Articulation',
    titleAr: 'ماستركلاس: قياس حذاء البوانت والتحكم بمشط القدم',
    excerpt: 'Essential fitting principles, shank flexibility analysis, and pre-pointe foot articulation drills with Étoile principal coach.',
    excerptAr: 'المبادئ الأساسية لقياس حذاء البوانت، واختبار مرونة النعل، وتمارين مشط القدم المتقدمة مع كبار مدربي إتوال.',
    content: `## The Architecture of Pointe Shoes

Fitting a pointe shoe is both an anatomical science and an art form. At the Étoile Conservatory, every dancer undergoes an individual biomechanical assessment before stepping onto pointe.

### 1. The Anatomy of the Box & Shank
The box must support the metatarsals without pinching the hallux. A shank that is too stiff forces the dancer back off the platform, while a shank that is too pliable can cause hyperextension and tendinopathy.

### 2. Daily Maintenance & Longevity
- **Air Dry Thoroughly**: Never store satin shoes in plastic bags. Moisture breaks down traditional paste.
- **Rotation**: Dancers training more than 10 hours weekly must rotate at least two pairs.
- **Darning & Ribbon Placement**: Ensure ribbon tension is balanced to protect the Achilles tendon.

Watch our complete video masterclass below to see foot strengthening drills and proper ribbon sewing techniques.`,
    contentAr: `## هندسة حذاء البوانت وقواعد القياس السليم

قياس حذاء البوانت هو مزيج دقيق بين علم التشريح وفن الباليه الكلاسيكي. في أكاديمية إتوال، تخضع كل راقصة لفحص بيوميكانيكي شامل قبل الوقوف على رؤوس الأصابع.

### 1. أجزاء الحذاء وصندوق التوازن
يجب أن يوفر صندوق الحذاء دعماً مثالياً لمشط القدم بدون الضغط الزائد على الأصابع. النعل شديد الصلابة يعيق الوصول إلى قمة المنصة، بينما النعل الرخو قد يسبب إجهاداً لأوتار الكاحل.

### 2. العناية اليومية بالحذاء
- **التهوية الكاملة**: تجنبي وضع أحذية الستان في أكياس مغلقة. الرطوبة تضعف الغراء التقليدي.
- **التبديل المستمر**: يُنصح بالتبديل بين زوجين من الأحذية عند التدريب المكثف.
- **تثبيت الأشرطة**: ضبط شد الأشرطة بدقة لحماية وتر العرقوب.

شاهدي الماستركلاس المصور المرفق لمتابعة تمارين التقوية وطرق ربط الأشرطة الاحترافية.`,
    coverImageUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=GMcMLenO_Fw',
    videoEmbedCode: '<iframe src="https://www.youtube-nocookie.com/embed/GMcMLenO_Fw" title="How to Get Pointe Shoes Fitted" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
    galleryImages: [
      'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1516475429286-465d815a0df7?auto=format&fit=crop&w=900&q=80',
    ],
    authorName: 'Mme. Giselle Fontaine',
    authorNameAr: 'أ. جيزيل فونتين',
    tags: ['pointe', 'masterclass', 'technique', 'training'],
    category: 'training',
    status: 'published',
    featured: true,
    views: 184,
    readingMinutes: 6,
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    slug: 'audition-prep-checklist',
    title: 'Audition Masterclass: Artistry, Musicality & Placement',
    titleAr: 'ماستركلاس اختبارات القبول: النقاء الحركي والإحساس الموسيقي',
    excerpt: 'What international jury evaluators look for during conservatory audition rounds and barre assessment.',
    excerptAr: 'أهم معايير لجان التقييم الدولية في اختبارات القبول وتدريبات البار الكلاسيكية.',
    content: `## Excelling at Conservatory Auditions

An audition is not merely a test of technique; it is a manifestation of artistry, posture, and poise. Evaluators observe how a dancer breathes, transitions between positions, and absorbs musical phrasing.

### What Evaluators Score:
1. **Epaulement & Head Alignment**: The harmonious angle of the neck and shoulders.
2. **Clean Footwork at the Barre**: Precision of tendus, jetés, and ronds de jambe.
3. **Musicality & Dynamic Nuance**: Interpreting tempo changes rather than mechanically counting.

Review the photo gallery and demonstration video for barre posture guidelines.`,
    contentAr: `## التميز في اختبارات القبول بالأكاديمية

اختبار القبول ليس مجرد قياس للقدرات الفنية، بل هو تعبير عن الحضور المسرحي والنقاء الحركي. يراقب الحكام طريقة تنفس الراقصة وانسيابية الانتقال بين الأوضاع والتفاعل مع النغمات الموسيقية.

### بنود التقييم الرئيسية:
1. **استقامة الرقبة والأكتاف (Epaulement)**: التناغم الحركي بين الرأس والكتفين.
2. **دقة حركات البار**: النقاء في التاندو والجيته والدوران.
3. **الإحساس الموسيقي**: التعبير عن اللحن بدلاً من العد الحركي المجرد.

اطلعي على معرض الصور والفيديو التوضيحي المرفق للاستعداد الأمثل.`,
    coverImageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=CotioxyuN0A',
    videoEmbedCode: '<iframe src="https://www.youtube-nocookie.com/embed/CotioxyuN0A" title="Audition & Barre Technique" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
    galleryImages: [
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80',
    ],
    authorName: 'Maître Alexandre Moreau',
    authorNameAr: 'أ. ألكسندر مورو',
    tags: ['audition', 'conservatory', 'preparation'],
    category: 'journal',
    status: 'published',
    featured: false,
    views: 122,
    readingMinutes: 4,
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'seed-3',
    slug: 'nutcracker-behind-scenes',
    title: 'Behind the Scenes: Stagecraft, Lighting & Grand Pas Rehearsals',
    titleAr: 'كواليس العرض المسرحي: إضاءة المسرح وتدريبات البا دو دو',
    excerpt: 'An exclusive look inside the 4-week production cycle for the academy annual gala performance.',
    excerptAr: 'نظرة حصرية على كواليس إنتاج العرض السنوي الكبير وتدريبات المسرح لأكثر من 60 راقصة.',
    content: `## The Grand Stage Experience

Producing a full-scale classical production requires immense dedication from dancers, stage directors, and costumiers. From bespoke tulle tutus to stage lighting calibration, every detail matters.

### Rehearsal Highlights
Over 60 conservatory dancers, 120 hand-sewn costumes, and 80 hours of orchestra rehearsal culminate in this breathtaking annual showcase. Watch the rehearsal video and browse exclusive stage photography below.`,
    contentAr: `## تجربة المسرح الكبير والأداء الحي

يتطلب إنتاج عرض باليه كلاسيكي كامل تفانياً هائلاً من الراقصات ومصممي الأزياء ومهندسي الإضاءة. من خياطة فساتين التوتو اليدوية وحتى ضبط مسارات الإضاءة، كل تفصيلة تصنع الفارق.

### أرقام من الكواليس
أكثر من 60 راقصة و120 زياً مسرحياً مصنوعاً يدوياً و80 ساعة تدريب أوركسترالي تثمر عن هذا العرض السنوي الساحر. شاهدي مقطع التدريبات المباشر وتصفحي معرض الصور الحصري.`,
    coverImageUrl: 'https://images.unsplash.com/photo-1516475429286-465d815a0df7?auto=format&fit=crop&w=1200&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=ayrrYQAA1BQ',
    videoEmbedCode: '<iframe src="https://www.youtube-nocookie.com/embed/ayrrYQAA1BQ" title="Nutcracker Rehearsal & Stagecraft" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
    galleryImages: [
      'https://images.unsplash.com/photo-1516475429286-465d815a0df7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80',
    ],
    authorName: 'Étoile Stage Production',
    authorNameAr: 'فريق إنتاج إتوال',
    tags: ['performances', 'stage', 'backstage', 'nutcracker'],
    category: 'performances',
    status: 'published',
    featured: false,
    views: 95,
    readingMinutes: 5,
    publishedAt: new Date().toISOString(),
  },
];

export const BlogListPage: React.FC<{ onOpenPost: (slug: string) => void }> = ({ onOpenPost }) => {
  const { language, setActiveView, globalSearchQuery, setGlobalSearchQuery, showToast } = useApp();
  const [posts, setPosts] = useState<BlogPost[]>(FALLBACK_POSTS);
  const [q, setQ] = useState(globalSearchQuery || '');
  const [cat, setCat] = useState('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'gallery'>('all');
  const [view, setView] = useState<'cards' | 'rows'>('cards');

  useEffect(() => {
    if (globalSearchQuery !== q) setQ(globalSearchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearchQuery]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await rawApi.get('/api/blog?status=published&limit=50');
        const list = Array.isArray(data) ? data : data.items || data.posts || [];
        if (list.length > 0) setPosts(list);
      } catch {
        /* fallback seeds */
      }
    })();
  }, []);

  const filtered = posts.filter((p) => {
    const okCat = cat === 'all' || p.category === cat;
    const hasVid = Boolean(p.videoUrl || p.videoEmbedCode);
    const hasGal = Boolean(p.galleryImages && p.galleryImages.length > 0);

    if (mediaFilter === 'video' && !hasVid) return false;
    if (mediaFilter === 'gallery' && !hasGal) return false;

    const needle = q.trim().toLowerCase();
    const okQ =
      !needle ||
      p.title.toLowerCase().includes(needle) ||
      p.titleAr.includes(q.trim()) ||
      (p.tags || []).join(' ').toLowerCase().includes(needle) ||
      (p.excerpt || '').toLowerCase().includes(needle);

    return okCat && okQ;
  });

  const featured = filtered.find((p) => p.featured) || filtered[0];
  const setQueryBoth = (v: string) => {
    setQ(v);
    setGlobalSearchQuery(v);
  };

  const handleExport = () => {
    exportCsv(
      `etoile-journal-${new Date().toISOString().split('T')[0]}`,
      ['slug', 'title', 'category', 'tags', 'hasVideo', 'galleryCount', 'views', 'readingMinutes'],
      filtered.map((p) => ({
        slug: p.slug,
        title: p.title,
        category: p.category,
        tags: (p.tags || []).join('|'),
        hasVideo: p.videoUrl || p.videoEmbedCode ? 'yes' : 'no',
        galleryCount: p.galleryImages?.length || 0,
        views: p.views,
        readingMinutes: p.readingMinutes,
      }))
    );
    showToast(
      language === 'ar' ? 'تم تصدير المقالات' : 'Journal exported',
      `${filtered.length} articles → CSV`,
      'gold'
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Breadcrumb Navigation */}
      <button
        onClick={() => setActiveView('landing')}
        className="text-xs text-brand-gold/70 hover:text-brand-gold mb-4 flex items-center gap-1 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {language === 'ar' ? 'الرئيسية' : 'Home'}
      </button>

      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#121619] via-[#0d1012] to-[#121619] border border-brand-gold/30 shadow-2xl mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-gold/40 bg-brand-gold/10 text-brand-gold text-xs font-mono mb-2">
              <Sparkles className="w-3 h-3" />
              <span>{language === 'ar' ? 'أكاديمية إتوال • النشرات والماستركلاس' : 'Étoile Conservatory Journal & Masterclasses'}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl gold-text-gradient font-normal">
              {language === 'ar' ? 'مدونة الأكاديمية والماستركلاس' : 'The Conservatory Journal'}
            </h1>
            <p className="text-xs sm:text-sm text-brand-muted/90 mt-2 max-w-2xl leading-relaxed">
              {language === 'ar'
                ? 'فيديوهات تدريبية مسرحية مع كبار الأساتذة، تحليلات تقنية لحذاء البوانت، إرشادات التغذية، وتغطية كواليس الموسم المسرحي.'
                : 'Cinematic video masterclasses, technical pointe diagnostics, nutritional blueprints, and behind-the-curtain repertory dispatches.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setMediaFilter(mediaFilter === 'video' ? 'all' : 'video')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                mediaFilter === 'video'
                  ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(226,190,104,0.4)]'
                  : 'bg-black/40 border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'فيديوهات ماستركلاس' : 'Video Masterclasses'}</span>
            </button>

            <button
              onClick={() => setMediaFilter(mediaFilter === 'gallery' ? 'all' : 'gallery')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                mediaFilter === 'gallery'
                  ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(226,190,104,0.4)]'
                  : 'bg-black/40 border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'معارض الصور' : 'Photo Galleries'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <label className="relative flex-1">
          <Search className="w-4 h-4 absolute start-3 top-3 text-brand-muted/60" />
          <input
            value={q}
            onChange={(e) => setQueryBoth(e.target.value)}
            placeholder={language === 'ar' ? 'ابحثي في مقالات وفيديوهات المدونة...' : 'Search articles, videos & masterclasses...'}
            className="form-gold-input w-full ps-9 pe-9 py-2.5 rounded-xl text-sm bg-[#101314]"
            aria-label="Search blog"
          />
          {q && (
            <button
              onClick={() => setQueryBoth('')}
              className="absolute end-2 top-2.5 text-brand-muted hover:text-white p-0.5"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>

        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="form-gold-input px-4 py-2.5 rounded-xl text-sm bg-[#101314]"
          aria-label="Category"
        >
          <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
          <option value="training">{language === 'ar' ? 'تدريب وماستركلاس (Training)' : 'Training & Masterclass'}</option>
          <option value="performances">{language === 'ar' ? 'عروض ومسرح (Performances)' : 'Performances & Stage'}</option>
          <option value="journal">{language === 'ar' ? 'مقالات الكونسرفتوار (Journal)' : 'Academy Journal'}</option>
          <option value="nutrition">{language === 'ar' ? 'تغذية ولياقة (Nutrition)' : 'Nutrition & Wellness'}</option>
          <option value="announcements">{language === 'ar' ? 'إعلانات رسمية (Announcements)' : 'Announcements'}</option>
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-brand-muted px-2.5 py-2.5 rounded-xl border border-brand-gold/20 bg-black/40">
            {filtered.length}
          </span>
          <div className="flex items-center gap-1 p-1 bg-[#090b0c] border border-brand-gold/20 rounded-xl" role="group" aria-label="Layout">
            <button
              onClick={() => setView('cards')}
              aria-pressed={view === 'cards'}
              title="Cards"
              className={`p-2 rounded-lg transition ${view === 'cards' ? 'bg-brand-gold text-black' : 'text-brand-muted hover:text-brand-gold'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('rows')}
              aria-pressed={view === 'rows'}
              title="Rows"
              className={`p-2 rounded-lg transition ${view === 'rows' ? 'bg-brand-gold text-black' : 'text-brand-muted hover:text-brand-gold'}`}
            >
              <Rows3 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-black text-xs font-bold transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Featured Article Card */}
      {featured && (
        <div
          onClick={() => onOpenPost(featured.slug)}
          className="cursor-pointer group relative rounded-3xl overflow-hidden border-2 border-brand-gold/40 bg-gradient-to-br from-[#181d22] via-[#101314] to-[#0b0e0f] p-6 sm:p-8 mb-8 shadow-2xl hover:border-brand-gold transition-all duration-300"
        >
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Visual Media Preview */}
            <div className="relative w-full lg:w-1/2 aspect-video rounded-2xl overflow-hidden border border-brand-gold/30 bg-black shrink-0">
              <SmartImage
                src={featured.coverImageUrl || 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=80'}
                alt={featured.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4 justify-between">
                {(featured.videoUrl || featured.videoEmbedCode) && (
                  <span className="px-3 py-1 rounded-full bg-rose-500/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                    <Play className="w-3 h-3 fill-white" />
                    <span>Watch Masterclass</span>
                  </span>
                )}
                {featured.galleryImages && featured.galleryImages.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur text-brand-gold text-xs border border-brand-gold/40 flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" />
                    <span>{featured.galleryImages.length} Photos</span>
                  </span>
                )}
              </div>
            </div>

            {/* Content Details */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40 font-mono">
                  {language === 'ar' ? 'مميز' : 'Featured'} • {featured.category}
                </span>
                <span className="text-[11px] text-brand-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {featured.readingMinutes} min
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-[#fdf1c2] group-hover:text-brand-gold transition">
                {language === 'ar' ? featured.titleAr : featured.title}
              </h2>

              <p className="text-xs sm:text-sm text-brand-muted/90 line-clamp-3 leading-relaxed">
                {language === 'ar' ? featured.excerptAr : featured.excerpt}
              </p>

              <div className="pt-2 flex items-center justify-between text-xs text-brand-muted border-t border-brand-gold/15">
                <span className="text-brand-gold/90 font-medium">
                  {language === 'ar' ? featured.authorNameAr || featured.authorName : featured.authorName}
                </span>
                <span className="inline-flex items-center gap-1 text-brand-gold group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition font-semibold">
                  <span>{language === 'ar' ? 'مشاهدة المقال والفيديو' : 'Read & Watch'}</span>
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid or Rows list */}
      {filtered.length === 0 ? (
        <div className="gold-card rounded-2xl p-12 text-center text-sm text-brand-muted">
          {language === 'ar' ? 'لا توجد مقالات أو فيديوهات مطابقة للبحث.' : 'No articles or masterclasses match your search.'}
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const hasVideo = Boolean(p.videoUrl || p.videoEmbedCode);
            const hasGallery = Boolean(p.galleryImages && p.galleryImages.length > 0);
            return (
              <div
                key={p.id}
                onClick={() => onOpenPost(p.slug)}
                className="cursor-pointer group gold-card rounded-2xl overflow-hidden hover:border-brand-gold transition-all duration-300 flex flex-col shadow-lg"
              >
                {/* Media Thumbnail */}
                <div className="relative aspect-video w-full bg-black overflow-hidden">
                  <SmartImage
                    src={p.coverImageUrl || 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=800&q=80'}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
                    {hasVideo && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/90 text-white text-[10px] font-bold flex items-center gap-1 shadow">
                        <Play className="w-2.5 h-2.5 fill-white" /> Video
                      </span>
                    )}
                    {hasGallery && (
                      <span className="px-2 py-0.5 rounded-full bg-black/75 text-brand-gold border border-brand-gold/40 text-[10px] font-medium flex items-center gap-1">
                        <ImageIcon className="w-2.5 h-2.5" /> {p.galleryImages?.length}
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-2 end-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-white/90">
                    {p.readingMinutes} min
                  </span>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-brand-gold font-mono block">
                      {p.category}
                    </span>
                    <h3 className="font-serif text-lg text-[#fdf1c2] group-hover:text-brand-gold transition line-clamp-2">
                      {language === 'ar' ? p.titleAr : p.title}
                    </h3>
                    <p className="text-xs text-brand-muted line-clamp-2 leading-relaxed">
                      {language === 'ar' ? p.excerptAr : p.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-brand-gold/15 flex items-center justify-between text-[11px] text-brand-muted/80">
                    <span className="truncate max-w-[140px]">{language === 'ar' ? p.authorNameAr || p.authorName : p.authorName}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {p.views}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="gold-card rounded-2xl overflow-hidden divide-y divide-brand-gold/10 shadow-lg">
          {filtered.map((p) => {
            const hasVideo = Boolean(p.videoUrl || p.videoEmbedCode);
            const hasGallery = Boolean(p.galleryImages && p.galleryImages.length > 0);
            return (
              <div
                key={p.id}
                onClick={() => onOpenPost(p.slug)}
                className="w-full flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition"
              >
                <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-black border border-brand-gold/20">
                  <SmartImage
                    src={p.coverImageUrl || 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=400&q=80'}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                  {hasVideo && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold border border-brand-gold/25">
                      {p.category}
                    </span>
                    {hasVideo && (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1">
                        <Film className="w-3 h-3" /> Masterclass
                      </span>
                    )}
                    {hasGallery && (
                      <span className="text-[10px] text-brand-gold flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Gallery
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif text-base text-[#fdf1c2] truncate">
                    {language === 'ar' ? p.titleAr : p.title}
                  </h4>
                  <p className="text-xs text-brand-muted truncate mt-0.5">
                    {language === 'ar' ? p.excerptAr : p.excerpt}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs text-brand-muted/70">
                  <span className="hidden md:flex items-center gap-1"><Clock className="w-3 h-3" /> {p.readingMinutes} min</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views}</span>
                  <ChevronRight className="w-4 h-4 text-brand-gold rtl:rotate-180" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const BlogDetailPage: React.FC<{ slug: string; onBack: () => void }> = ({ slug, onBack }) => {
  const navigate = useNavigate();
  const { language, setActiveBlogSlug, setActiveView, currentFamilyId, instructorUser } = useApp();
  const [post, setPost] = useState<BlogPost | null>(
    FALLBACK_POSTS.find((p) => p.slug === slug) || null
  );
  const [related, setRelated] = useState<BlogPost[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await rawApi.get(`/api/blog/${encodeURIComponent(slug)}`);
        if (data.post) {
          setPost(data.post);
          if (Array.isArray(data.related)) setRelated(data.related);
        } else if (data) {
          setPost(data);
        }
      } catch {
        /* keep fallback */
      }
    })();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center text-sm text-brand-muted">
        {language === 'ar' ? 'جاري تحميل المقال...' : 'Loading conservatory masterclass...'}
      </div>
    );
  }

  const title = language === 'ar' ? post.titleAr : post.title;
  const body = language === 'ar' ? post.contentAr : post.content;
  const author = language === 'ar' ? post.authorNameAr || post.authorName : post.authorName;

  const shareWhats = () => {
    const url = `${window.location.origin}/blog/${post.slug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + url)}`, '_blank');
  };

  const hasVideo = Boolean(post.videoUrl || post.videoEmbedCode);

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navigation Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs text-brand-gold/80 hover:text-brand-gold flex items-center gap-1.5 transition px-3 py-1.5 rounded-xl border border-brand-gold/30 bg-brand-gold/5 hover:bg-brand-gold/15"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{language === 'ar' ? 'الرجوع للمدونة والماستركلاس' : 'Back to Conservatory Journal'}</span>
          </button>

          {(Boolean(currentFamilyId) || Boolean(instructorUser)) && (
            <button
              onClick={() => {
                setActiveView('client_portal');
                navigate('/portal');
              }}
              className="text-xs text-brand-gold hover:text-black flex items-center gap-1.5 transition px-3 py-1.5 rounded-xl border border-brand-gold/40 bg-brand-gold/10 hover:bg-brand-gold font-medium shadow-sm"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الرجوع لبوابتي (لوحة التحكم)' : 'Back to Client Dashboard'}</span>
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setActiveView('landing');
            navigate('/');
          }}
          className="text-xs text-brand-muted/70 hover:text-brand-gold transition"
        >
          {language === 'ar' ? 'الرئيسية' : 'Home'}
        </button>
      </div>

      {/* Meta Category & Reading Time */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] uppercase font-mono tracking-widest px-3 py-1 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
          {post.category}
        </span>
        {hasVideo && (
          <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <Film className="w-3 h-3" /> Masterclass Video
          </span>
        )}
        {post.galleryImages && post.galleryImages.length > 0 && (
          <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> {post.galleryImages.length} High-Res Photos
          </span>
        )}
      </div>

      {/* Main Title */}
      <h1 className="font-serif text-3xl sm:text-5xl text-[#fdf1c2] leading-tight mb-4">
        {title}
      </h1>

      {/* Author & Stats Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-brand-gold/20 text-xs text-brand-muted mb-8">
        <div className="flex items-center gap-3">
          <span className="font-medium text-brand-gold">{author}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {post.readingMinutes} min read
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {post.views} views
          </span>
        </div>

        <button
          onClick={shareWhats}
          className="px-3.5 py-1.5 rounded-lg border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 text-xs flex items-center gap-2 transition"
          aria-label="Share via WhatsApp"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'مشاركة عبر واتساب' : 'Share Article'}</span>
        </button>
      </div>

      {/* EMBEDDED VIDEO PLAYER SECTION (if video exists) */}
      {hasVideo && (
        <div className="mb-10">
          <VideoEmbed
            videoUrl={post.videoUrl}
            videoEmbedCode={post.videoEmbedCode}
            title={title}
            poster={post.coverImageUrl}
          />
        </div>
      )}

      {/* Cover Image (if no video or if hero image is present) */}
      {!hasVideo && post.coverImageUrl && (
        <div className="mb-10 rounded-3xl overflow-hidden border border-brand-gold/30 shadow-2xl">
          <SmartImage
            src={post.coverImageUrl}
            alt={title}
            className="w-full aspect-[21/9] object-cover"
          />
        </div>
      )}

      {/* Excerpt Lead Paragraph */}
      <div className="p-6 rounded-2xl bg-[#121619] border-s-4 border-brand-gold mb-8 text-sm sm:text-base text-[#fdf1c2]/90 italic leading-relaxed shadow-sm">
        {language === 'ar' ? post.excerptAr : post.excerpt}
      </div>

      {/* Markdown Content Body */}
      <div className="prose prose-invert max-w-none text-sm sm:text-base leading-relaxed text-[#dcd2bd]/95 space-y-4 whitespace-pre-wrap font-sans">
        {body}
      </div>

      {/* PHOTO GALLERY SECTION (in a good way) */}
      {post.galleryImages && post.galleryImages.length > 0 && (
        <div className="mt-12 pt-8 border-t border-brand-gold/20">
          <ImageGallery
            images={post.galleryImages}
            title={language === 'ar' ? 'معرض صور الكواليس والمسرح' : 'Behind The Scenes & Rehearsal Gallery'}
          />
        </div>
      )}

      {/* Tags Strip */}
      <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-brand-gold/20">
        <span className="text-xs text-brand-muted flex items-center gap-1 me-2">
          <Tag className="w-3.5 h-3.5" /> Tags:
        </span>
        {(post.tags || []).map((t) => (
          <span
            key={t}
            className="text-xs px-3 py-1 rounded-full border border-brand-gold/30 text-brand-gold bg-brand-gold/5"
          >
            #{t}
          </span>
        ))}
      </div>

      {/* Related Posts */}
      {related.length > 0 && (
        <div className="mt-14 pt-8 border-t border-brand-gold/30">
          <h3 className="font-serif text-2xl text-[#fdf1c2] mb-6">
            {language === 'ar' ? 'مقالات وماستركلاس ذات صلة' : 'Related Conservatory Masterclasses'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((rel) => (
              <div
                key={rel.id}
                onClick={() => {
                  setActiveBlogSlug(rel.slug);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="cursor-pointer group gold-card rounded-xl p-4 hover:border-brand-gold transition space-y-2"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-brand-gold/20">
                  <SmartImage
                    src={rel.coverImageUrl || 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=400&q=80'}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  {(rel.videoUrl || rel.videoEmbedCode) && (
                    <div className="absolute top-1.5 start-1.5 px-2 py-0.5 rounded bg-rose-500 text-[9px] text-white font-bold flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-white" /> Video
                    </div>
                  )}
                </div>
                <h4 className="font-serif text-sm text-[#fdf1c2] group-hover:text-brand-gold transition truncate">
                  {language === 'ar' ? rel.titleAr : rel.title}
                </h4>
                <p className="text-[11px] text-brand-muted line-clamp-2">
                  {language === 'ar' ? rel.excerptAr : rel.excerpt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};
