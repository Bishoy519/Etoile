# Étoile OS — Roadmap Execution & Production Readiness

All P0/P1 items from the comprehensive architectural audit and product roadmap are implemented and verified in code.

---

## 1. Backend Domain APIs (NestJS :3001, prefix /api)

- `GET /api/analytics/overview` — counts, money (tuition/retail/inflow/outflow/net/margin/AR), engagement (utilization, funnel, SLA), programMix
- `GET /api/analytics/trend?range=30D|90D|12M&metric=revenue|attendance|enrollment` — bucketed points + total (real distribution, projection fallback on empty DB)
- `GET /api/analytics/attention` — lowQuota (≤2), debtors, expiringSoon (7d), SLA trials >48h, pendingReminders
- `GET /api/analytics/forecast` — M+1..3 low/base/high
- `GET /api/payments/methods` — paymob/fawry/instapay capability + mode (live vs sandbox-mock)
- `POST /api/payments/paylink {invoiceId?, studentId?, amount, provider?, phone?}` — returns {url, ref, instructions}
- `GET /api/payments/paylinks` / `:id` — list/inspect (in-memory, last 100)
- `POST /api/payments/webhook {ref|providerRef|id, status?, amount?, invoiceId?}` — idempotent reconcile → PaymentTransaction + invoice balances
- `GET /api/ops/renewal-queue` — no_package/expired/low_quota/expiring_soon sorted high→medium
- `POST /api/ops/renew/:studentId {planName?, maxSessions?, price?, durationDays?}` — creates active StudentSubscription
- `GET /api/ops/schedule-conflicts` — room + instructor overlaps by day/time
- `GET /api/ops/funnel-sla` — new_inquiry/trial_scheduled older than 48h
- `POST /api/eta/submit {invoiceId, invoice?}` — builds ETA eReceipt stub (draft until ETA_API_KEY set)
- `GET /api/eta/docs` — submitted docs
- `GET /api/branches` + `GET /api/branches/academic-years` — DB when migrated, fallback Zamalek/New Cairo + current year
- `POST /api/attendance/checkin` now accepts `{idempotencyKey?, sessionId?}` — 10-min idempotent replay + existing 60s double-scan guard
- `GET /api/health/detailed` — db, latency, uptime, memory, integrations status, counts
- `POST /api/auth/card-login` — Unified Student & Parent authentication supporting student barcode (`ETOILE-XXXXXX`), student ID (`STU-XXX`), and parent email/phone with student password. *(Legacy passwordless `/api/auth/family/login` permanently removed).*

**Auth & RBAC**: All new routes use `JwtAuthGuard` + `RolesGuard`. Analytics: `superadmin/owner/receptionist/instructor`. Payments/Ops renew: `superadmin/owner/receptionist`. ETA: `superadmin/owner`.

---

## 2. Frontend Portals & UI Refinement

### Admin ERP (:5174)
- `src/hooks/useAnalytics.ts` — useAnalyticsOverview/Trend, useAttention, useOps (polling, graceful null)
- `src/utils/offlineQueue.ts` — localStorage queue {key, barcode, method}, enqueue/flushQueue/queueLength, idempotency keys
- `FastTrackCheckIn` — online/offline banner, pending count, Sync now, auto-flush every 8s + on reconnect, offline enqueue path
- `AnalyticsHub` — live server trend with `Live server / Local projection` badge, synthetic fallback
- `ScheduleBoard` — conflicts banner from `/api/ops/schedule-conflicts`
- `PayLinkButton` — provider tabs paymob/fawry/instapay, create/copy/WhatsApp send, offline mock fallback
- `InvoicingAndArView` — Pay-link details per unpaid invoice + ETA e-receipt submit button
- `RenewalQueue` — live `/api/ops/renewal-queue` with local fallback, Nudge via WhatsApp; embedded in Dashboard Needs Attention
- `App.tsx` — React.lazy code-split across 22 operational tabs + Suspense shimmer (initial bundle ~105kB, heavy tabs 20-95kB chunks)
- `public/manifest.webmanifest` + index.html PWA meta (installable kiosk)

### Client & Student Portal (:5173)
- `AppHeader.tsx` — Aurora floating glassmorphic header with scroll pill adaptation, golden breathing emblem, and mobile drawer.
- `StageAtmosphereCanvas.tsx` — Interactive canvas particle simulation with theatre dust physics and golden ambient stage spotlights.
- `OnboardingChecklist.tsx` — Interactive onboarding stepper guiding new dancers and parents through card verification, password setup, syllabus exploration, and WhatsApp connection.
- `ClientLoginPage.tsx` — Streamlined multi-modal login with unified student & parent credential inputs and demo cards drawer.

---

## 3. Data & Environment

- `prisma/schema.prisma` — 56 models: `Branch`, `AcademicYear`, `StaffShift`, `StaffLeave`, `Category`, `Group`, `BlogPost`, `EtaDocument`, `Referral`, `PromoCode`, `PaymentLink`, `RefreshToken`. Run: `npx prisma migrate deploy`
- `prisma/seed.ts` — Seeds multi-campus (`ZAM`, `NCAIRO`), academic years, faculty, demo cards, and double-entry accounting fixtures.
- `.env.docker.example` — `PUBLIC_APP_URL`, `PAYMOB_*`, `FAWRY_*`, `ETA_*`, `SENTRY_DSN`, `WA_PROVIDER`.

---

## 4. Production Go-Live Checklist (Owner Operations)

1. `npx prisma migrate deploy && npm run seed` (server/)
2. Set Paymob: `PAYMOB_API_KEY`/`HMAC`/`INTEGRATION_ID` → `methods()` flips to live.
3. Set Fawry: `FAWRY_MERCHANT`/`SECURITY_KEY` → same.
4. Set ETA: `ETA_API_KEY`/`TAX_ID`/`ISSUER` → `submit()` flips draft → submitted.
5. Verification:
   - Create invoice → Pay-link → webhook paid → invoice paid + PaymentTransaction.
   - Attendance kiosk offline → online flush (idempotency key prevents double deduction).
   - Parent login with student barcode/email + password → family profile + invoices.
6. Monitoring: `GET /api/health/detailed`, Sentry DSN, automated pg backup cron.

---

## 5. Automated Verification Status
- Full audit runner test suite (6 suites, 70+ assertions) passes cleanly:
  - `node server/src/api-security-audit.test.mjs`
  - `node server/src/card-auth-schedule-audit.test.mjs`
  - `node server/src/courses-whatsapp-audit.test.mjs`
  - `node server/src/attendance-receipt-ifrs15-audit.test.mjs`
  - `node server/src/end-to-end-lifecycle.test.mjs`
  - `node server/src/security-hardening-audit.test.mjs`

