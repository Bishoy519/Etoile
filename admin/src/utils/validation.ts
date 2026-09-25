/**
 * Shared validation helpers for Admin dashboard forms.
 * Every create/edit form should use these so empty submits,
 * bad emails/phones and out-of-range numbers are rejected
 * with a clear message instead of silent return or dummy fallback.
 */

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

export const isNonEmpty = (v: unknown): boolean =>
  typeof v === 'string' ? v.trim().length > 0 : v !== undefined && v !== null && v !== '';

export function requireText(value: string | undefined | null, fieldLabel: string, minLen = 1): ValidationResult {
  if (!value || value.trim().length < minLen) {
    return { ok: false, message: `${fieldLabel} is required${minLen > 1 ? ` (min ${minLen} chars)` : ''}.` };
  }
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function validateEmailOptional(email: string | undefined | null): ValidationResult {
  if (!email || !email.trim()) return { ok: true };
  if (!EMAIL_RE.test(email.trim())) return { ok: false, message: 'Email address looks invalid.' };
  return { ok: true };
}

export function validateEmailRequired(email: string | undefined | null, fieldLabel = 'Email'): ValidationResult {
  const r = requireText(email, fieldLabel);
  if (!r.ok) return r;
  return validateEmailOptional(email);
}

// Accepts +digits, spaces, dashes, parentheses. Requires 7-15 digits.
const PHONE_DIGITS_RE = /[0-9]/g;
export function validatePhoneOptional(phone: string | undefined | null): ValidationResult {
  if (!phone || !phone.trim()) return { ok: true };
  const digits = (phone.match(PHONE_DIGITS_RE) || []).length;
  if (digits < 7 || digits > 15) return { ok: false, message: 'Phone number must contain 7–15 digits.' };
  if (!/^[+\d][\d\s\-().]*$/.test(phone.trim())) return { ok: false, message: 'Phone number contains invalid characters.' };
  return { ok: true };
}

export function validatePhoneRequired(phone: string | undefined | null, fieldLabel = 'Phone'): ValidationResult {
  const r = requireText(phone, fieldLabel);
  if (!r.ok) return r;
  return validatePhoneOptional(phone);
}

export function validateAge(age: unknown): ValidationResult {
  const n = Number(age);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, message: 'Age must be a whole number.' };
  if (n < 3 || n > 80) return { ok: false, message: 'Age must be between 3 and 80.' };
  return { ok: true };
}

export function validatePositiveNumber(value: unknown, fieldLabel: string, opts?: { allowZero?: boolean; max?: number }): ValidationResult {
  const n = Number(value);
  if (!Number.isFinite(n)) return { ok: false, message: `${fieldLabel} must be a number.` };
  if (!opts?.allowZero && n <= 0) return { ok: false, message: `${fieldLabel} must be greater than 0.` };
  if (opts?.allowZero && n < 0) return { ok: false, message: `${fieldLabel} cannot be negative.` };
  if (opts?.max !== undefined && n > opts.max) return { ok: false, message: `${fieldLabel} cannot exceed ${opts.max}.` };
  return { ok: true };
}

export function validatePrice(value: unknown, fieldLabel = 'Price'): ValidationResult {
  return validatePositiveNumber(value, fieldLabel, { max: 1_000_000 });
}

export function validateTimeRange(start: string, end: string): ValidationResult {
  if (!start || !end) return { ok: true };
  if (start >= end) return { ok: false, message: 'End time must be after start time.' };
  return { ok: true };
}

export function validateNotPastDate(dateStr: string | undefined | null, fieldLabel = 'Date'): ValidationResult {
  if (!dateStr) return { ok: true };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { ok: false, message: `${fieldLabel} is not a valid date.` };
  d.setHours(0, 0, 0, 0);
  if (d < today) return { ok: false, message: `${fieldLabel} cannot be in the past.` };
  return { ok: true };
}

export function validateBarcodeFormat(code: string | undefined | null): ValidationResult {
  if (!code || !code.trim()) return { ok: false, message: 'Barcode cannot be empty.' };
  const clean = code.trim().toUpperCase();
  if (clean.length < 4 || clean.length > 32) return { ok: false, message: 'Barcode must be 4–32 characters.' };
  if (!/^[A-Z0-9\-_]+$/.test(clean)) return { ok: false, message: 'Barcode may only contain letters, digits, - and _.' };
  return { ok: true };
}

export function validateUrlOptional(url: string | undefined | null, fieldLabel = 'URL'): ValidationResult {
  if (!url || !url.trim()) return { ok: true };
  try {
    const u = new URL(url.trim());
    if (!['http:', 'https:'].includes(u.protocol)) return { ok: false, message: `${fieldLabel} must start with http(s)://.` };
    return { ok: true };
  } catch {
    return { ok: false, message: `${fieldLabel} is not a valid URL.` };
  }
}

/** Run a list of checks, return first failure (or ok). */
export function firstError(...checks: ValidationResult[]): ValidationResult {
  for (const c of checks) if (!c.ok) return c;
  return { ok: true };
}
