import React, { useEffect, useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import {
  Search,
  Plus,
  Eye,
  Download,
  LayoutGrid,
  Rows3,
  Film,
  Play,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Share2,
  Tag,
  Clock,
  ExternalLink,
  RotateCcw,
  Check,
  Maximize2,
} from 'lucide-react';
import { api, errMsg } from '../utils/api';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import type { BlogPost } from '../types';

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || `post-${Date.now().toString(36)}`
  );
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return match && match[2].length === 11 ? match[2] : null;
}

function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
  return match && match[1] ? match[1] : null;
}

function extractIframeSrc(html: string): string | null {
  if (!html) return null;
  const match = html.match(/src=["'](.*?)["']/);
  return match ? match[1] : null;
}

const EMPTY_POST: Partial<BlogPost> = {
  title: '',
  titleAr: '',
  excerpt: '',
  excerptAr: '',
  content: '',
  contentAr: '',
  slug: '',
  category: 'training',
  status: 'draft',
  featured: false,
  authorName: 'Étoile Editorial',
  authorNameAr: 'هيئة تحرير إتوال',
  tags: ['ballet', 'technique'],
  coverImageUrl: '',
  videoUrl: '',
  videoEmbedCode: '',
  galleryImages: [],
  readingMinutes: 5,
};

export const BlogManager: React.FC = () => {
  const { language, showToast } = useAdmin();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'gallery'>('all');
  const blogView = useViewPrefs('cms-blog', 'cards');

  // Editor states
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [editorLang, setEditorLang] = useState<'en' | 'ar'>('en');
  const [editorTab, setEditorTab] = useState<'content' | 'video' | 'gallery' | 'settings'>('content');
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Preview modal state
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  // Delete modal state
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);

  // Load all posts (draft, published, archived)
  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/blog?limit=100&status=all');
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setPosts(items);
    } catch (e) {
      showToast('Offline Mode', 'Unable to fetch remote blog posts. Showing local buffer.', 'gold');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Compute metrics
  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.status === 'published').length;
    const drafts = posts.filter((p) => p.status === 'draft').length;
    const withVideo = posts.filter((p) => Boolean(p.videoUrl || p.videoEmbedCode)).length;
    const withGallery = posts.filter((p) => Boolean(p.galleryImages && p.galleryImages.length > 0)).length;
    const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);
    return { total, published, drafts, withVideo, withGallery, totalViews };
  }, [posts]);

  // Filtering
  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (catFilter !== 'all' && p.category !== catFilter) return false;

      const hasVid = Boolean(p.videoUrl || p.videoEmbedCode);
      const hasGal = Boolean(p.galleryImages && p.galleryImages.length > 0);
      if (mediaFilter === 'video' && !hasVid) return false;
      if (mediaFilter === 'gallery' && !hasGal) return false;

      if (!q.trim()) return true;
      const needle = q.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(needle) ||
        (p.titleAr && p.titleAr.includes(q.trim())) ||
        p.slug.toLowerCase().includes(needle) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(needle)) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(needle))
      );
    });
  }, [posts, statusFilter, catFilter, mediaFilter, q]);

  // Handle open editor
  const handleOpenNew = () => {
    setEditing({ ...EMPTY_POST, tags: ['masterclass', 'ballet'] });
    setEditorLang('en');
    setEditorTab('content');
    setNewGalleryUrl('');
    setTagInput('');
  };

  const handleOpenEdit = (post: BlogPost) => {
    setEditing({
      ...post,
      tags: Array.isArray(post.tags) ? [...post.tags] : [],
      galleryImages: Array.isArray(post.galleryImages) ? [...post.galleryImages] : [],
    });
    setEditorLang('en');
    setEditorTab('content');
    setNewGalleryUrl('');
    setTagInput('');
  };

  // Save logic
  const handleSave = async (publishImmediately = false) => {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.titleAr?.trim()) {
      showToast(language === 'ar' ? 'العنوان مطلوب باللغتين' : 'Title required in both English & Arabic', '', 'error');
      setEditorTab('content');
      return;
    }
    if (!editing.excerpt?.trim() || !editing.excerptAr?.trim()) {
      showToast(language === 'ar' ? 'المقتطف مطلوب باللغتين' : 'Excerpt required in both English & Arabic', '', 'error');
      setEditorTab('content');
      return;
    }
    if (!editing.content?.trim() || !editing.contentAr?.trim()) {
      showToast(language === 'ar' ? 'المحتوى مطلوب باللغتين' : 'Content required in both English & Arabic', '', 'error');
      setEditorTab('content');
      return;
    }

    setIsSaving(true);
    try {
      const slug = editing.slug?.trim() || slugify(editing.title);
      const payload = {
        ...editing,
        slug,
        status: publishImmediately ? 'published' : editing.status || 'draft',
      };

      if (editing.id) {
        await api.patch(`/api/blog/${editing.id}`, payload);
        showToast(language === 'ar' ? 'تم تحديث المقال بنجاح' : 'Post updated successfully', '', 'success');
      } else {
        await api.post('/api/blog', payload);
        showToast(language === 'ar' ? 'تم إنشاء المقال بنجاح' : 'Post created successfully', '', 'success');
      }

      setEditing(null);
      loadPosts();
    } catch (e) {
      showToast('Save failed', errMsg(e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async (post: BlogPost) => {
    try {
      if (post.status === 'published') {
        await api.patch(`/api/blog/${post.id}`, { status: 'draft' });
        showToast(language === 'ar' ? 'تم تحويل المقال إلى مسودة' : 'Post moved to drafts', '', 'warning');
      } else {
        await api.post(`/api/blog/${post.id}/publish`, {});
        showToast(language === 'ar' ? 'تم نشر المقال بنجاح' : 'Post published to client portal', '', 'success');
      }
      loadPosts();
    } catch (e) {
      showToast('Action failed', errMsg(e), 'error');
    }
  };

  // Delete post
  const handleDeletePost = async (hard = false) => {
    if (!deletingPost) return;
    try {
      await api.delete(`/api/blog/${deletingPost.id}?hard=${hard ? 'true' : 'false'}`);
      showToast(
        language === 'ar' ? 'تم حذف المقال' : 'Post deleted',
        hard ? 'Permanently removed from database' : 'Archived',
        'success'
      );
      setDeletingPost(null);
      loadPosts();
    } catch (e) {
      showToast('Delete failed', errMsg(e), 'error');
    }
  };

  // Gallery manipulation inside editor
  const handleAddGalleryImage = () => {
    if (!newGalleryUrl.trim()) return;
    const current = editing?.galleryImages || [];
    setEditing({ ...editing, galleryImages: [...current, newGalleryUrl.trim()] });
    setNewGalleryUrl('');
  };

  const handleRemoveGalleryImage = (idx: number) => {
    const current = [...(editing?.galleryImages || [])];
    current.splice(idx, 1);
    setEditing({ ...editing, galleryImages: current });
  };

  // Tag manipulation
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = tagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const existing = editing?.tags || [];
    const combined = Array.from(new Set([...existing, ...newTags]));
    setEditing({ ...editing, tags: combined });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const existing = (editing?.tags || []).filter((t) => t !== tagToRemove);
    setEditing({ ...editing, tags: existing });
  };

  // CSV Export
  const handleExport = () => {
    exportCsv(
      `blog-posts-${new Date().toISOString().split('T')[0]}`,
      ['slug', 'title', 'status', 'category', 'hasVideo', 'galleryCount', 'views', 'featured'],
      filtered.map((p) => ({
        slug: p.slug,
        title: p.title,
        status: p.status,
        category: p.category,
        hasVideo: p.videoUrl || p.videoEmbedCode ? 'yes' : 'no',
        galleryCount: p.galleryImages?.length || 0,
        views: p.views,
        featured: p.featured ? 'yes' : 'no',
      }))
    );
    showToast(language === 'ar' ? 'تم تصدير المقالات' : 'Posts exported', `${filtered.length} rows → CSV`, 'success');
  };

  // Helper for live preview video source
  const liveVideoPreviewSrc = useMemo(() => {
    if (!editing) return null;
    if (editing.videoEmbedCode && editing.videoEmbedCode.includes('<iframe')) {
      return extractIframeSrc(editing.videoEmbedCode);
    }
    if (editing.videoUrl) {
      const yt = extractYouTubeId(editing.videoUrl);
      if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
      const vimeo = extractVimeoId(editing.videoUrl);
      if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
      return editing.videoUrl;
    }
    return null;
  }, [editing?.videoUrl, editing?.videoEmbedCode]);

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase tracking-wider mb-1">
            <Film className="w-4 h-4" />
            <span>{language === 'ar' ? 'نظام إدارة المدونة والماستركلاس' : 'Conservatory Media & Journal CMS'}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{language === 'ar' ? 'المدونة وفيديوهات التدريب' : 'Blog, Video Masterclasses & Press'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'نشر فيديوهات التدريب عبر iframe، إدارة معارض الصور، التحكم بالمحتوى ثنائي اللغة وحالة النشر.'
              : 'Embed video masterclasses with responsive iframes, curate photo galleries, manage bilingual content and publish.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white hover:border-white/20 flex items-center gap-1.5 transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold flex items-center gap-2 transition shadow-[0_0_20px_rgba(244,63,94,0.4)]"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'مقال / ماستركلاس جديد' : 'New Masterclass / Article'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">{language === 'ar' ? 'إجمالي المقالات' : 'Total Articles'}</span>
          <span className="text-xl font-bold text-white font-mono mt-1">{stats.total}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
          <span className="text-[11px] text-emerald-400">{language === 'ar' ? 'منشور للعملاء' : 'Published'}</span>
          <span className="text-xl font-bold text-emerald-300 font-mono mt-1">{stats.published}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
          <span className="text-[11px] text-amber-400">{language === 'ar' ? 'مسودات قيد الإعداد' : 'Drafts'}</span>
          <span className="text-xl font-bold text-amber-300 font-mono mt-1">{stats.drafts}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between">
          <span className="text-[11px] text-rose-400 flex items-center gap-1">
            <Film className="w-3 h-3" /> {language === 'ar' ? 'فيديوهات ماستركلاس' : 'With Video'}
          </span>
          <span className="text-xl font-bold text-rose-300 font-mono mt-1">{stats.withVideo}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col justify-between">
          <span className="text-[11px] text-blue-400 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> {language === 'ar' ? 'معارض صور' : 'With Gallery'}
          </span>
          <span className="text-xl font-bold text-blue-300 font-mono mt-1">{stats.withGallery}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">{language === 'ar' ? 'إجمالي المشاهدات' : 'Total Views'}</span>
          <span className="text-xl font-bold text-slate-200 font-mono mt-1">{stats.totalViews}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-3 bg-[#121619] p-4 rounded-2xl border border-white/10">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث بالعنوان أو الرابط أو الوسم...' : 'Search by title, slug, excerpt, tags...'}
              className="w-full ps-9 pe-9 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400/50"
              aria-label="Search posts"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute end-2.5 top-2.5 text-slate-400 hover:text-white p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              {filtered.length}/{posts.length}
            </span>

            <ViewSwitcher
              moduleKey="cms-blog"
              modes={['cards', 'rows']}
              value={{ mode: blogView.mode, density: blogView.density }}
              onChange={(p) => {
                blogView.setMode(p.mode);
                blogView.setDensity(p.density);
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#090b0c] border border-white/15 text-xs text-slate-300 focus:outline-none"
            aria-label="Status filter"
          >
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="published">{language === 'ar' ? 'المنشور فقط (Published)' : 'Published'}</option>
            <option value="draft">{language === 'ar' ? 'المسودات فقط (Draft)' : 'Drafts'}</option>
            <option value="archived">{language === 'ar' ? 'المؤرشف (Archived)' : 'Archived'}</option>
          </select>

          {/* Category Filter */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#090b0c] border border-white/15 text-xs text-slate-300 focus:outline-none"
            aria-label="Category filter"
          >
            <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
            <option value="training">Training</option>
            <option value="performances">Performances</option>
            <option value="journal">Journal</option>
            <option value="nutrition">Nutrition</option>
            <option value="announcements">Announcements</option>
          </select>

          {/* Media Filter */}
          <div className="flex items-center gap-1 bg-[#090b0c] p-0.5 rounded-xl border border-white/15">
            <button
              onClick={() => setMediaFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                mediaFilter === 'all' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setMediaFilter('video')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                mediaFilter === 'video' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>{language === 'ar' ? 'فيديو' : 'Videos'}</span>
            </button>
            <button
              onClick={() => setMediaFilter('gallery')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                mediaFilter === 'gallery' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>{language === 'ar' ? 'معرض صور' : 'Galleries'}</span>
            </button>
          </div>

          {(q || statusFilter !== 'all' || catFilter !== 'all' || mediaFilter !== 'all') && (
            <button
              onClick={() => {
                setQ('');
                setStatusFilter('all');
                setCatFilter('all');
                setMediaFilter('all');
              }}
              className="text-xs text-rose-400 hover:underline px-2"
            >
              {language === 'ar' ? 'إعادة ضبط' : 'Reset filters'}
            </button>
          )}
        </div>
      </div>

      {/* Main List Rendering */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-slate-400 space-y-3">
          <Film className="w-8 h-8 text-slate-500 mx-auto" />
          <p>{language === 'ar' ? 'لم يتم العثور على مقالات مطابقة.' : 'No posts match your filters.'}</p>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500 hover:text-white transition"
          >
            {language === 'ar' ? 'إنشاء أول مقال الآن' : 'Create First Post'}
          </button>
        </div>
      ) : blogView.mode === 'rows' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 bg-[#121619]">
          {filtered.map((p) => {
            const hasVideo = Boolean(p.videoUrl || p.videoEmbedCode);
            const hasGallery = Boolean(p.galleryImages && p.galleryImages.length > 0);
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.02] transition"
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                  <img
                    src={p.coverImageUrl || 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=300&q=80'}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                  {hasVideo && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 fill-white text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        p.status === 'published'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : p.status === 'draft'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{p.category}</span>
                    {hasVideo && (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1 font-mono">
                        <Film className="w-3 h-3" /> Video
                      </span>
                    )}
                    {hasGallery && (
                      <span className="text-[10px] text-blue-400 flex items-center gap-1 font-mono">
                        <ImageIcon className="w-3 h-3" /> {p.galleryImages?.length} photos
                      </span>
                    )}
                  </div>

                  <span className="block font-semibold text-white truncate mt-1">
                    {language === 'ar' ? p.titleAr || p.title : p.title}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    /{p.slug} • {p.readingMinutes} min • {p.authorName}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">{p.views} views</span>

                  <button
                    onClick={() => setPreviewPost(p)}
                    className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white"
                    title="Live Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-slate-200 hover:text-white hover:border-white/30"
                  >
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </button>

                  <button
                    onClick={() => handleTogglePublish(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      p.status === 'published'
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                        : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                  >
                    {p.status === 'published' ? (language === 'ar' ? 'إلغاء النشر' : 'Unpublish') : (language === 'ar' ? 'نشر' : 'Publish')}
                  </button>

                  <button
                    onClick={() => setDeletingPost(p)}
                    className="p-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 text-red-400 hover:bg-red-950/30"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const hasVideo = Boolean(p.videoUrl || p.videoEmbedCode);
            const hasGallery = Boolean(p.galleryImages && p.galleryImages.length > 0);
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-[#121619] overflow-hidden flex flex-col justify-between hover:border-white/25 transition group shadow-md"
              >
                {/* Card Media Preview */}
                <div className="relative aspect-video w-full bg-black overflow-hidden">
                  <img
                    src={p.coverImageUrl || 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=600&q=80'}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shadow ${
                        p.status === 'published'
                          ? 'bg-emerald-500 text-black'
                          : p.status === 'draft'
                          ? 'bg-amber-500 text-black'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {p.status}
                    </span>

                    {hasVideo && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center gap-1 shadow">
                        <Film className="w-2.5 h-2.5" /> Video
                      </span>
                    )}

                    {hasGallery && (
                      <span className="px-2 py-0.5 rounded-full bg-black/75 text-blue-300 border border-blue-400/30 text-[9px] font-mono flex items-center gap-1">
                        <ImageIcon className="w-2.5 h-2.5" /> {p.galleryImages?.length}
                      </span>
                    )}
                  </div>

                  <span className="absolute bottom-2 end-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-white/90">
                    {p.views} views
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-rose-400 font-mono block">
                      {p.category}
                    </span>
                    <h3 className="font-semibold text-white leading-snug line-clamp-2 mt-1">
                      {language === 'ar' ? p.titleAr || p.title : p.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {language === 'ar' ? p.excerptAr || p.excerpt : p.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                      {p.authorName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewPost(p)}
                        className="p-1.5 rounded-lg border border-white/10 hover:border-white/25 text-slate-300 hover:text-white"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2.5 py-1 rounded-lg border border-white/15 text-xs text-slate-200 hover:text-white hover:border-white/30"
                      >
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </button>

                      <button
                        onClick={() => handleTogglePublish(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          p.status === 'published'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {p.status === 'published' ? (language === 'ar' ? 'مسودة' : 'Draft') : (language === 'ar' ? 'نشر' : 'Publish')}
                      </button>

                      <button
                        onClick={() => setDeletingPost(p)}
                        className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-950/30"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL POST EDITOR MODAL */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Blog post editor"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#121619] border border-white/15 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1012]">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Film className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editing.id ? (language === 'ar' ? 'تعديل المقال والماستركلاس' : 'Edit Post & Masterclass') : (language === 'ar' ? 'إنشاء مقال / ماستركلاس جديد' : 'New Post & Masterclass')}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {editing.slug ? `/${editing.slug}` : 'Auto-generated slug'}
                  </span>
                </div>
              </div>

              {/* Language Switcher for Editor */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/15">
                  <button
                    onClick={() => setEditorLang('en')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      editorLang === 'en' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English (EN)
                  </button>
                  <button
                    onClick={() => setEditorLang('ar')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      editorLang === 'ar' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    عربي (AR)
                  </button>
                </div>

                <button
                  onClick={() => setEditing(null)}
                  className="p-1.5 rounded-full border border-white/15 text-slate-400 hover:text-white hover:border-white/30"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editor Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 py-2.5 bg-black/30 border-b border-white/10 overflow-x-auto text-xs">
              <button
                onClick={() => setEditorTab('content')}
                className={`px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                  editorTab === 'content'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'النصوص والمحتوى' : 'Content & Texts'}</span>
              </button>

              <button
                onClick={() => setEditorTab('video')}
                className={`px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                  editorTab === 'video'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تضمين الفيديو (Iframe Video)' : 'Embedded Video (Iframe)'}</span>
                {(editing.videoUrl || editing.videoEmbedCode) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                )}
              </button>

              <button
                onClick={() => setEditorTab('gallery')}
                className={`px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                  editorTab === 'gallery'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'معرض الصور والغلاف' : 'Cover & Photo Gallery'}</span>
                {editing.galleryImages && editing.galleryImages.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-500/30 text-[10px] text-blue-300">
                    {editing.galleryImages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setEditorTab('settings')}
                className={`px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition ${
                  editorTab === 'settings'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'التصنيف والوسوم والنشر' : 'Taxonomy & Settings'}</span>
              </button>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* TAB 1: Content & Texts */}
              {editorTab === 'content' && (
                <div className="space-y-4">
                  {editorLang === 'en' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                          Article Title (English) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          value={editing.title || ''}
                          onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                          placeholder="e.g. Masterclass: Pointe Shoe Fitting & Foot Articulation"
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                          Short Excerpt / Lead (English) <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                          value={editing.excerpt || ''}
                          onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                          rows={2}
                          placeholder="Brief summary appearing on cards and search results..."
                          className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs uppercase text-slate-400 font-mono">
                            Full Article Content (English Markdown) <span className="text-rose-400">*</span>
                          </label>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span>Markdown supported (## Header, - List, **bold**)</span>
                          </div>
                        </div>

                        {/* Quick markdown helper bar */}
                        <div className="flex items-center gap-1.5 p-1.5 bg-black/40 border border-white/10 rounded-t-xl text-xs">
                          <button
                            type="button"
                            onClick={() => setEditing({ ...editing, content: (editing.content || '') + '\n\n## Section Heading\n' })}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing({ ...editing, content: (editing.content || '') + '\n\n### Subheading\n' })}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300"
                          >
                            H3
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing({ ...editing, content: (editing.content || '') + ' **bold text** ' })}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-bold"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing({ ...editing, content: (editing.content || '') + '\n- Bullet item\n- Bullet item\n' })}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300"
                          >
                            List
                          </button>
                        </div>

                        <textarea
                          value={editing.content || ''}
                          onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                          rows={10}
                          placeholder="Write the comprehensive masterclass curriculum notes or article here..."
                          className="w-full px-4 py-3 rounded-b-xl bg-white/5 border border-white/15 border-t-0 text-white text-xs leading-relaxed font-mono focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4" dir="rtl">
                      <div>
                        <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                          عنوان المقال (باللغة العربية) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          value={editing.titleAr || ''}
                          onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })}
                          placeholder="مثال: ماستركلاس قياس حذاء البوانت والتحكم بمشط القدم"
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                          المقتطف الترويجي (باللغة العربية) <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                          value={editing.excerptAr || ''}
                          onChange={(e) => setEditing({ ...editing, excerptAr: e.target.value })}
                          rows={2}
                          placeholder="ملخص موجز يظهر في البطاقات ومحركات البحث..."
                          className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                          المحتوى الكامل (باللغة العربية) <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                          value={editing.contentAr || ''}
                          onChange={(e) => setEditing({ ...editing, contentAr: e.target.value })}
                          rows={10}
                          placeholder="اكتب تفاصيل الماستركلاس والشرح التقني هنا..."
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-xs leading-relaxed focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Embedded Video with Iframe */}
              {editorTab === 'video' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-3">
                    <Film className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-rose-300">
                        {language === 'ar'
                          ? 'تضمين فيديو الماستركلاس عبر رابط أو كود Iframe'
                          : 'Embed Masterclass Video via Direct URL or Iframe Code'}
                      </p>
                      <p className="text-rose-200/80 leading-relaxed">
                        {language === 'ar'
                          ? 'يمكنك وضع رابط مباشر من YouTube أو Vimeo أو لصق كود <iframe> كاملاً من مزود الفيديو. سيعرض النظام الفيديو بدقة 16:9 مع إمكانية التشغيل داخل لوحة تحكم العميل.'
                          : 'Paste a YouTube / Vimeo link OR a raw <iframe> embed tag. The platform renders a responsive 16:9 theater player with fullscreen capabilities in the client dashboard.'}
                      </p>
                    </div>
                  </div>

                  {/* Input 1: Video URL */}
                  <div>
                    <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                      Option A: Video URL (YouTube, Vimeo, MP4)
                    </label>
                    <input
                      value={editing.videoUrl || ''}
                      onChange={(e) => setEditing({ ...editing, videoUrl: e.target.value })}
                      placeholder="e.g. https://www.youtube.com/watch?v=kY0wU9f4f_8 or https://vimeo.com/123456"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-rose-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Supports: https://youtu.be/..., https://www.youtube.com/watch?v=..., https://vimeo.com/...
                    </span>
                  </div>

                  {/* Input 2: Raw Iframe Embed Code */}
                  <div>
                    <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                      Option B: Custom Iframe Embed Code (Raw HTML &lt;iframe&gt;)
                    </label>
                    <textarea
                      value={editing.videoEmbedCode || ''}
                      onChange={(e) => setEditing({ ...editing, videoEmbedCode: e.target.value })}
                      rows={3}
                      placeholder='<iframe width="560" height="315" src="https://www.youtube.com/embed/..." frameborder="0" allowfullscreen></iframe>'
                      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  {/* LIVE IFRAME PREVIEW */}
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-mono text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                        <span>Live Video Embed Preview</span>
                      </span>
                      {liveVideoPreviewSrc && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Embed Ready
                        </span>
                      )}
                    </div>

                    {liveVideoPreviewSrc ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-rose-500/40 bg-black shadow-xl">
                        <iframe
                          src={liveVideoPreviewSrc}
                          title="Video Preview"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center text-xs text-slate-500 p-6 text-center">
                        <Film className="w-8 h-8 text-slate-600 mb-2" />
                        <p>No video embed configured yet.</p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Enter a YouTube URL, Vimeo link, or paste an &lt;iframe&gt; code above to test playback.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Cover & Photo Gallery */}
              {editorTab === 'gallery' && (
                <div className="space-y-6">
                  {/* Cover Image */}
                  <div>
                    <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                      Main Cover Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={editing.coverImageUrl || ''}
                        onChange={(e) => setEditing({ ...editing, coverImageUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    {editing.coverImageUrl && (
                      <div className="mt-3 relative h-44 rounded-xl overflow-hidden border border-white/15 bg-black w-full max-w-md">
                        <img
                          src={editing.coverImageUrl}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => ((e.target as HTMLImageElement).src = '')}
                        />
                      </div>
                    )}
                  </div>

                  {/* Multi-Photo Gallery Section */}
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-blue-400" />
                          <span>{language === 'ar' ? 'معرض صور الكواليس والمسرح' : 'Behind The Scenes & Rehearsal Gallery'}</span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          {language === 'ar'
                            ? 'أضف صور عالية الجودة تعرض في معرض الصور مع ميزة التكبير (Lightbox).'
                            : 'Add high-resolution photographs displayed in the interactive client gallery & lightbox.'}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {editing.galleryImages?.length || 0} Photos
                      </span>
                    </div>

                    {/* Add Photo Input */}
                    <div className="flex gap-2">
                      <input
                        value={newGalleryUrl}
                        onChange={(e) => setNewGalleryUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddGalleryImage();
                          }
                        }}
                        placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-rose-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddGalleryImage}
                        className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold hover:bg-blue-500 hover:text-white transition flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Photo</span>
                      </button>
                    </div>

                    {/* Gallery Thumbnails List */}
                    {editing.galleryImages && editing.galleryImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        {editing.galleryImages.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="group relative rounded-xl overflow-hidden border border-white/15 bg-black h-28"
                          >
                            <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                              <span className="text-[10px] text-white font-mono bg-black/70 px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(idx)}
                                className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
                                title="Remove photo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-white/10 text-center text-xs text-slate-500">
                        No gallery photos attached yet. Paste URLs above to add to the gallery.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Taxonomy, SEO & Settings */}
              {editorTab === 'settings' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Slug */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs uppercase text-slate-400 font-mono">
                          URL Slug (unique)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (editing.title) setEditing({ ...editing, slug: slugify(editing.title) });
                          }}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Auto from Title
                        </button>
                      </div>
                      <input
                        value={editing.slug || ''}
                        onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                        placeholder="e.g. pointe-shoe-masterclass"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                        Category
                      </label>
                      <select
                        value={editing.category || 'training'}
                        onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#090b0c] border border-white/15 text-white text-xs focus:outline-none"
                      >
                        <option value="training">training</option>
                        <option value="performances">performances</option>
                        <option value="journal">journal</option>
                        <option value="nutrition">nutrition</option>
                        <option value="announcements">announcements</option>
                      </select>
                    </div>

                    {/* Author (EN) */}
                    <div>
                      <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                        Author Name (EN)
                      </label>
                      <input
                        value={editing.authorName || 'Étoile Editorial'}
                        onChange={(e) => setEditing({ ...editing, authorName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
                      />
                    </div>

                    {/* Author (AR) */}
                    <div>
                      <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                        اسم الكاتب (عربي)
                      </label>
                      <input
                        value={editing.authorNameAr || 'هيئة تحرير إتوال'}
                        onChange={(e) => setEditing({ ...editing, authorNameAr: e.target.value })}
                        dir="rtl"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
                      />
                    </div>

                    {/* Reading Minutes */}
                    <div>
                      <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                        Estimated Reading Time (Minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={editing.readingMinutes || 5}
                        onChange={(e) => setEditing({ ...editing, readingMinutes: parseInt(e.target.value, 10) || 5 })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs uppercase text-slate-400 font-mono mb-1">
                        Publication Status
                      </label>
                      <select
                        value={editing.status || 'draft'}
                        onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#090b0c] border border-white/15 text-white text-xs focus:outline-none"
                      >
                        <option value="draft">Draft (hidden from client)</option>
                        <option value="published">Published (live in client portal)</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {/* Featured Toggle */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Featured Masterclass / Post
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Pin to the prominent hero banner in both Client Portal and Blog Catalog.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editing.featured}
                        onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>
                  </div>

                  {/* Tags Manager */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase text-slate-400 font-mono">
                      Tags & Keywords
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Type tag and press Enter or comma..."
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                      >
                        Add Tag
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(editing.tags || []).map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1.5"
                        >
                          <span>#{t}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0d1012]">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl border border-white/15 text-xs text-slate-300 hover:text-white hover:border-white/30"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                >
                  {isSaving ? 'Saving...' : language === 'ar' ? 'حفظ كمسودة' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'حفظ ونشر الآن' : 'Save & Publish Live'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE POST PREVIEW MODAL */}
      {previewPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Post preview"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0e1113] border border-brand-gold/40 shadow-2xl overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/60">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold font-mono uppercase">
                  {previewPost.category}
                </span>
                <span className="text-xs text-slate-400">/{previewPost.slug}</span>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`/blog/${previewPost.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-gold hover:underline flex items-center gap-1"
                >
                  <span>Open in Client Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() => setPreviewPost(null)}
                  className="p-1 rounded-full border border-white/20 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <h2 className="font-serif text-3xl sm:text-4xl text-[#fdf1c2]">
                {language === 'ar' ? previewPost.titleAr : previewPost.title}
              </h2>

              <p className="text-sm text-slate-300 italic border-s-2 border-brand-gold ps-4">
                {language === 'ar' ? previewPost.excerptAr : previewPost.excerpt}
              </p>

              {/* Embedded Video Preview */}
              {(previewPost.videoUrl || previewPost.videoEmbedCode) && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-brand-gold/40 bg-black shadow-xl">
                  {previewPost.videoEmbedCode && previewPost.videoEmbedCode.includes('<iframe') ? (
                    <div
                      className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                      dangerouslySetInnerHTML={{ __html: previewPost.videoEmbedCode }}
                    />
                  ) : previewPost.videoUrl ? (
                    <iframe
                      src={
                        extractYouTubeId(previewPost.videoUrl)
                          ? `https://www.youtube-nocookie.com/embed/${extractYouTubeId(previewPost.videoUrl)}`
                          : previewPost.videoUrl
                      }
                      title="Preview video"
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : null}
                </div>
              )}

              {/* Body */}
              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed space-y-3 font-sans">
                {language === 'ar' ? previewPost.contentAr : previewPost.content}
              </div>

              {/* Gallery Preview */}
              {previewPost.galleryImages && previewPost.galleryImages.length > 0 && (
                <div className="pt-6 border-t border-white/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase text-brand-gold">
                    Attached Photo Gallery ({previewPost.galleryImages.length} images)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {previewPost.galleryImages.map((img, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/15 bg-black">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPost && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#121619] border border-red-500/30 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Delete Post Confirmation</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <span className="text-white font-semibold font-mono">"{deletingPost.title}"</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setDeletingPost(null)}
                className="px-4 py-2 rounded-xl border border-white/15 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePost(false)}
                className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30"
              >
                Archive
              </button>
              <button
                onClick={() => handleDeletePost(true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
