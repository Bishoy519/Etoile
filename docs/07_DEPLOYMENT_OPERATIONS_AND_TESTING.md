# 🚀 Étoile Platform — Deployment, Operations & Testing Reference

This document provides complete instructions for configuring, building, containerizing, deploying, operating, and verifying the Étoile Ballet Academy platform in production and staging environments.

---

## 1. System Requirements & Prerequisites

### Infrastructure Requirements:
- **Node.js**: v18.0.0 or higher (LTS v20 recommended)
- **Package Manager**: `npm` v9.0.0+ or `pnpm`
- **Database**: PostgreSQL 14, 15, or 16
- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian 12), macOS, or Windows WSL2
- **Memory**: Minimum 2 GB RAM (4 GB recommended for production builds)
- **Storage**: Minimum 10 GB SSD

---

## 2. Environment Configuration

### 2.1 Backend Environment Variables (`server/.env`)
Create or edit `server/.env`:
```env
# PostgreSQL Connection String (standard connection pooling)
DATABASE_URL="postgresql://root:secret@localhost:5432/etoile?schema=public"

# Cryptographic Secret Key for signing JWT access tokens.
# REQUIRED in production (>= 32 chars) — the API refuses to boot without it.
# Generate: openssl rand -base64 48
JWT_SECRET="change_me_to_a_long_random_secret_min_32_chars"

# Session lifetimes (seconds; defaults shown)
ACCESS_TOKEN_TTL=1800
REFRESH_TOKEN_TTL=2592000

# WhatsApp log redaction (recommended: true in production with a real sender)
OPENWA_REDACT_SECRETS=false

# On-premise WiFi fingerprint for server-side kiosk premise verification
PREMISE_WIFI_BSSID=Etoile-Secure-5G [F4:92:BF:11:80:A2]

# HTTP Listening Port for NestJS Engine
PORT=3001

# Comma-Separated Allowed CORS Origins (Client Portal, Admin ERP)
CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,https://portal.etoileballet.com,https://admin.etoileballet.com"

# Public App Base URL for generated Pay-Links & Password Resets
PUBLIC_APP_URL="http://localhost:5173"
PAYLINK_PORTAL_URL="http://localhost:5173/pay"

# Online Payment Gateway Integrations (Optional / Live)
PAYMOB_API_KEY=""
PAYMOB_HMAC_SECRET=""
PAYMOB_INTEGRATION_ID=""
FAWRY_MERCHANT_CODE=""
FAWRY_SECURITY_KEY=""

# Egyptian Tax Authority (ETA) eReceipt Credentials (Optional / Live)
ETA_TAX_ID=""
ETA_ISSUER_CODE=""
ETA_API_KEY=""
ETA_SANDBOX=true

# Telemetry & Monitoring (Optional)
SENTRY_DSN=""
```

### 2.2 Client Portal Environment (`client/.env`)
Optional overrides for the Client Portal:
```env
VITE_API_URL="http://localhost:3001/api"
```

### 2.3 Admin Portal Environment (`admin/.env`)
Optional overrides for the Admin ERP:
```env
VITE_API_URL="http://localhost:3001/api"
```

---

## 3. Database Initialization & Maintenance

### 3.1 Applying Schema Migrations
Versioned migrations live in `server/prisma/migrations/` and are the only supported path (the API boots against them in CI and Docker):
```bash
cd server
npx prisma migrate deploy
```
> Legacy note: `npx prisma db push` was used before migration history existed (`0001_init` baselines that era). New schema changes must ship as new migration files, never as pushes.

### 3.2 Seeding Initial Conservatory Data
Populates staff accounts, student dancers, subscription packages, retail boutique inventory, courses, scheduled sessions, and CMS templates:
```bash
cd server
npx prisma db seed
```

