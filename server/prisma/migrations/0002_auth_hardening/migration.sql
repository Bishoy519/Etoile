-- Auth hardening: optional family portal PIN + OTP brute-force protection.
-- Additive and idempotent (safe to re-run).

ALTER TABLE "Family" ADD COLUMN IF NOT EXISTS "pinHash" TEXT;

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "otpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "otpLockedUntil" TIMESTAMP(3);

ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "otpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "otpLockedUntil" TIMESTAMP(3);
