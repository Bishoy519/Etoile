import React, { useState, useEffect, useMemo } from 'react';
import { Play, Maximize2, Minimize2, ExternalLink, X, ChevronLeft, ChevronRight, Eye, Film, Image as ImageIcon, Sparkles } from 'lucide-react';
import { SmartImage } from '../ui/SmartImage';

// Safely extract YouTube Video ID
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Safely extract Vimeo Video ID
export function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

// Extract iframe src if raw iframe is passed
export function extractIframeSrc(html: string): string | null {
  if (!html) return null;
  const match = html.match(/src=["'](.*?)["']/);
  return match ? match[1] : null;
}

interface VideoEmbedProps {
  videoUrl?: string | null;
  videoEmbedCode?: string | null;
  title?: string;
  poster?: string;
  className?: string;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({
  videoUrl,
  videoEmbedCode,
  title = 'Ballet Masterclass Video',
  poster,
  className = '',
}) => {
  const [isTheater, setIsTheater] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const embedInfo = useMemo(() => {
    // 1. If explicit iframe embed code was provided
    if (videoEmbedCode && videoEmbedCode.includes('<iframe')) {
      const src = extractIframeSrc(videoEmbedCode);
      if (src) {
        return { type: 'iframe', src };
      }
      return { type: 'raw', html: videoEmbedCode };
    }

    if (!videoUrl) return null;

    const trimmed = videoUrl.trim();

    // 2. Check for YouTube
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      return {
        type: 'iframe',
        src: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`,
        poster: poster || `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      };
    }

    // 3. Check for Vimeo
    const vimeoId = extractVimeoId(trimmed);
    if (vimeoId) {
      return {
        type: 'iframe',
        src: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&color=caa868&title=0&byline=0`,
        poster,
      };
    }

    // 4. Direct video file (mp4, webm)
    if (/\.(mp4|webm|ogg)$/i.test(trimmed)) {
      return { type: 'video', src: trimmed, poster };
    }

    // 5. Fallback URL in iframe
    return { type: 'iframe', src: trimmed, poster };
  }, [videoUrl, videoEmbedCode, poster]);

  if (!embedInfo) return null;

  return (
    <div className={`transition-all duration-300 ${isTheater ? 'my-8 -mx-4 sm:-mx-8 lg:-mx-16 z-20' : 'my-6'} ${className}`}>
      <div className="relative rounded-2xl overflow-hidden border border-brand-gold/40 bg-black/90 shadow-[0_12px_40px_rgba(0,0,0,0.85)] group">
        
        {/* Top Video Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-[#181d20] to-[#0d1012] border-b border-brand-gold/20 text-xs">
          <div className="flex items-center gap-2 text-brand-gold min-w-0">
            <span className="p-1 rounded bg-brand-gold/15 text-brand-gold">
              <Film className="w-3.5 h-3.5" />
            </span>
            <span className="font-serif tracking-wide truncate text-[#fdf1c2]">{title}</span>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold font-mono">
              HD Video
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsTheater(!isTheater)}
              className="p-1.5 rounded-lg border border-brand-gold/25 hover:border-brand-gold text-brand-muted hover:text-brand-gold transition text-[11px] flex items-center gap-1"
              title={isTheater ? 'Normal view' : 'Theater mode'}
              aria-label={isTheater ? 'Exit theater mode' : 'Theater mode'}
            >
              {isTheater ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isTheater ? 'Compact' : 'Theater'}</span>
            </button>
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-brand-gold/25 hover:border-brand-gold text-brand-muted hover:text-brand-gold transition"
                title="Open original video"
                aria-label="Open original video"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Video Player Container */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {!isPlaying && embedInfo.poster ? (
            <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setIsPlaying(true)}>
              <img
                src={embedInfo.poster}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  if (poster) (e.target as HTMLImageElement).src = poster;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Play Masterclass Video"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-brand-gold/90 hover:bg-brand-gold text-black flex items-center justify-center shadow-[0_0_35px_rgba(226,190,104,0.6)] transform group-hover:scale-110 active:scale-95 transition-all"
                >
                  <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-black translate-x-0.5" />
                </button>
                <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between text-xs text-white/90">
                  <span className="bg-black/60 px-3 py-1 rounded-md backdrop-blur border border-white/10 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-brand-gold" />
                    <span>Watch Academy Masterclass</span>
                  </span>
                </div>
              </div>
            </div>
          ) : embedInfo.type === 'video' ? (
            <video
              src={embedInfo.src}
              controls
              autoPlay={isPlaying}
              className="w-full h-full object-contain"
            >
              Your browser does not support the video tag.
            </video>
          ) : embedInfo.type === 'iframe' ? (
            <iframe
              src={embedInfo.src}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
              dangerouslySetInnerHTML={{ __html: embedInfo.html || '' }}
            />
          )}
        </div>

        {/* Subtle gold bottom accent glow */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />
      </div>
    </div>
  );
};

interface ImageGalleryProps {
  images: string[];
  title?: string;
  className?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images = [],
  title = 'Rehearsal & Stage Gallery',
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const validImages = useMemo(() => {
    return Array.isArray(images) ? images.filter((img) => typeof img === 'string' && img.trim().length > 0) : [];
  }, [images]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % validImages.length : null));
      }
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null ? (prev - 1 + validImages.length) % validImages.length : null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, validImages.length]);

  if (validImages.length === 0) return null;

  return (
    <div className={`my-8 space-y-4 ${className}`}>
      {/* Gallery Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-brand-gold/20">
        <div className="flex items-center gap-2 text-brand-gold">
          <ImageIcon className="w-4 h-4" />
          <h3 className="font-serif text-lg text-[#fdf1c2]">{title}</h3>
        </div>
        <span className="text-[11px] font-mono text-brand-gold/80 bg-brand-gold/10 px-2.5 py-0.5 rounded-full border border-brand-gold/30">
          {validImages.length} {validImages.length === 1 ? 'Photograph' : 'Photographs'}
        </span>
      </div>

      {/* Gallery Grid Layout ("in a good way") */}
      {validImages.length === 1 ? (
        <div
          onClick={() => setSelectedIndex(0)}
          className="cursor-pointer group relative rounded-2xl overflow-hidden border border-brand-gold/30 shadow-lg"
        >
          <SmartImage
            src={validImages[0]}
            alt={title}
            className="w-full h-80 sm:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="px-4 py-2 rounded-xl bg-black/70 backdrop-blur border border-brand-gold/40 text-brand-gold text-xs font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4" /> Expand Full Size
            </span>
          </div>
        </div>
      ) : validImages.length === 2 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {validImages.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className="cursor-pointer group relative rounded-2xl overflow-hidden border border-brand-gold/30 h-64 sm:h-72 shadow-md"
            >
              <SmartImage
                src={img}
                alt={`${title} #${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur border border-brand-gold/40 text-brand-gold text-xs flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> View Photo {idx + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {validImages.map((img, idx) => {
            const isFeatured = idx === 0 && validImages.length > 2;
            return (
              <div
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`cursor-pointer group relative rounded-2xl overflow-hidden border border-brand-gold/30 shadow-md ${
                  isFeatured ? 'col-span-2 row-span-2 h-72 sm:h-80' : 'h-36 sm:h-40'
                }`}
              >
                <SmartImage
                  src={img}
                  alt={`${title} #${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-3">
                  <span className="text-[11px] text-[#fdf1c2] flex items-center gap-1">
                    <Eye className="w-3 h-3 text-brand-gold" /> Photo {idx + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {selectedIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image Lightbox"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-6xl flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-serif text-base text-[#fdf1c2] truncate">{title}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                {selectedIndex + 1} / {validImages.length}
              </span>
            </div>
            <button
              onClick={() => setSelectedIndex(null)}
              className="p-2 rounded-full border border-white/20 hover:border-brand-gold bg-black/50 text-white hover:text-brand-gold transition"
              aria-label="Close lightbox"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Image with Previous / Next Controls */}
          <div
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {validImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((selectedIndex - 1 + validImages.length) % validImages.length);
                }}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-brand-gold text-white hover:text-black border border-white/20 hover:border-brand-gold transition shadow-xl"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={validImages[selectedIndex]}
              alt={`${title} #${selectedIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-xl border border-brand-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200"
            />

            {validImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((selectedIndex + 1) % validImages.length);
                }}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-brand-gold text-white hover:text-black border border-white/20 hover:border-brand-gold transition shadow-xl"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {validImages.length > 1 && (
            <div
              className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {validImages.map((thumb, tIdx) => (
                <button
                  key={tIdx}
                  onClick={() => setSelectedIndex(tIdx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    selectedIndex === tIdx
                      ? 'border-brand-gold scale-105 shadow-[0_0_12px_rgba(226,190,104,0.6)]'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
