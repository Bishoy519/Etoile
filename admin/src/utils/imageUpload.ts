/**
 * Image Upload & Compression Utilities for Étoile Academy Admin
 * Handles client-side proportional resizing and optimization so uploaded
 * photos are crisp, retina-ready, lightweight (~50-120KB), and portable.
 */

export interface ImageProcessingOptions {
  maxDimension?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Validates whether a given string is a valid image source (web URL or data URI)
 */
export function isValidImageSrc(src?: string | null): boolean {
  if (!src || typeof src !== 'string') return false;
  const clean = src.trim();
  if (!clean) return false;
  if (clean.startsWith('data:image/')) return true;
  try {
    const u = new URL(clean);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

/**
 * Compresses an image file client-side into a lightweight data URL.
 * Automatically downscales large images proportionally to fit within maxDimension.
 */
export function processImageFile(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<string> {
  const { maxDimension = 800, quality = 0.85, outputFormat = 'image/jpeg' } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (JPEG, PNG, WebP, etc.).'));
    }

    // Safety limit on raw uploaded file (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      return reject(new Error('The selected image exceeds 15MB. Please choose a smaller file.'));
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file from disk.'));
    };

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('Could not decode image content. File may be corrupted.'));
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Downscale proportionally if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to raw data URL if canvas 2D is unavailable
            return resolve(event.target?.result as string);
          }

          // Use high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill white background for transparent PNGs converted to JPEG
          if (outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL(outputFormat, quality);
          resolve(dataUrl);
        } catch (err) {
          // If canvas fails, fallback to raw reader result
          resolve(event.target?.result as string);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
