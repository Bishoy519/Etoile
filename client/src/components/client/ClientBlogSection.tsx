import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { BlogPost } from '../../types';
import { rawApi } from '../../utils/api';
import { FALLBACK_POSTS } from '../blog/BlogPages';
import { VideoEmbed, ImageGallery } from '../blog/BlogMediaComponents';
import { SmartImage } from '../ui/SmartImage';
import {
  Sparkles,
  Film,
  Play,
  Image as ImageIcon,
  ArrowRight,
  BookOpen,
  Clock,
  Eye,
  ChevronRight,
} from 'lucide-react';

export const ClientBlogSection: React.FC = () => {
  const navigate = useNavigate();
  const { language, setActiveView, setActiveBlogSlug } = useApp();
  const [posts, setPosts] = useState<BlogPost[]>(FALLBACK_POSTS);
  const [activeSlug, setActiveSlug] = useState<string>(FALLBACK_POSTS[0].slug);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await rawApi.get('/api/blog?status=published&limit=8');
        const list = Array.isArray(data) ? data : data.items || data.posts || [];
        if (list.length > 0) {
          setPosts(list);
          const featuredOrFirst = list.find((p: BlogPost) => p.featured) || list[0];
          if (featuredOrFirst) setActiveSlug(featuredOrFirst.slug);
        }
      } catch {
        /* fallback to seed */
      }
    })();
  }, []);

  const activePost = posts.find((p) => p.slug === activeSlug) || posts[0];

  const handleOpenFullPost = (slug: string) => {
    setActiveBlogSlug(slug);
    setActiveView('blog_detail');
    navigate('/blog/' + encodeURIComponent(slug));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAllBlogs = () => {
    setActiveView('blog');
    navigate('/blog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!activePost) return null;

  return (
    <section className="bg-[#101314] border border-brand-gold/40 rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.7)] space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-gold/20">
        <div>
          <div className="flex items-center gap-2 text-brand-gold text-xs uppercase tracking-widest font-mono mb-1">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <span>{language === 'ar' ? 'الماستركلاس ومدونة الأكاديمية' : 'Conservatory Masterclasses & Editorial'}</span>
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl gold-text-gradient font-normal">
            {language === 'ar' ? 'فيديوهات التدريب ومعارض الصور' : 'Featured Video Masterclasses & Photo Stories'}
          </h3>
          <p className="text-xs text-brand-muted/80 mt-1">
            {language === 'ar'
              ? 'شاهد ماستركلاس الباليه الحصري وتصفح صور كواليس العروض مباشرة من لوحة تحكمك.'
              : 'Watch exclusive ballet masterclasses and backstage photography directly from your family dashboard.'}
          </p>
        </div>

        <button
          onClick={handleOpenAllBlogs}
          className="self-start sm:self-auto px-4 py-2 rounded-xl border border-brand-gold/40 hover:border-brand-gold bg-brand-gold/10 hover:bg-brand-gold hover:text-black text-brand-gold text-xs font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'تصفح كل المقالات' : 'Explore All Journal Articles'}</span>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      {/* Main Spotlight: Interactive Embedded Video & Article Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Embedded Iframe Video or Cover */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#090b0c] p-2 sm:p-4 rounded-2xl border border-brand-gold/30">
            {activePost.videoUrl || activePost.videoEmbedCode ? (
              <VideoEmbed
                videoUrl={activePost.videoUrl}
                videoEmbedCode={activePost.videoEmbedCode}
                title={language === 'ar' ? activePost.titleAr : activePost.title}
                poster={activePost.coverImageUrl}
              />
            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-brand-gold/20">
                <SmartImage
                  src={activePost.coverImageUrl || 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=800&q=80'}
                  alt={activePost.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Quick Photo Gallery of the active post if available */}
          {activePost.galleryImages && activePost.galleryImages.length > 0 && (
            <div className="p-4 rounded-2xl bg-black/40 border border-brand-gold/20">
              <ImageGallery
                images={activePost.galleryImages}
                title={language === 'ar' ? 'معرض صور هذا المقال' : 'Rehearsal Photo Gallery'}
              />
            </div>
          )}
        </div>

        {/* Right Column: Active Post Summary & Quick Selector List */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between h-full">
          {/* Active Post Details Card */}
          <div className="p-5 rounded-2xl bg-[#090b0c] border border-brand-gold/30 space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono uppercase text-brand-gold bg-brand-gold/15 px-2.5 py-0.5 rounded-full border border-brand-gold/30">
                {activePost.category}
              </span>
              <span className="text-brand-muted flex items-center gap-1">
                <Clock className="w-3 h-3" /> {activePost.readingMinutes} min read
              </span>
            </div>

            <h4 className="font-serif text-xl sm:text-2xl text-[#fdf1c2] leading-snug">
              {language === 'ar' ? activePost.titleAr : activePost.title}
            </h4>

            <p className="text-xs text-brand-muted/90 line-clamp-3 leading-relaxed">
              {language === 'ar' ? activePost.excerptAr : activePost.excerpt}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-brand-gold/20 text-xs">
              <span className="text-brand-gold/90 font-medium">
                {language === 'ar' ? activePost.authorNameAr || activePost.authorName : activePost.authorName}
              </span>
              <button
                onClick={() => handleOpenFullPost(activePost.slug)}
                className="px-3.5 py-1.5 rounded-lg bg-brand-gold hover:bg-brand-gold-light text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(226,190,104,0.3)] transition"
              >
                <span>{language === 'ar' ? 'قراءة المقال كاملاً' : 'Read Full Story'}</span>
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Quick Playlist of other posts */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-brand-muted uppercase tracking-wider block">
              {language === 'ar' ? 'فيديوهات ومقالات أخرى' : 'More Academy Masterclasses'}
            </span>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {posts.map((post) => {
                const isSelected = post.slug === activePost.slug;
                const hasVid = Boolean(post.videoUrl || post.videoEmbedCode);
                return (
                  <div
                    key={post.id}
                    onClick={() => setActiveSlug(post.slug)}
                    className={`cursor-pointer flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-brand-gold/15 border-brand-gold shadow-sm'
                        : 'bg-black/30 border-brand-gold/20 hover:border-brand-gold/50 hover:bg-black/50'
                    }`}
                  >
                    <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-black border border-brand-gold/20">
                      <SmartImage
                        src={post.coverImageUrl || 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=300&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                      {hasVid && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 fill-white text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] text-brand-gold">
                        <span className="uppercase font-mono">{post.category}</span>
                        {hasVid && <span className="text-rose-400">• Video</span>}
                      </div>
                      <p className={`text-xs font-serif truncate mt-0.5 ${isSelected ? 'text-brand-gold font-bold' : 'text-[#fdf1c2]'}`}>
                        {language === 'ar' ? post.titleAr : post.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
