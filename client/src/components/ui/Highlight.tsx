import React, { useMemo } from 'react';

/** Highlights case-insensitive matches of `needle` inside `text` (rows-mode lists). */
export const Highlight: React.FC<{ text: string; needle: string; className?: string }> = ({
  text,
  needle,
  className = 'bg-brand-gold/30 text-inherit rounded px-px',
}) => {
  const parts = useMemo(() => {
    const q = needle.trim();
    if (!q) return [text];
    const out: string[] = [];
    const lower = text.toLowerCase();
    const lq = q.toLowerCase();
    let i = 0;
    for (;;) {
      const j = lower.indexOf(lq, i);
      if (j < 0) {
        out.push(text.slice(i));
        break;
      }
      out.push(text.slice(i, j));
      out.push(text.slice(j, j + q.length));
      i = j + q.length;
    }
    return out;
  }, [text, needle]);

  const q = needle.trim();
  if (!q) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={className}>
            {p}
          </mark>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
};
