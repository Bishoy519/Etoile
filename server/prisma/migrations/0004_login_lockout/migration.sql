-- Per-account login brute-force protection (10 strikes → 15-minute lock).
-- Additive and idempotent (safe to re-run).

ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "loginLockedUntil" TIMESTAMP(3);

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "loginLockedUntil" TIMESTAMP(3);
