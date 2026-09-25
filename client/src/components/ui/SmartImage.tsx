import React from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

/** Lazy, async-decoding image with Unsplash srcset + graceful fallback. No visual change. */
export const SmartImage: React.FC<SmartImageProps> = ({ src, alt, fallbackSrc = '/hero-ballerina.jpg', srcSet: _ignored, ...rest }) => {
  const srcSet = React.useMemo(() => {
    if (!src.includes('images.unsplash.com')) return undefined;
    const [base, query = ''] = src.split('?');
    const params = query
      .split('&')
      .filter(Boolean)
      .filter((p) => !p.startsWith('w='));
    const q = params.length > 0 ? `?${params.join('&')}&` : '?';
    return [200, 400, 800].map((w) => `${base}${q}w=${w} ${w}w`).join(', ');
  }, [src]);

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      srcSet={srcSet}
      sizes="(max-width: 640px) 200px, 400px"
      onError={(e) => {
        const el = e.target as HTMLImageElement;
        if (!el.src.endsWith(fallbackSrc)) el.src = fallbackSrc;
      }}
      {...rest}
    />
  );
};
