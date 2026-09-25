# 🩰 Étoile Ballet Academy — Enterprise Conservatory Platform

> **An end-to-end, dual-portal digital ecosystem and ERP designed for premier classical ballet academies and conservatory institutions.**  
> Powered by **NestJS**, **PostgreSQL (Prisma ORM)**, **React 18**, **Vite**, **Tailwind CSS**, and automated **WhatsApp & Hardware Integration**.

---

## 📑 Executive Overview

## 📑 Executive Overview

**Étoile Ballet Academy** is a specialized enterprise platform catering to the operational, pedagogical, and financial needs of high-caliber performing arts conservatories. The platform unifies administrative management, fast-track attendance kiosks, point-of-sale retail, double-entry financial accounting, and bilingual student/family self-service into an integrated architecture.

```mermaid
graph TD
    subgraph Client Portal [Client & Public Portal :5173]
        PublicWeb[Landing Page, Aurora Header & Dynamic CMS]
        ClassesCat[Classes & Curriculum Catalog]
        StudentPortal[Student Portal & Digital ID]
        TeacherPortal[Instructor Portal & Schedules]
        OnboardingStepper[Interactive Onboarding Checklist]
        AtmosphereCanvas[Stage Atmosphere Canvas Engine]
    end

    subgraph Admin Portal [Admin & Operations ERP :5174]
        AdminDashboard[Executive KPI Dashboard]
        AnalyticsHub[Analytics & BI Intelligence]
        FastTrack[Fast-Track Check-In Kiosk & Offline Queue]
        ScheduleBoard[Studio Schedule Board & Conflicts]
        AcademyView[Academy Structure: Categories, Groups, Sessions]
        StudentCRM[Student CRM & Profile Audits]
        AdmissionsBoard[Admissions Pipeline & Conversion]
        SubMgr[Subscription & Quota Manager]
        BoutiquePOS[Store & Boutique POS]
        FinanceSuite[Financial Accounting, ETA & PnL Suite]
        OpenWAGateway[WhatsApp Notification Engine]
        CMSEditor[Portal CMS Visual Editor]
        BlogMgr[Blog & Press Editor]
        GrowthView[Growth, Referrals & Promo Codes]
        RosterView[Staff Shifts & Roster]
        AuditLog[System Security & CRM Audit Log]
        SettingsHub[Multi-Branch & Campus Settings]
        UserMgmt[Staff & RBAC Management]
    end

    subgraph Backend API [NestJS Core REST Engine :3001]
        AuthModule[Auth & Unified Card/Credential Service]
        AttendanceModule[Attendance, Geofence & Dedupe Service]
        StudentsModule[Students & CRM Service]
        SubscriptionsModule[Subscriptions & Quota Service]
        CoursesModule[Courses & Scheduling Service]
        AcademyModule[Academy Categories & Groups Service]
        PosModule[POS & Inventory Service]
        AccountingModule[Accounting & PnL Engine]
        PaymentsModule[Online Payments & Pay-Links Service]
        EtaModule[ETA Electronic Tax Receipt Service]
        AnalyticsModule[BI Analytics & Forecasting Service]
        OpsModule[Operations & Renewal Queue Service]
        BranchesModule[Multi-Campus & Academic Year Service]
        OpenWaModule[WhatsApp Gateway Service]
        ContentModule[Content CMS Service]
        LeadsModule[Admissions Lead Service]
        BlogModule[Blog & Publishing Service]
        RosterModule[Staff Roster & Shift Service]
        ReferralsModule[Referral & Loyalty Service]
    end

    subgraph Persistence [PostgreSQL Database]
        PrismaORM[Prisma Client ORM - 56 Models]
        DB[(PostgreSQL 16 Database)]
    end

    ClientPortal -->|REST API / Bearer JWT| BackendAPI
    AdminPortal -->|REST API / Bearer JWT| BackendAPI
    BackendAPI --> PrismaORM
    PrismaORM --> DB
```

---

## 🌟 Key System Capabilities