### 3.3 Visual Database Inspection (Prisma Studio)
To visually inspect or edit database tables through a GUI:
```bash
cd server
npx prisma studio
```
Opens Prisma Studio on [http://localhost:5555](http://localhost:5555).

### 3.4 Automated Database Backups & Recovery
Regular PostgreSQL dump commands for backup cron jobs:
```bash
# Backup database to compressed file
pg_dump -U root -h localhost -d etoile -F c -b -v -f "/backups/etoile_$(date +%Y%m%d_%H%M%S).dump"

# Restore database from backup file
pg_restore -U root -h localhost -d etoile -v "/backups/etoile_20260918_140000.dump"
```

---

## 4. Development Workflow

The root repository orchestrates all three processes simultaneously using `concurrently`:

```bash
# Install dependencies across root, server, client, and admin
npm run install:all

# Start all three development servers concurrently
npm run dev
```

### Individual Service Commands:
- **API Server Only**: `npm run dev:server` (Starts NestJS on `:3001` with hot-reload)
- **Client Portal Only**: `npm run dev:client` (Starts Vite on `:5173`)
- **Admin ERP Only**: `npm run dev:admin` (Starts Vite on `:5174`)

---

## 5. Production Build & Optimization

To produce optimized production bundles:
```bash
# Compiles Client Portal, Admin ERP, and NestJS Backend
npm run build
```

This generates:
- `client/dist/`: Static assets for the Student & Client Portal (minified HTML, CSS, and JS).
- `admin/dist/`: Static assets for the Admin & Operations ERP.
- `server/dist/`: Compiled Node.js/CommonJS backend application ready for production execution.

---

## 6. Production Deployment Options

### Option A: Standard Linux VPS Deployment (PM2 + Nginx)

#### 1. Process Management with PM2
Install PM2 globally and run the NestJS API server:
```bash
npm install -g pm2
cd server
pm2 start dist/main.js --name "etoile-api" --instances max --exec-mode cluster
pm2 save
pm2 startup
```

#### 2. Nginx Reverse Proxy Configuration
Sample Nginx virtual host configuration:
```nginx
# Client & Student Portal (:5173 / portal.etoileballet.com)
server {
    listen 80;
    server_name portal.etoileballet.com;
    root /var/www/etoile/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Admin & Operations ERP (:5174 / admin.etoileballet.com)
server {
    listen 80;
    server_name admin.etoileballet.com;
    root /var/www/etoile/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

---

### Option B: Docker & Containerization

The repository includes a production-grade `docker-compose.yml` that orchestrates all 4 platform services in isolated containers with health checks and volume persistence:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: etoile-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-etoile}
      POSTGRES_USER: ${POSTGRES_USER:-root}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-root} -d ${POSTGRES_DB:-etoile}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 5s

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: etoile-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://${POSTGRES_USER:-root}:${POSTGRES_PASSWORD:-secret}@postgres:5432/${POSTGRES_DB:-etoile}?schema=public
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required - copy .env.docker.example to .env and set a long random value}
      CORS_ORIGINS: "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:80,http://localhost"
      AUTO_SEED: "true"
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3001/api/portal-content', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));\""]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 15s

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: etoile-client-portal
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "5173:80"

  admin:
    build:
      context: ./admin
      dockerfile: Dockerfile
    container_name: etoile-admin-erp
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "5174:80"

volumes:
  postgres_data:
    driver: local
```

#### Docker Management Commands:
```bash
# Build and launch all 4 services in the background:
npm run docker:up

# Inspect real-time consolidated container logs:
npm run docker:logs

# Tear down all containers and networks:
npm run docker:down
```

---

## 7. Automated Test Suites & Audits

The system includes six comprehensive automated audit runners executed sequentially via `npm test` that verify security, data sanitization, card authentication, schedules, WhatsApp gateway integrations, financial accruals, and the security-hardening fixes:

```bash
# Execute the entire audit pipeline (runs all 6 test suites):
npm test
# Or from the server directory:
cd server && npm test
```

### Test Suite 1: Attendance Kiosk, WhatsApp Receipts & IFRS 15 Accrual Audit
Verifies:
- USB HID barcode scanner logic and zero-latency check-in processing.
- Quota deduction atomic balance decrement (`usedSessions + 1`).
- WiFi BSSID premise geofence validation (`premiseVerified: true`).
- OpenWA automated check-in WhatsApp receipt logging.
- IFRS 15 daily revenue accrual rate formula ($R_d = \frac{P}{T_{days}}$) and contract liability splits.

```bash
node server/src/attendance-receipt-ifrs15-audit.test.mjs
```

### Test Suite 2: Full API Security & RBAC Guard Audit
Verifies:
- Superadmin, Owner, Receptionist, Instructor authentication via Argon2id & stateless JWT.
- Password hash sanitization (ensuring `passwordHash` is never exposed in JSON responses).
- Strict RBAC route protection (verifying receptionists cannot access P&L, delete staff, etc.).
- Throttler rate limiting policy (120 requests/minute threshold).
- Boutique POS stock deductions and debt charging.
- Financial P&L calculations, expenses, invoices, payroll, and cash shifts.
- Admission lead creation and conversion into registered students.

```bash
node server/src/api-security-audit.test.mjs
```

### Test Suite 3: Courses, Pre-Session Reminders & WhatsApp Gateway Audit
Verifies:
- Course creation and timetable retrieval.
- Weekly session scheduling and studio room assignments.
- Dynamic WhatsApp reminder configuration retrieval and patching (`sendMinutesBefore`).
- Pre-session reminder triggering to enrolled dancers.
- Course broadcast messaging.
- WhatsApp gateway status, QR pairing, and webhook receivers.

```bash
node server/src/courses-whatsapp-audit.test.mjs
```

### Test Suite 4: Smart Card Code & Personal Schedules Audit
Verifies:
- Student card login (`ETOILE-892101`) and subscription quota status.
- Instructor card login (`INS-01`) and faculty token issuance.
- First-time setup WhatsApp password request for new students (`ETOILE-892102`).
- Retrieval of dispatched temporary password from OpenWA log.
- First-time setup password finalization.
- Student personal schedule retrieval (`/api/courses/student/my-schedule/:identifier`).
- Instructor weekly timetable retrieval (`/api/courses/instructor/my-schedule/:identifier`).

```bash
node server/src/card-auth-schedule-audit.test.mjs
```

### Test Suite 5: Full End-to-End Conservatory Student Lifecycle Audit
Verifies:
- Public web portal admission inquiry (Lead creation).
- Staff authentication & Artistic Director RBAC verification.
- Admissions pipeline audition stage transition (`new_inquiry` $\rightarrow$ `audition_scheduled` $\rightarrow$ `enrolled`).
- 1-Click lead conversion to registered `Student` with household creation and barcode generation.
- Subscription provisioning and quota balance verification.
- Fast-track attendance check-in via hardware barcode scanner with quota decrement.
- Boutique POS retail purchase with student wallet debt charging.
- Balanced double-entry general ledger voucher posting and audit verification.

```bash
node server/src/end-to-end-lifecycle.test.mjs
```

### Test Suite 6: Security-Hardening & Correctness Audit
Verifies the post-audit fixes:
- Liveness probe (`GET /api/health`) with database status.
- Demo-account and anonymous schedule payloads carry no phone numbers or staff emails.
- First-login setup tokens are rejected by guarded endpoints (`401`).
- OTP codes lock for 15 minutes after 5 wrong attempts.
- Unified Student & Parent Authentication: verification that legacy `/api/auth/family/login` is permanently removed (`404`), and that students & parents authenticate securely via card barcode, student ID, or registered parent email/phone with student password (`201`).
- Invoice creation maps strictly to the Prisma schema.
- POS checkout re-prices from the catalog and rejects oversells (`400`).
- Spoofed WiFi fingerprints yield `premiseVerified: false`; double-scans dedupe without extra deduction.
- Refresh-token rotation (fresh pair per use), rotated-token reuse rejection, logout revocation, and short-lived access TTL.
- Per-account login lockout (10 strikes → 15-min `429`) with unlock recovery.
- Ops snapshots shape validation (renewal queue, schedule conflicts) and the full pay-link lifecycle (create → validate → status → idempotent webhook reconcile).

```bash
node server/src/security-hardening-audit.test.mjs
```

---

## 8. Operational Troubleshooting & FAQs

### Q1: The API fails to start with `P1001: Can't reach database server at localhost:5432`
- **Cause**: PostgreSQL service is stopped or firewall is blocking port 5432.
- **Solution**: Verify PostgreSQL is running (`sudo systemctl status postgresql` or `brew services list`). Ensure credentials in `server/.env` match your local PostgreSQL role.

### Q2: Barcode scanner does not register in Fast-Track Check-In
- **Cause**: Scanner is configured in Serial/COM mode rather than USB HID Keyboard Emulation mode.
- **Solution**: Scan the barcode manufacturer's configuration sheet barcode labeled **"USB HID Keyboard"** or **"USB PC Keyboard Mode"**. The scanner will then emulate keystrokes directly into the browser.

### Q3: How do I change the Academy currency across the platform?
- **Solution**: Update the currency configuration in `admin/src/utils/currency.ts` and `client/src/utils/currency.ts`. Supported formats include `EUR (€)`, `USD ($)`, `GBP (£)`, `EGP (ج.م)`, and `AED (د.إ)`.

### Q4: CORS errors when accessing API from external tablets
- **Cause**: The tablet's IP/hostname is not in the `CORS_ORIGINS` whitelist.
- **Solution**: Add the tablet's domain or IP to the comma-separated list in `server/.env`:
  ```env
  CORS_ORIGINS="http://localhost:5173,http://192.168.1.50:5173"
  ```
  Restart the server.

### Q5: How do I reset the CMS content back to factory defaults?
- **Solution**: Log into the Admin ERP, open the **Website CMS Editor** tab, scroll to the bottom, and click **"Reset to Academy Default Content"**. Alternatively, make a `POST /api/portal-content/reset` request with an authorized Superadmin token.
