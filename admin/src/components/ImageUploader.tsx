import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, Link as LinkIcon, AlertCircle, Loader2, Check } from 'lucide-react';
import { processImageFile, isValidImageSrc } from '../utils/imageUpload';

interface ImageUploaderProps {
  value?: string | null;
  onChange: (dataUrlOrUrl: string) => void;
  onRemove?: () => void;
  label?: string;
  description?: string;
  shape?: 'circle' | 'rounded';
  size?: 'sm' | 'md' | 'lg';
  showUrlToggle?: boolean;
  disabled?: boolean;
  optionalBadge?: boolean;
  language?: 'en' | 'ar';
  defaultFallback?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  onRemove,
  label,
  description,
  shape = 'circle',
  size = 'md',
  showUrlToggle = true,
  disabled = false,
  optionalBadge = true,
  language = 'en',
  defaultFallback = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
}) => {
  const isRtl = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const currentImage = value && isValidImageSrc(value) ? value : null;
  const displayImage = currentImage || defaultFallback;

  // Size styling maps
  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-20 h-20 sm:w-24 sm:h-24',
    lg: 'w-28 h-28 sm:w-32 sm:h-32',
  }[size];

  const handleFileSelect = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const dataUrl = await processImageFile(file, {
        maxDimension: 800,
        quality: 0.85,
        outputFormat: 'image/jpeg',
      });
      onChange(dataUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || (isRtl ? 'حدث خطأ أثناء قراءة الصورة' : 'Failed to process image file.'));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    if (!isValidImageSrc(urlInput.trim())) {
      setErrorMsg(isRtl ? 'رابط الصورة غير صالح (يجب أن يبدأ بـ http:// أو https://)' : 'Invalid image URL format.');
      return;
    }
    setErrorMsg(null);
    onChange(urlInput.trim());
    setUrlInput('');
    setShowUrlBox(false);
  };

  const handleRemove = () => {
    setErrorMsg(null);
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-2">
      {/* Label & Optional Tag */}
      {(label || optionalBadge) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span>{label}</span>
            </label>
          )}
          {optionalBadge && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
              {isRtl ? 'اختياري' : 'Optional'}
            </span>
          )}
        </div>
      )}

      {description && <p className="text-[11px] text-slate-400 leading-snug">{description}</p>}

      {/* Main Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl border transition ${
          isDragging
            ? 'border-rose-400 bg-rose-500/10 shadow-lg shadow-rose-500/10'
            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        {/* Avatar Preview with Camera Button */}
        <div className="relative group flex-shrink-0">
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`${sizeClasses} ${
              shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
            } overflow-hidden border-2 border-rose-500/40 group-hover:border-rose-400 transition shadow-md bg-slate-900 cursor-pointer relative`}
            title={isRtl ? 'اضغط لرفع صورة' : 'Click to upload photo'}
          >
            <img
              src={displayImage}
              alt="Avatar preview"
              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            />

            {/* Hover overlay with camera icon */}
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white p-1">
              <Camera className="w-5 h-5 text-rose-300 mb-0.5" />
              <span className="text-[9px] font-semibold text-center leading-none">
                {isRtl ? 'تغيير' : 'Change'}
              </span>
            </div>

            {/* Processing spinner overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-rose-300">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md border-2 border-[#111622] transition cursor-pointer"
            title={isRtl ? 'اختيار ملف صورة' : 'Browse image'}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls & Info */}
        <div className="flex-1 min-w-0 space-y-2 text-center sm:text-start">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              disabled={disabled || isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isRtl ? 'رفع صورة من الجهاز' : 'Upload Image File'}</span>
            </button>

            {currentImage && (
              <button
                type="button"
                disabled={disabled || isProcessing}
                onClick={handleRemove}
                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 hover:text-red-300 text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                title={isRtl ? 'حذف الصورة (الرجوع للصورة الافتراضية)' : 'Remove photo (reset to default)'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isRtl ? 'حذف' : 'Remove'}</span>
              </button>
            )}

            {showUrlToggle && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowUrlBox(!showUrlBox)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{isRtl ? 'أو رابط ويب' : 'Or Image URL'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            {isRtl
              ? 'صيغ مدعومة: JPG, PNG, WebP (بحد أقصى 15 ميجابايت). يتم تحسين الحجم تلقائياً.'
              : 'Accepts JPG, PNG, WebP (max 15MB). Automatically resized & optimized.'}
          </p>

          {/* URL Input Box */}
          {showUrlBox && (
            <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 form-gold-input px-3 py-1.5 rounded-xl text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تطبيق' : 'Apply'}</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