| Capability | Technical Implementation | Highlights |
| :--- | :--- | :--- |
| **Dual-Portal Architecture** | Two decoupled Vite SPAs + unified NestJS backend | Distinct, security-hardened portals for Public/Students (`:5173`) and Academy Staff (`:5174`). |
| **Visual Excellence & Aurora UI** | Floating glassmorphic header, particle canvas & dark luxury design | Modern glassmorphism (`backdrop-blur-md`), dynamic scroll pills, ambient particle stage canvas, and Cormorant Garamond typography. |
| **Bilingual Support (EN / AR)** | Full dynamic localization with RTL / LTR switching | Natural typographic hierarchy supporting French/English and Arabic, with RTL layout mirroring. |
| **Fast-Track Attendance** | Hardware USB Barcode + Camera QR + Premise WiFi BSSID | Sub-second check-in, quota deduction, audio synthesizer feedback, automatic parent WhatsApp alert, and offline queue synchronization. |
| **Unified Student & Parent Auth** | Smart Card (`ETOILE-XXXXXX`), Student ID, Email/Phone + Password | Unified credential authentication. Parents log in directly using student credentials to access both dancer progress and full household billing without insecure substring lookups. |
| **Admissions Pipeline** | Kanban / Table lead management + 1-Click Conversion | Inquiries from the website flow directly into an admissions pipeline with audition scheduling and student conversion. |
| **Courses & Academy Hierarchy** | Category › Group › Session structure + Timetable scheduler | Modular 3-step hierarchy, weekly timetable generator, and automated WhatsApp pre-session reminder jobs. |
| **Boutique POS & Inventory** | Multi-size variant tracking + Hybrid payment ledger | Sells leotards, pointe shoes, tights; supports Cash, Card, Bank Transfer, and Student Negative Debt Balance. |
| **Financial Accounting Suite** | Accrual revenue (IFRS 15), P&L, AR Aging, Payroll, Cash Shift | Daily accrual revenue model ($R_d = \frac{P}{T_{days}}$), double-entry journal vouchers, and cashier drawer variance tracking. |
| **Payments & ETA Integration** | Paymob, Fawry, InstaPay pay-links + Egyptian Tax Authority | Digital payment links with 48h validity, webhook reconciliation, and ETA electronic receipt document generation. |
| **Multi-Campus Architecture** | Branches (`Zamalek`, `New Cairo`) & Academic Years | Multi-branch tenant support, campus-specific session filters, and academic term calendar partitions. |
| **Dynamic CMS Engine** | Zero-downtime headless JSON content store | Real-time editing of branding, hero headlines, faculty bios, ballet programs, stage performances, and announcements. |

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher running on `localhost:5432`

### 1. Repository Setup & Dependencies
Clone or open the repository, then install all root, backend, client, and admin dependencies with a single command:
```bash
# Install all dependencies across server, client, and admin
npm run install:all
```

### 2. Environment Configuration
Verify your `server/.env` file:
```env
DATABASE_URL="postgresql://root:secret@localhost:5432/etoile?schema=public"
# REQUIRED in production (>= 32 random chars) — the API refuses to boot without it.
# Generate: openssl rand -base64 48
JWT_SECRET="change_me_to_a_long_random_secret_min_32_chars"
PORT=3001
CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
# Optional hardening & integrations:
OPENWA_REDACT_SECRETS=false   # true in production: scrub temp passwords/OTPs from WhatsApp logs
PREMISE_WIFI_BSSID=Etoile-Secure-5G [F4:92:BF:11:80:A2]  # kiosk premise fingerprint
PUBLIC_APP_URL="http://localhost:5173"
PAYMOB_API_KEY=""
FAWRY_MERCHANT_CODE=""
ETA_TAX_ID=""
```
For Docker, copy `.env.docker.example` to `.env` and set a real `JWT_SECRET` (compose fails fast if it is missing).

### 3. Database Migration & Seeding
Apply versioned Prisma migrations and populate conservatory seed data (idempotent):
```bash
cd server
npx prisma migrate deploy
npm run seed
cd ..
```

