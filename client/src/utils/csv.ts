/**
 * Shared CSV export.
 * - Prepends a UTF-8 BOM so Arabic text opens correctly in Excel.
 * - Use csvFilename() for the standard `etoile-{module}-{scope}-{YYYY-MM-DD}.csv` shape.
 * - recordExportLog() keeps a lightweight local log (who/when/what/rows) for PII
 *   accountability; high-PII pages should also call logCrmAction().
 */

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/\r?\n/g, ' ');
  return /[",;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsvText(columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map(cell).join(',')];
  for (const r of rows) {
    lines.push(columns.map((c) => cell(r[c])).join(','));
  }
  return lines.join('\n');
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'export';

export function csvFilename(module: string, scope = ''): string {
  const date = new Date().toISOString().split('T')[0];
  const mid = scope ? `-${slug(scope)}` : '';
  return `etoile-${slug(module)}${mid}-${date}.csv`;
}

export interface ExportLogEntry {
  at: string;
  module: string;
  rows: number;
  filename: string;
}

const LOG_KEY = 'etoile_export_log';

export function recordExportLog(module: string, filename: string, rows: number) {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const log: ExportLogEntry[] = raw ? JSON.parse(raw) : [];
    log.unshift({ at: new Date().toISOString(), module, filename, rows });
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 100)));
  } catch {
    // storage unavailable — export still succeeds
  }
}

export function getExportLog(): ExportLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function exportCsv(
  filename: string,
  columns: string[],
  rows: Record<string, unknown>[],
  opts?: { module?: string; log?: boolean },
) {
  const blob = new Blob(['\uFEFF' + toCsvText(columns, rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
  if (opts?.log !== false) {
    recordExportLog(opts?.module || filename.replace(/\.csv$/, ''), name, rows.length);
  }
}
