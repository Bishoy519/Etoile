import { randomInt, randomBytes, createHash } from 'crypto';

/**
 * Resolve the JWT signing secret.
 *
 * Fails fast in production when JWT_SECRET is missing so the API can never
 * boot with a publicly-known fallback key. In non-production environments a
 * clearly-marked development secret is used to keep local setup frictionless.
 */
export function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: JWT_SECRET is missing or too short (>= 32 chars required). ' +
        'Refusing to start in production with an insecure signing key.',
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    '[auth] JWT_SECRET not set — using an insecure DEVELOPMENT-ONLY fallback key. ' +
      'Set a strong JWT_SECRET (>= 32 chars) before deploying.',
  );
  return 'etoile_DEV_ONLY_insecure_fallback_key_do_not_use_in_production';
}

/** Cryptographically secure numeric string of exactly `digits` length (may include leading zeros). */
export function secureNumericCode(digits: number): string {
  let out = '';
  for (let i = 0; i < digits; i++) {
    out += randomInt(0, 10).toString();
  }
  return out;
}

/** Temporary first-login password, e.g. ETOILE-482913 (6-digit space = 900k combos). */
export function generateTemporaryPassword(prefix = 'ETOILE'): string {
  return `${prefix}-${secureNumericCode(6)}`;
}

/** Access-token lifetime in seconds (default 30 min, minimum 60 s). */
export function accessTokenTtlSeconds(): number {
  const raw = Number(process.env.ACCESS_TOKEN_TTL ?? 1800);
  return Number.isFinite(raw) && raw >= 60 ? Math.floor(raw) : 1800;
}

/** Refresh-token lifetime in seconds (default 30 days, minimum 1 h). */
export function refreshTokenTtlSeconds(): number {
  const raw = Number(process.env.REFRESH_TOKEN_TTL ?? 30 * 24 * 3600);
  return Number.isFinite(raw) && raw >= 3600 ? Math.floor(raw) : 30 * 24 * 3600;
}

/** Opaque refresh token: 384 bits of randomness, hex-encoded. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

/** SHA-256 hex digest — the only form of a refresh token ever persisted. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
