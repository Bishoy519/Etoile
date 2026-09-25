-- Provider-agnostic online pay-link records (Paymob / Fawry / InstaPay).
-- Additive and idempotent (safe to re-run).

CREATE TABLE IF NOT EXISTS "PaymentLink" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "invoiceId" TEXT,
    "studentId" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "url" TEXT NOT NULL,
    "providerRef" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentLink_ref_key" ON "PaymentLink"("ref");

CREATE INDEX IF NOT EXISTS "PaymentLink_status_idx" ON "PaymentLink"("status");

CREATE INDEX IF NOT EXISTS "PaymentLink_studentId_idx" ON "PaymentLink"("studentId");
