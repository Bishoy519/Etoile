import { useCallback, useEffect, useRef, useState } from 'react';

function readParam(key: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
}

function writeParams(patch: Record<string, string>) {
  try {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(patch)) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  } catch {
    // non-browser / sandboxed — ignore
  }
}

/**
 * State synced with a URL query param (shareable + survives reload).
 * Writes are debounced via replaceState so typing doesn't spam history.
 */
export function useQueryParamState(key: string, initial = ''): [string, (v: string) => void] {
  const [value, setValue] = useState(() => readParam(key) ?? initial);
  const timer = useRef<number | undefined>(undefined);

  const set = useCallback(
    (v: string) => {
      setValue(v);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => writeParams({ [key]: v }), 300);
    },
    [key],
  );

  // Adopt external URL changes (back/forward buttons).
  useEffect(() => {
    const onPop = () => {
      const v = readParam(key);
      if (v !== null) setValue(v);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [key]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return [value, set];
}