### 4. Launch the Complete Platform
Start the NestJS API server, the Student & Family Client Portal, and the Admin Management Suite simultaneously:
```bash
npm run dev
```

The system will start concurrently:
- 🩰 **Client & Student Portal**: [http://localhost:5173](http://localhost:5173)
- 🏛️ **Admin & Operations Portal**: [http://localhost:5174](http://localhost:5174)
- ⚡ **NestJS REST API**: [http://localhost:3001/api](http://localhost:3001/api)

---

### 🐳 Docker Compose Orchestration (Production & Staging)

Launch the entire stack (PostgreSQL 16, NestJS API, Client SPA with Nginx, and Admin ERP with Nginx) in isolated production containers:

```bash
# Build and launch all 4 services in background:
npm run docker:up

# View real-time container logs:
npm run docker:logs

# Tear down containers and networks:
npm run docker:down
```

#### Container Architecture:
- **`etoile-postgres`**: PostgreSQL 16 Alpine with automatic health checks (`pg_isready`).
- **`etoile-api`**: NestJS REST API with automatic Prisma synchronization (`db push` / migrations) and auto-seeding.
- **`etoile-client-portal`**: Multi-stage built React SPA served via Nginx on port `5173`.
- **`etoile-admin-erp`**: Multi-stage built React ERP served via Nginx on port `5174`.

---

## 🔑 Default Credentials & Access Roster

All seeded accounts share the initial password: **`etoile2026`**

### Administrative & Pedagogical Staff
| Name | Role | Email Identifier | Card Code | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Madame Elena Rostova** | Superadmin / Artistic Director | `director@etoile.fr` | `DIR-01` | Full administrative, financial, staff, and curriculum control |
| **Julian Moreau** | Owner / Executive Board | `julian@etoile.fr` | `OWN-01` | Full administrative, financial PnL, and executive audit control |
| **Chloé Laurent** | Receptionist / Front-Desk | `reception@etoile.fr` | `REC-01` | Check-In kiosk, Student CRM, POS boutique, Course enrollment |
| **Lucas Marchand** | Faculty Instructor | `lucas@etoile.fr` | `INS-01` | Instructor schedule, student roster, attendance view |

### Student & Parent Portal Accounts
*Parents authenticate directly using their student's credentials (barcode, student ID, or registered parent email/phone with student password) to access the complete family household portal.*

| Student Name | Family ID | Identifier (Email/Phone) | Card Code / Barcode | Program & Level | Quota Balance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Maya Moreau** | `FAM-01` | `eleonore.moreau@artparis.fr` | `ETOILE-892101` | Classical Pre-Pro IV | 2 / 16 sessions |
| **Leo Moreau** | `FAM-01` | `+33 6 42 19 88 01` | `ETOILE-892102` | Youth Division II | 4 / 8 sessions (First-time setup test) |
| **Clara Vance** | `FAM-02` | `harrison@vance-holdings.com` | `ETOILE-774109` | Contemporary Soloist | Expired by date (Wallet: +120€) |
| **Amira Al-Mansoor** | `FAM-03` | `tariq@almansoor.ae` | `ETOILE-653281` | Junior Conservatory III | Expired by quota (Debt: -110€) |

---

## 📚 In-Depth Documentation Index

> 🤖 **Complete Consolidated AI Context File**:  
> For LLMs, autonomous coding assistants, and AI tools, a single-file compilation of all documentation files is maintained directly beside this README at:  
> 👉 **[AI_DOCUMENTATION.md](file:///Users/bishoy/Desktop/Etoile/AI_DOCUMENTATION.md)** *(Comprehensive single-file reference covering the entire codebase without omission)*

For modular reading and dedicated topical deep dives:

1. **[System Architecture & Technology Stack](file:///Users/bishoy/Desktop/Etoile/docs/01_SYSTEM_ARCHITECTURE.md)**  
   *Architecture topology, dual-portal design, state management, security layers, audio synth, and hardware barcode integration.*
2. **[Database Schema & Data Dictionary](file:///Users/bishoy/Desktop/Etoile/docs/02_DATABASE_SCHEMA_AND_MODELS.md)**  
   *Complete Prisma data dictionary, ER diagrams, 56 models, relations, cascades, constraints, and audit trails.*
3. **[REST API Specification & Security](file:///Users/bishoy/Desktop/Etoile/docs/03_REST_API_SPECIFICATION.md)**  
   *Comprehensive API endpoints catalog across all domain controllers, DTOs, RBAC roles, headers, and error codes.*
4. **[Client & Student Portal Manual](file:///Users/bishoy/Desktop/Etoile/docs/04_CLIENT_PORTAL_MANUAL.md)**  
   *Public landing page, aurora header, stage atmosphere canvas, classes catalog, unified student/parent authentication, digital ID card, and instructor schedule.*
5. **[Admin CRM & Operations ERP Manual](file:///Users/bishoy/Desktop/Etoile/docs/05_ADMIN_CRM_ERP_MANUAL.md)**  
   *Executive dashboard, fast-track check-in kiosk, analytics hub, schedule board, student CRM, admissions pipeline, POS store, courses scheduler, and CMS.*
6. **[Financial Accounting Suite & Algorithms](file:///Users/bishoy/Desktop/Etoile/docs/06_FINANCIAL_ACCOUNTING_SUITE.md)**  
   *Daily accrual revenue model ($R_d$), P&L statements, accounts receivable aging, payment links, ETA electronic receipts, expense tracker, payroll, and cash shifts.*
7. **[Deployment, Operations & Automated Audits](file:///Users/bishoy/Desktop/Etoile/docs/07_DEPLOYMENT_OPERATIONS_AND_TESTING.md)**  
   *Production containerization, environment configuration, database maintenance, backup procedures, and test suite execution.*
8. **[Roadmap Execution & Production Readiness](file:///Users/bishoy/Desktop/Etoile/docs/08_ROADMAP_EXECUTION.md)**  
   *Status of completed P0/P1 items, analytics APIs, payment gateways, ETA e-receipts, multi-branch setup, and production deployment checklists.*

---

## 🛠️ Automated Testing & Audits

The system includes a suite of six comprehensive audit runners executed via `npm test` (or run individually) that verify API security, RBAC guards, unified smart card authentication, personalized schedules, dynamic course management, WhatsApp messaging, IFRS 15 daily accruals, full student lifecycle flows, and security-hardening verification (PII redaction, temp-token rejection, OTP lockout, legacy family login removal, server-side pricing, stock validation, check-in dedupe, and pay-link reconciliation):

```bash
# Run the complete test suite (all 6 audit runners sequentially):
npm test
# or from server directory:
cd server && npm test

# 1. Full API Security & RBAC Guard Audit (50+ assertions)
node server/src/api-security-audit.test.mjs

# 2. Smart Card Authentication & Personal Schedules Audit
node server/src/card-auth-schedule-audit.test.mjs

# 3. Courses, Dynamic Reminders & WhatsApp Gateway Audit
node server/src/courses-whatsapp-audit.test.mjs

# 4. Attendance Kiosk, WhatsApp Receipts & IFRS 15 Accrual Audit
node server/src/attendance-receipt-ifrs15-audit.test.mjs

# 5. Full End-to-End Conservatory Student Lifecycle Audit
node server/src/end-to-end-lifecycle.test.mjs

# 6. Security-Hardening & Correctness Audit (health, PII redaction, OTP lockout,
#    unified student/parent login, invoice schema mapping, POS pricing/stock, check-in dedupe, pay-links)
node server/src/security-hardening-audit.test.mjs
```

### 💾 Backups

```bash
# Timestamped pg_dump of the live compose database into ./backups/
npm run docker:backup

# Restore: cat backups/<file>.sql | docker compose exec -T postgres psql -U ${POSTGRES_USER:-root} ${POSTGRES_DB:-etoile}
```

---

## 🏛️ License & Copyright
© 2026 Étoile Ballet Academy & Conservatoire Platform. All rights reserved. Built with precision for the performing arts.
