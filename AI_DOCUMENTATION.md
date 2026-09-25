# 🩰 ÉTOILE BALLET ACADEMY — ALL-IN-ONE COMPLETE AI SYSTEM CONTEXT & DOCUMENTATION
> **Notice for AI Agents, Coding Assistants & LLMs**:
> This document is a consolidated, self-contained single-file knowledge base containing the complete architectural, database, API, business logic, portal manual, and deployment specifications for the **Étoile Ballet Academy & Conservatory Platform**.
> All 8 specialized technical reference documents and the root README are compiled below in full fidelity without omission.

---

## 📑 Consolidated Table of Contents
1. [Primary Overview & Quickstart (README.md)](#1-primary-overview--quickstart-readmemd)
2. [Chapter 1: System Architecture & Technology Stack](#2-chapter-1-system-architecture--tech-stack)
3. [Chapter 2: Database Schema, Models & Data Dictionary](#3-chapter-2-database-schema--data-dictionary)
4. [Chapter 3: REST API Specification & Endpoint Catalog](#4-chapter-3-rest-api-specification--security)
5. [Chapter 4: Client & Student Portal User Manual](#5-chapter-4-client--student-portal-manual)
6. [Chapter 5: Admin CRM & Operations ERP User Manual](#6-chapter-5-admin-crm--operations-erp-manual)
7. [Chapter 6: Financial Accounting Suite & Mathematical Models](#7-chapter-6-financial-accounting-suite--algorithms)
8. [Chapter 7: Deployment, Operations & Automated Testing Reference](#8-chapter-7-deployment-operations--testing-reference)
9. [Chapter 8: Roadmap Execution & Production Readiness](#9-chapter-8-roadmap-execution--production-readiness)

---


<!-- ============================================================================== -->
<!-- SECTION 1: PRIMARY OVERVIEW & QUICKSTART (README.md) -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/README.md -->
<!-- ============================================================================== -->

# 1. PRIMARY OVERVIEW & QUICKSTART (README.md)

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



<!-- ============================================================================== -->
<!-- SECTION 2: CHAPTER 1: SYSTEM ARCHITECTURE & TECH STACK -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/docs/01_SYSTEM_ARCHITECTURE.md -->
<!-- ============================================================================== -->

# 2. CHAPTER 1: SYSTEM ARCHITECTURE & TECH STACK

# 🏗️ Étoile Platform — System Architecture & Technology Stack

This document provides an exhaustive technical analysis of the Étoile Ballet Academy digital architecture, detailing the design patterns, runtime topologies, state management frameworks, security enforcement layers, hardware peripherals, and communications infrastructure that compose the platform.

---

## 1. High-Level Architectural Topology

The Étoile platform is engineered around a **Decoupled Dual-Portal Architecture** supported by a single, monolithic, highly modular **NestJS Core REST Engine** backed by a **PostgreSQL relational database**.

```mermaid
graph TB
    subgraph Users ["User Endpoints"]
        PublicUser["Public Visitors & Prospective Dancers"]
        StudentUser["Enrolled Dancers & Parents"]
        InstructorUser["Ballet Instructors & Faculty"]
        AdminUser["Receptionists, Owners & Superadmins"]
    end

    subgraph Portals ["Frontend Presentation Tier (React + Vite)"]
        ClientApp["Client Portal (:5173)\n- Landing Page & Aurora Floating Header\n- Stage Atmosphere Particle Canvas\n- Onboarding Stepper\n- Classes Catalog & Program Modals\n- Student Portal & Barcode ID\n- Instructor Portal & Timetables"]
        AdminApp["Admin & Operations Portal (:5174)\n- Executive Dashboard & Analytics Hub\n- Fast-Track Check-In & Offline Queue\n- Studio Schedule Board & Conflict Guard\n- Academy Hierarchy (Categories/Groups/Sessions)\n- Student CRM & Admissions Pipeline\n- Packages, POS Boutique & Financials\n- WhatsApp Dispatcher & Website CMS\n- Blog, Growth, Staff Roster, Audit Logs & Settings"]
    end

    subgraph Peripherals ["Hardware & Browser APIs"]
        HIDScanner["USB HID Barcode / RFID Readers"]
        CameraQR["WebRTC Video Camera QR Scanner"]
        WebAudio["Web Audio API Synthesizer (Chimes)"]
        CanvasRenderer["HTML5 Canvas Code128 / QR Renderer"]
        OfflineStorage["LocalStorage Queue & PWA Service Worker"]
    end

    subgraph BackendGateway ["NestJS Monolithic REST Core (:3001/api)"]
        HelmetMW["Helmet Security Headers"]
        CorsMW["Dynamic CORS Origin Policy"]
        ThrottleGuard["ThrottlerGuard (Rate Limiting)"]
        ValPipe["ValidationPipe (Whitelist & Type Transform)"]
        JwtAuthGuard["JwtAuthGuard (Passport JWT)"]
        RolesGuard["RolesGuard (RBAC Enforcer)"]
    end

    subgraph Modules ["NestJS Domain Modules (22 Modules)"]
        AuthMod["AuthModule (Unified Student/Parent/Staff)"]
        AttMod["AttendanceModule (Geofence & Dedupe)"]
        StudMod["StudentsModule (CRM & Directory)"]
        SubMod["SubscriptionsModule (IFRS-15 Quotas)"]
        CrsMod["CoursesModule (Timetable Scheduler)"]
        AcadMod["AcademyModule (Categories & Groups)"]
        PosMod["PosModule (Boutique & Variant Inventory)"]
        AccMod["AccountingModule (General Ledger & PnL)"]
        PayMod["PaymentsModule (Paymob/Fawry/InstaPay)"]
        EtaMod["EtaModule (Egyptian Tax Authority)"]
        AnalytMod["AnalyticsModule (BI & Forecasting)"]
        OpsMod["OpsModule (Renewal Watchlist & Conflicts)"]
        BranchMod["BranchesModule (Zamalek/New Cairo & Terms)"]
        WaMod["OpenWaModule (WhatsApp Gateway Bridge)"]
        CmsMod["ContentModule (Dynamic Headless CMS)"]
        LeadMod["LeadsModule (Admissions Pipeline)"]
        BlogMod["BlogModule (Conservatory Press & News)"]
        RostMod["RosterModule (Staff Shifts & Leaves)"]
        RefMod["ReferralsModule (Loyalty & Growth)"]
    end

    subgraph Persistence ["Persistence & External Services"]
        PrismaService["Prisma ORM Client (56 Models)"]
        PostgresDB[(PostgreSQL 16 Engine)]
        WhatsAppGateway["External Baileys / OpenWA HTTP Bridge"]
        PaymentGateways["Paymob / Fawry / InstaPay Gateways"]
        TaxAuthority["ETA eReceipt Sandbox/Production Portal"]
    end

    PublicUser --> ClientApp
    StudentUser --> ClientApp
    InstructorUser --> ClientApp
    AdminUser --> AdminApp

    ClientApp --> CanvasRenderer
    ClientApp --> AtmosphereCanvas
    AdminApp --> HIDScanner
    AdminApp --> CameraQR
    AdminApp --> WebAudio
    ClientApp --> WebAudio
    AdminApp --> OfflineStorage

    ClientApp -->|HTTP / JSON (Bearer JWT)| BackendGateway
    AdminApp -->|HTTP / JSON (Bearer JWT)| BackendGateway

    BackendGateway --> HelmetMW --> CorsMW --> ThrottleGuard --> ValPipe --> JwtAuthGuard --> RolesGuard
    RolesGuard --> Modules
    Modules --> PrismaService
    PrismaService --> PostgresDB
    WaMod -.->|HTTP Webhook / REST| WhatsAppGateway
    PayMod -.->|REST / Webhooks| PaymentGateways
    EtaMod -.->|REST / Signed Invoices| TaxAuthority
```

---

## 2. Technology Stack Breakdown

### Frontend Tier (Client & Admin Portals)
- **Runtime & Build Tool**: [Node.js](https://nodejs.org) + [Vite 5](https://vitejs.dev/) with ES Modules for sub-second Hot Module Replacement (HMR). Code-splitting with `React.lazy` and `Suspense` keeps initial bundles ~105 kB with on-demand chunk loading (20-95 kB per tab).
- **Core Library**: [React 18](https://react.dev/) using functional components with strict TypeScript (`.tsx`).
- **Styling & Design System**: [Tailwind CSS 3](https://tailwindcss.com/) extended with an editorial conservatory palette (Paris Gold `#caa868`, Noir `#080a0b`, Slate Velvet `#111417`, Cream `#f5eedc`).
- **Visual & Atmospheric FX**: Glassmorphism (`backdrop-blur-md`, subtle golden borders), floating pill navigation, interactive canvas stage particle atmosphere (`StageAtmosphereCanvas.tsx`), and smooth state transitions.
- **Typography**: Editorial serif headings (`font-heading`: Cormorant Garamond / Playfair Display) paired with clean sans-serif bodies (`font-sans`: Inter / Cairo / Tajawal).
- **Iconography**: [Lucide React](https://lucide.dev/) (consistent stroke width and vector aesthetics).
- **State Management**: Dedicated React Context Providers (`AppContext` for Client, `AdminContext` for Admin) featuring optimistic updates, API synchronization, and offline fallback resiliency.
- **Offline & Queue Synchronization**: LocalStorage-backed offline queue (`offlineQueue.ts`) capturing check-ins with client-generated UUID idempotency keys during reception connectivity loss; auto-flushes every 8 seconds upon network recovery.
- **Audio Synthesis**: Native browser **Web Audio API** oscillator synthesizing bell chimes for check-in kiosk feedback without audio asset latency.
- **Barcode & QR Rendering**: Native HTML5 Canvas rendering for Code128 standard barcodes and QR codes with download and print capabilities.

### Backend Tier (Core REST API Engine)
- **Framework**: [NestJS 10](https://nestjs.com/) utilizing standard TypeScript decorators, inversion-of-control (IoC) containers, and modular domain architecture (22 domain feature modules).
- **Security Middleware**:
  - `helmet`: Custom HTTP security headers and Cross-Origin Resource Policies.
  - `@nestjs/throttler`: Rate-limiting guard defending endpoints against brute-force attacks (120 requests/minute default threshold; sensitive auth routes budget 60/min login, 10/min OTP request, 30/min OTP verify).
  - `@nestjs/passport` & `passport-jwt`: Stateless JSON Web Token authentication strategy with opaque rotating refresh tokens.
  - `argon2`: Password hashing algorithm providing memory-hard protection against ASIC/GPU cracking.
- **Data Validation**: `class-validator` and `class-transformer` combined with global `ValidationPipe({ whitelist: true, transform: true })`.
- **Concurrency & Process Management**: Root orchestration via `concurrently` enabling unified single-command development (`npm run dev`).

### Database & Persistence Tier
- **Database Engine**: [PostgreSQL 16](https://www.postgresql.org/) relational database running on standard port `5432`.
- **Object-Relational Mapping (ORM)**: [Prisma ORM 6](https://www.prisma.io/) handling declarative schema definitions, versioned migrations (`npx prisma migrate deploy`), type-safe query generation, relation joins, and idempotent seed scripts.
- **Data Seeding Engine**: `server/prisma/seed.ts` providing realistic conservatory entities across 56 models: staff, families, dancers, multi-tier subscription plans, products with size variants, branches (`Zamalek`, `New Cairo`), academic years, courses, categories, groups, scheduled sessions, double-entry vouchers, and CMS presets.

---

## 3. Frontend Architecture & State Management

### 3.1 Dual-Portal Decoupling Strategy
The platform avoids bloated single-bundle applications by deploying two distinct Vite SPAs:

1. **Client & Student Portal (`/client`, Port `5173`)**:
   - **Audience**: General public, prospective students, enrolled dancers, parents, and instructors.
   - **Key Components & Views**:
     - `AppHeader`: Modern floating glassmorphic aurora navigation bar, dynamic scroll responsiveness, golden status badges, and mobile drawer.
     - `StageAtmosphereCanvas`: Interactive canvas particle simulation evoking theatre stage dust and spotlights.
     - `LandingPage`: Editorial conservatory showcase driven by dynamic CMS content.
     - `OnboardingChecklist`: Step-by-step interactive onboarding stepper guiding dancers and parents through card verification, password setup, curriculum exploration, and WhatsApp joining.
     - `ClassesCatalogPage`: Interactive curriculum catalog with category filters, schedule grids, and direct enrollment triggers.
     - `ClientPortal`: Authenticated student & family dashboard displaying real-time attendance countdowns, remaining subscription quotas, wallet balances, medical notes, and a digital ID card with barcode.
     - `InstructorPortal`: Authenticated pedagogical dashboard showing assigned courses, student attendance counts, and 1-click WhatsApp session reminder dispatches.
     - `ClientLoginPage`: Multi-modal authentication supporting physical card scan, student ID, registered parent email/phone with student password, demo quick-fill drawer, and first-time WhatsApp temporary password setup.

2. **Admin & Operations ERP (`/admin`, Port `5174`)**:
   - **Audience**: Artistic Directors, Academy Owners, Receptionists, and Department Heads.
   - **Key Views (22 Operational Modules)**:
     - `DashboardOverview`: Live KPIs, occupancy gauges, attendance sparklines, needs-attention renewal queue, and a live Paris Conservatory clock.
     - `AnalyticsHub`: Business intelligence dashboard with revenue trends, program mix distribution, forecasting (M+1..3), and attention watchlists.
     - `FastTrackCheckIn`: High-throughput scanner kiosk with USB barcode, camera QR, audio chimes, premise WiFi verification, and offline queue synchronization.
     - `ScheduleBoard`: Studio week grid, room occupancy, today's timeline, and automated double-booking conflict detection (`/api/ops/schedule-conflicts`).
     - `AcademyView`: Hierarchical 3-step conservatory structure: Categories › Groups › Sessions with assigned lead instructors.
     - `StudentCrm` & `StudentProfilePage`: Comprehensive dancer CRM, admissions Kanban, medical notes, skill evaluation rubrics, and wallet debt adjustments.
     - `AdmissionsPipeline`: Dedicated admissions board managing inquiries, trial classes, auditions, and 1-click student conversion.
     - `SubscriptionManager`: Subscription plan creation, manual quota overrides, and daily accrual recognition simulation.
     - `PosBoutique`: Retail store with inventory variant tracking, barcode SKU matching, and multi-tender checkout.
     - `FinancialAccounting`: Full financial suite including IFRS-15 daily accruals, P&L, AR aging, expense approvals, instructor payroll, journal vouchers, cash drawer shift reconciliation, payment links, and ETA tax receipts.
     - `OpenWaDispatcher`: Real-time WhatsApp gateway status, QR pairing, automated message templates, and audit log.
     - `PortalCmsEditor`: Live visual CMS for academy branding, hero copy, faculty bios, performances, and announcement alerts.
     - `BlogManager`: Conservatory news, press releases, and articles publishing manager.
     - `GrowthView`: Referral codes, promo codes, student discounts, and acquisition tracking.
     - `RosterView`: Staff shift scheduling, front-desk duty allocation, and leave request management.
     - `AuditLogView`: System security, CRM, financial, and attendance event auditing.
     - `AdminUsersManagement`: Staff user creation, RBAC role assignment, card code binding, shift status, and password resets.
     - `SettingsHub`: Multi-campus configuration (`Zamalek`, `New Cairo`), academic year management, ETA tax credentials, and payment gateway toggles.
     - `MyProfilePage`: Personal staff credentials, security settings, and duty status.

### 3.2 State Management & Offline Resiliency
Both portals leverage custom React Context engines that provide:
- **Synchronized State**: Centralized reactive state for entities (students, courses, sessions, products, invoices, attendance).
- **Graceful Degradation / Offline Resiliency**: Every state action first attempts a REST API call to the NestJS backend. If the backend is unreachable, the context gracefully falls back to local memory state and mock data, displaying a clear `Live server / Local projection` indicator.
- **Offline Check-In Queue**: Kiosk scans offline are saved to `localStorage` with UUID idempotency keys. As soon as connectivity returns, the queue flushes automatically every 8 seconds without duplicate quota deductions.
- **Global Toast Notification System**: Standardized toast triggers across portals (`gold`, `success`, `warning`, `error`).
- **Live Paris Conservatory Clock**: Synchronized European/Paris (`Europe/Paris`) time display for accurate session tracking.
- **Keyboard Shortcuts**: Power-user navigation (`Cmd/Ctrl+B` to collapse/expand sidebar, keys `1`-`8` to switch allowed modules).

---

## 4. Backend Architecture & Request Lifecycle

The NestJS backend implements an enterprise layered architecture where every HTTP request traverses a defined pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client (React)
    participant Net as Network & Helmet
    participant Throttler as ThrottlerGuard
    participant Router as Express Router
    participant Val as ValidationPipe
    participant AuthG as JwtAuthGuard
    participant RolesG as RolesGuard
    participant Ctrl as NestJS Controller
    participant Svc as NestJS Service
    participant Prisma as PrismaService
    participant DB as PostgreSQL Database

    Client->>Net: HTTP Request (Method + Path + Headers + Body)
    Net->>Throttler: Check Rate Limit (120 req/min)
    alt Rate Limit Exceeded
        Throttler-->>Client: 429 Too Many Requests
    end
    Throttler->>Router: Route Matching (/api/:module/...)
    Router->>Val: Validate DTO (Whitelist & Transform)
    alt Validation Failed
        Val-->>Client: 400 Bad Request (Validation Errors)
    end
    Val->>AuthG: Verify Bearer JWT
    alt Invalid / Expired Token
        AuthG-->>Client: 401 Unauthorized
    end
    AuthG->>RolesG: Evaluate @Roles('superadmin', 'owner', ...)
    alt Role Insufficient
        RolesG-->>Client: 403 Forbidden (Insufficient Permissions)
    end
    RolesG->>Ctrl: Invoke Controller Route Handler
    Ctrl->>Svc: Execute Business Logic
    Svc->>Prisma: Database Queries (Transactions, Joins)
    Prisma->>DB: SQL Queries
    DB-->>Prisma: Data Result
    Prisma-->>Svc: Model Objects
    Svc-->>Ctrl: Processed Domain Result
    Ctrl-->>Client: HTTP 200 / 201 Response JSON
```

---

## 5. Security & Role-Based Access Control (RBAC)

### 5.1 Password Hashing with Argon2
Unlike standard bcrypt which can be vulnerable to GPU hash cracking, Étoile uses **Argon2id** (`argon2.hash()`, `argon2.verify()`), the winner of the Password Hashing Competition. All staff and student passwords stored in the database are protected with memory-hard hashes.

### 5.2 Short-Lived JWT Access + Rotating Refresh Tokens
- **Token Generation**: Upon successful authentication, the server issues a short-lived JWT access token (30 minutes via `ACCESS_TOKEN_TTL`) plus an opaque, single-use refresh token (30 days via `REFRESH_TOKEN_TTL`), whose SHA-256 hash is persisted in `RefreshToken`. Payload contains:
  - `sub`: User ID
  - `email` or `barcode`: Principal identifier
  - `role`: Staff role (`superadmin`, `owner`, `receptionist`, `instructor`) or `student`
  - `type` / `familyId` / `studentId`: Portal session scoping claims
  - `name`: User display name
- **Unified Student & Parent Authentication**:
  - Legacy passwordless family login (`/api/auth/family/login`) and family PIN endpoints have been permanently deprecated and removed.
  - Students and instructors authenticate via smart card barcode or staff credentials.
  - Parents authenticate directly using their dancer's credentials: student card barcode (`ETOILE-XXXXXX`), student ID (`STU-XXX`), registered parent email, or registered parent phone, paired with the student's private password.
  - The returned session token loads both dancer progress and linked `Family` household data (billing, invoices, siblings, timetable) securely.
- **Rotation & Reuse Detection**: Each `POST /api/auth/refresh` revokes the presented token and mints a fresh pair. Re-presenting an already-rotated token is treated as theft: all tokens of that subject are revoked (`401`).
- **Account & OTP Lockout Protection**:
  - 10 incorrect password attempts trigger a 15-minute account lockout (`429 Too Many Requests`), surviving IP rotation.
  - 5 incorrect OTP verifications lock the OTP for 15 minutes.
- **Single-Purpose Setup Tokens**: First-login temporary tokens carry `mustChangePassword: true` and are rejected by every guarded endpoint until the password is changed.
- **Guards**: Protected endpoints utilize `@UseGuards(JwtAuthGuard, RolesGuard)` alongside `@Roles(...)`; `superadmin` and `owner` hold universal access. Public catalog/schedule reads use `OptionalJwtAuthGuard` (anonymous allowed, contacts redacted).
- **Boot Guarantee**: The API refuses to start in production without a strong (`≥32 chars`) `JWT_SECRET`.

### 5.3 RBAC Permission Matrix

| Module / Action | Superadmin | Owner | Receptionist | Instructor | Client (Student / Parent) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Public Landing / Catalog** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Student Portal & Barcode ID** | ✅ | ✅ | ✅ | ✅ | ✅ (Own Household Only) |
| **Instructor Portal & Schedule** | ✅ | ✅ | ✅ | ✅ (Own Only) | ❌ |
| **Kiosk Check-In Processing** | ✅ | ✅ | ✅ | ✅ | ✅ (Own Household Only) |
| **Analytics & Intelligence Hub** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Studio Schedule & Conflicts** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Academy Categories & Groups** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Student CRM & Directory** | ✅ | ✅ | ✅ | ✅ (View Only) | ❌ |
| **Admissions Lead Conversion** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Packages & Quota Overrides** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **POS Boutique Checkout** | ✅ | ✅ | ✅ | ❌ | ✅ (Own Household Only) |
| **Financial P&L & Balance Sheet** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Invoices & AR Management** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Online Pay-Links Creation** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **ETA Electronic Invoicing** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Expense Recording & Approvals** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Instructor Payroll & Payment** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Double-Entry Journal Vouchers** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Cash Drawer Shifts Management**| ✅ | ✅ | ✅ | ❌ | ❌ |
| **WhatsApp Gateway Configuration**| ✅ | ✅ | ✅ | ❌ | ❌ |
| **Portal CMS Dynamic Editing** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Blog & Press Management** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Staff Roster & Shifts** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Security & CRM Audit Logs** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Staff Accounts & Role Mod** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Multi-Campus & Branch Settings**| ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 6. Hardware & Physical Peripherals Integration

### 6.1 Hardware Barcode & RFID Scanners
The `FastTrackCheckIn` kiosk supports physical hardware barcode scanners (Opticon, Honeywell, Zebra) operating in **USB HID Keyboard Emulation Mode**:
- A global keydown listener buffers rapid keystrokes (< 50ms interval between characters).
- When a terminating `Enter` key is detected, the buffer is evaluated against the student barcode pattern (`ETOILE-XXXXXX` or numeric standard).
- The kiosk instantly triggers check-in verification without requiring the operator to focus an input field.

### 6.2 WebRTC Camera QR Scanner
For devices without dedicated hardware scanners (tablets, mobile phones, laptops), the kiosk includes a video stream scanner:
- Uses the device's camera stream via `navigator.mediaDevices.getUserMedia()`.
- Captures and scans frames for QR codes containing encrypted student authentication tokens or barcodes.

### 6.3 Native Web Audio API Sound Synthesizer
Rather than relying on audio file downloads (`.mp3` / `.wav`) that introduce network latency or fail when offline, the platform synthesizes rich audio chimes directly in code using the browser's native `AudioContext`:
- **Granted / Success Chime**: Multi-frequency harmonic chord ($C_5 \rightarrow E_5 \rightarrow G_5 \rightarrow C_6$) using sine oscillators with exponential volume decay.
- **Denied / Quota Expired Chime**: Low dissonance tone ($F_3 \rightarrow D_3^\sharp$) indicating quota exhaustion or expired dates.
- **Warning Chime**: Rapid double-beep alert for negative wallet balances or attendance warnings.

### 6.4 WiFi Premise Geofencing & BSSID Verification
To ensure students can only check in while physically present inside the conservatory premises:
- The check-in payload validates against the conservatory's authorized Access Point BSSID (`Etoile-Secure-5G [F4:92:BF:11:80:A2]`).
- Any attempt to forge check-in outside the facility flags `premiseVerified: false` and can be configured to block access.

---

## 7. Automated WhatsApp Gateway & Notification Engine

The platform incorporates an enterprise notification subsystem that bridges academy events to parent and instructor WhatsApp accounts:

### 7.1 Operating Modes
1. **Built-in QR Engine (`builtin_qr`)**:
   - Generates an in-browser QR code for direct pairing with WhatsApp Web.
   - Ideal for standalone conservatory reception tablets and direct device pairing.
2. **External Gateway Bridge (`external_gateway`)**:
   - Integrates via REST webhooks with an external Baileys, WhatsApp Business Cloud API, or OpenWA server running on a local or dedicated microservice.

### 7.2 Dynamic Templating Engine
Automated notifications utilize dynamic token replacement:
- `{studentName}`: Dancer's full name.
- `{courseTitle}`: Scheduled class title.
- `{time}`: Class start time.
- `{studio}`: Designated studio hall (e.g., *Grand Studio Petipa*, *Studio Pavlova*).
- `{instructorName}`: Assigned ballet master.
- `{quotaRemaining}`: Classes left in current subscription package.
- `{walletBalance}`: Current student balance or outstanding tuition debt.

### 7.3 Automated Trigger Events
- **Class Check-In Confirmation**: Dispatches an instant receipt to parents as soon as the student scans their badge at the front desk.
- **Pre-Session Class Reminder**: A scheduled background job triggers automated class reminders (configurable from 15 to 120 minutes before class).
- **Low Quota Warning**: Dispatched automatically when a dancer reaches 2 or fewer remaining classes.
- **Debt & Tuition Alert**: Dispatched when student balance enters negative debt exceeding safety thresholds.

---

## 8. Internationalization & Bidirectional Layout (EN / AR)

Étoile provides comprehensive **bilingual support** supporting international conservatories operating in Paris, London, Cairo, and Dubai:
- **Language Detection & Persistence**: Selected language (`en` or `ar`) persists in `localStorage`.
- **Directional Switching**: Dynamic `dir="ltr"` and `dir="rtl"` attribute application on root elements.
- **Typography Switching**: LTR typography utilizes French-inspired serif Cormorant Garamond, whereas RTL automatically mirrors layout using refined Arabic typography (Cairo and Tajawal).
- **Mirrored Layouts**: Flexbox, grid columns, chevron orientations, and badge alignments automatically invert for natural right-to-left reading flow.
- **Localized Data Schema**: All course titles, descriptions, staff names, department names, and product names possess both English and Arabic counterparts in the database (`title` and `titleAr`, `name` and `nameAr`).



<!-- ============================================================================== -->
<!-- SECTION 3: CHAPTER 2: DATABASE SCHEMA & DATA DICTIONARY -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/docs/02_DATABASE_SCHEMA_AND_MODELS.md -->
<!-- ============================================================================== -->

# 3. CHAPTER 2: DATABASE SCHEMA & DATA DICTIONARY

# 🗄️ Étoile Platform — Database Schema & Data Dictionary

This document serves as the canonical reference for the Étoile Ballet Academy PostgreSQL database, maintained and managed via **Prisma ORM**. It details all entities, relationships, field constraints, indexing strategies, cascade rules, and domain-specific enumerations.

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    STAFF_USER ||--o{ COURSE : "instructs"
    STAFF_USER ||--o{ COURSE_SESSION : "leads"
    STAFF_USER ||--o{ STAFF_SHIFT : "works"
    STAFF_USER ||--o{ STAFF_LEAVE : "requests"
    
    BRANCH ||--o{ COURSE : "hosts"
    ACADEMIC_YEAR ||--o{ COURSE : "calendars"

    CATEGORY ||--o{ GROUP : "contains"
    GROUP ||--o{ COURSE_SESSION : "schedules"
    GROUP ||--o{ GROUP_ENROLLMENT : "enrolls"
    STUDENT ||--o{ GROUP_ENROLLMENT : "attends"
    
    FAMILY ||--o{ STUDENT : "encompasses"
    FAMILY ||--o{ INVOICE : "billed_to"
    FAMILY ||--o{ REFERRAL : "refers"
    
    STUDENT ||--o{ STUDENT_SUBSCRIPTION : "holds"
    STUDENT ||--o{ ATTENDANCE_RECORD : "logs"
    STUDENT ||--o{ STUDENT_NOTE : "receives"
    STUDENT ||--o{ SKILL_EVALUATION : "evaluated_in"
    STUDENT ||--o{ BOUTIQUE_ORDER : "places"
    STUDENT ||--o{ INVOICE : "billed_for"
    STUDENT ||--o{ PAYMENT_TRANSACTION : "makes"
    STUDENT ||--o{ COURSE_ENROLLMENT : "participates_in"
    STUDENT ||--o{ PAYMENT_LINK : "pays_via"
    
    SUBSCRIPTION_PLAN ||--o{ STUDENT_SUBSCRIPTION : "instantiates"
    
    COURSE ||--o{ COURSE_ENROLLMENT : "enrolled_students"
    COURSE ||--o{ COURSE_SESSION : "scheduled_classes"
    
    PRODUCT ||--o{ PRODUCT_VARIANT : "has_sizes"
    PRODUCT ||--o{ ORDER_ITEM : "ordered_in"
    
    BOUTIQUE_ORDER ||--o{ ORDER_ITEM : "contains"
    
    INVOICE ||--o{ INVOICE_LINE_ITEM : "itemized_in"
    INVOICE ||--o{ PAYMENT_TRANSACTION : "settled_by"
    INVOICE ||--o{ ETA_DOCUMENT : "certified_by"
    INVOICE ||--o{ PAYMENT_LINK : "generated_for"
    
    CASH_DRAWER_SHIFT ||--o{ PAYMENT_TRANSACTION : "accumulates"
    JOURNAL_ENTRY ||--o{ JOURNAL_ENTRY_LINE : "composed_of"
```

---

## 2. Core Entities & Data Dictionary

### 2.1 Staff & Authentication: `StaffUser`
Represents administrative, pedagogical, and operational personnel in the academy.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Unique internal identifier |
| `email` | `String` | `@unique` | Professional email login identifier |
| `name` | `String` | Required | English display name |
| `nameAr` | `String?` | Optional | Arabic display name |
| `role` | `String` | `@default("receptionist")` | Role: `superadmin`, `owner`, `receptionist`, `instructor` |
| `department` | `String` | `@default("Operations")` | Administrative or pedagogical department (EN) |
| `departmentAr` | `String?` | `@default("العمليات")` | Administrative or pedagogical department (AR) |
| `avatarUrl` | `String?` | Optional | Profile avatar image link |
| `passwordHash`| `String` | Required | Argon2id cryptographic password hash |
| `cardCode` | `String?` | `@unique` | Physical RFID or barcode identification card code |
| `phone` | `String?` | Optional | Mobile number for SMS/WhatsApp verification |
| `isFirstLogin`| `Boolean` | `@default(false)` | Flag forcing password setup on initial access |
| `otpCode` | `String?` | Optional | Ephemeral OTP for password recovery |
| `otpExpiresAt`| `DateTime?`| Optional | Expiration timestamp of the active OTP |
| `otpAttempts` | `Int` | `@default(0)` | Failed OTP verifications in the current window (locks at 5) |
| `otpLockedUntil` | `DateTime?` | Optional | OTP lockout expiry after brute-force threshold |
| `failedLoginAttempts` | `Int` | `@default(0)` | Failed password logins (locks at 10; cleared on success) |
| `loginLockedUntil` | `DateTime?` | Optional | Account lockout expiry after brute-force threshold |
| `shiftActive` | `Boolean` | `@default(false)` | Flag indicating if staff member is on active duty |
| `createdAt` | `DateTime`| `@default(now())` | Record creation timestamp |
| `updatedAt` | `DateTime`| `@updatedAt` | Automatic last modification timestamp |

---

### 2.2 Family Household: `Family`
Groups multiple students under a single parent/guardian account for billing, communications, and referral tracking.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id` | Human-readable identifier (e.g., `FAM-01`) |
| `parentName` | `String` | Required | Name of the primary parent/guardian |
| `parentPhone`| `String` | Required | Primary phone number for WhatsApp receipts |
| `parentEmail`| `String` | Required | Billing and correspondence email |
| `referralCode`| `String?`| `@unique` | Unique student/family referral invite code |
| `pinHash` | `String?` | Optional | *(Legacy / Deprecated)* Family login now unified with student credentials |
| `createdAt` | `DateTime`| `@default(now())` | Record creation timestamp |
| `updatedAt` | `DateTime`| `@updatedAt` | Automatic last modification timestamp |

---

### 2.3 Student Dancer: `Student`
Central student entity tracking profile, credentials, financial balance, and pedagogical progress.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id` | Primary identifier (e.g., `STU-001`) |
| `name` | `String` | Required | English full name |
| `nameAr` | `String` | Required | Arabic full name |
| `barcode` | `String` | `@unique` | Unique Code128 barcode number (e.g., `ETOILE-892101`) |
| `photoUrl` | `String` | Required | Profile photography URL |
| `familyId` | `String` | `FK -> Family.id` | Relationship to primary household (`onDelete: Cascade`) |
| `age` | `Int` | Required | Dancer age in years |
| `birthDate` | `DateTime?`| Optional | Dancer date of birth |
| `program` | `String` | Required | Academy curriculum: `classical`, `contemporary`, `youth` |
| `level` | `String` | Required | Conservatory level (e.g., *Pre-Professional Level IV*) |
| `walletBalance`| `Decimal` | `@default(0.0) @db.Decimal(12, 2)` | Current account balance; negative values indicate debt |
| `maxNegativeDebt`| `Decimal` | `@default(150.0) @db.Decimal(12, 2)` | Maximum allowed overdraft before kiosk check-in denial |
| `parentName` | `String` | Required | Cached parent name for rapid kiosk lookup |
| `parentPhone`| `String` | Required | Cached WhatsApp contact phone |
| `parentEmail`| `String` | Required | Cached correspondence email |
| `passwordHash`| `String?`| Optional | Argon2id hash for student & parent portal authentication |
| `isFirstLogin`| `Boolean` | `@default(true)` | Flag requiring first-time password setup via WhatsApp |
| `otpCode` | `String?` | Optional | Ephemeral password reset OTP |
| `otpExpiresAt`| `DateTime?`| Optional | Password reset OTP expiration |
| `otpAttempts` | `Int` | `@default(0)` | Failed OTP verifications in the current window (locks at 5) |
| `otpLockedUntil` | `DateTime?` | Optional | OTP lockout expiry after brute-force threshold |
| `failedLoginAttempts` | `Int` | `@default(0)` | Failed password logins (locks at 10; cleared on success) |
| `loginLockedUntil` | `DateTime?` | Optional | Account lockout expiry after brute-force threshold |
| `createdAt` | `DateTime`| `@default(now())` | Registration timestamp |
| `updatedAt` | `DateTime`| `@updatedAt` | Last profile update timestamp |

---

### 2.4 Subscription Plans & Quotas: `SubscriptionPlan` & `StudentSubscription`

#### `SubscriptionPlan`
Pre-configured class package templates offered by the academy.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id` | Plan code (e.g., `PLAN-PRE-PRO`) |
| `name` | `String` | Required | English plan title |
| `nameAr` | `String` | Required | Arabic plan title |
| `program` | `String` | Required | Target program (`classical`, `contemporary`, `youth`) |
| `maxSessions` | `Int` | Required | Number of classes included in the package |
| `durationDays`| `Int` | `@default(30)` | Validity period in days from purchase |
| `price` | `Float` | Required | Base price in academy currency |
| `description` | `String?` | Optional | Description of training privileges |
| `active` | `Boolean` | `@default(true)` | Whether the plan is currently offered |
| `createdAt` | `DateTime`| `@default(now())` | Plan creation date |

#### `StudentSubscription`
Instantiated subscription contract assigned to a specific student.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Unique contract identifier |
| `studentId` | `String` | `FK -> Student.id` | Associated student (`onDelete: Cascade`) |
| `planId` | `String?` | `FK -> SubscriptionPlan.id`| Source plan template (nullable) |
| `planName` | `String` | Required | Snapshot of plan name at time of sale |
| `planNameAr` | `String` | Required | Arabic snapshot of plan name |
| `startDate` | `DateTime`| Required | Contract activation date |
| `endDate` | `DateTime`| Required | Contract expiration date |
| `maxSessions` | `Int` | Required | Total allocated sessions |
| `usedSessions`| `Int` | `@default(0)` | Number of sessions redeemed through check-ins |
| `price` | `Float` | Required | Actual purchase price paid |
| `dailyAccrualRate`| `Float` | `@default(0.0)` | Prorated daily revenue recognition rate ($\frac{P}{T_{days}}$) |
| `status` | `String` | `@default("active")` | Status: `active`, `expired_quota`, `expired_date` |
| `createdAt` | `DateTime`| `@default(now())` | Enrollment date |
| `updatedAt` | `DateTime`| `@updatedAt` | Last modification date |

---

### 2.5 Attendance Tracking: `AttendanceRecord`
Immutable ledger entry created upon every kiosk check-in attempt.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Unique audit record identifier |
| `studentId` | `String` | `FK -> Student.id` | Checked-in student (`onDelete: Cascade`) |
| `studentName` | `String` | Required | Cached student name for audit speed |
| `barcode` | `String` | Required | Barcode scanned at kiosk |
| `timestamp` | `DateTime`| `@default(now())` | Exact check-in timestamp |
| `classTitle` | `String` | Required | Associated scheduled ballet class |
| `verifiedMethod`| `String` | `@default("hid_barcode")`| Input device: `hid_barcode`, `qr_camera`, `manual` |
| `premiseVerified`| `Boolean`| `@default(true)` | Premise validation result |
| `wifiBssid` | `String` | Required | Network BSSID of the check-in terminal |
| `status` | `String` | `@default("granted")` | Access decision: `granted`, `denied_expired`, `denied_quota` |
| `quotaRemaining`| `Int` | Required | Remaining sessions snapshot after deduction |

---

### 2.6 Courses & Timetables: `Course`, `CourseEnrollment`, `CourseSession`

#### `Course`
Defines recurring ballet curriculum courses.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Internal course identifier |
| `code` | `String` | `@unique` | Official course code (e.g., `BAL-CL-101`) |
| `title` | `String` | Required | Course name in English |
| `titleAr` | `String?` | Optional | Course name in Arabic |
| `description` | `String?` | Optional | Detailed curriculum description (EN) |
| `descriptionAr`| `String?`| Optional | Detailed curriculum description (AR) |
| `program` | `String` | Required | Program: `classical`, `contemporary`, `youth` |
| `level` | `String` | Required | Target level: `pre-pro`, `conservatory`, `beginner` |
| `capacity` | `Int` | `@default(20)` | Maximum student enrollment capacity |
| `instructorId`| `String?` | `FK -> StaffUser.id`| Lead faculty instructor (`onDelete: SetNull`) |
| `dayOfWeek` | `String?` | Optional | Scheduled days (e.g., `Monday, Wednesday, Friday`) |
| `startTime` | `String?` | Optional | Start time string (e.g., `16:00`) |
| `endTime` | `String?` | Optional | End time string (e.g., `17:30`) |
| `studioRoom` | `String?` | `@default("Studio Petipa")`| Assigned physical dance hall |
| `active` | `Boolean` | `@default(true)` | Active status flag |

#### `CourseEnrollment`
Associates an active student with a course.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Unique enrollment identifier |
| `courseId` | `String` | `FK -> Course.id` | Associated course (`onDelete: Cascade`) |
| `studentId` | `String` | `FK -> Student.id` | Enrolled student (`onDelete: Cascade`) |
| `enrolledAt` | `DateTime`| `@default(now())` | Enrollment date |
| `status` | `String` | `@default("active")` | Status: `active`, `completed`, `dropped` |

*Unique Constraint*: `@@unique([courseId, studentId])` prevents duplicate enrollments.

#### `CourseSession`
Individual calendar instances of a course.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Unique session identifier |
| `courseId` | `String` | `FK -> Course.id` | Parent course (`onDelete: Cascade`) |
| `title` | `String` | Required | Repertoire or session focus title |
| `sessionDate` | `DateTime`| Required | Date of the class session |
| `startTime` | `String` | Required | Session start time (`HH:mm`) |
| `endTime` | `String` | Required | Session end time (`HH:mm`) |
| `studioRoom` | `String` | `@default("Studio Petipa")`| Studio room designation |
| `instructorId`| `String?` | `FK -> StaffUser.id`| Teaching faculty instructor |
| `reminderSent`| `Boolean` | `@default(false)` | Flag indicating automated WhatsApp reminder sent |
| `status` | `String` | `@default("scheduled")` | Status: `scheduled`, `completed`, `cancelled` |
| `notes` | `String?` | Optional | Attire or repertoire notes for dancers |

---

### 2.7 Point of Sale Boutique: `Product`, `ProductVariant`, `BoutiqueOrder`, `OrderItem`

#### `Product` & `ProductVariant`
Manages academy dancewear, pointe shoes, and accessories with size-level inventory control.

- **`Product`**:
  - `id`: Unique product ID (e.g., `PROD-01`)
  - `title` & `titleAr`: Bilingual product naming
  - `category`: `pointe_shoes`, `leotards`, `tights`, `apparel`, `accessories`
  - `price`: Standard retail selling price
  - `sku`: Unique stock keeping unit code
  - `imageUrl`: Product showcase image

- **`ProductVariant`**:
  - `id`: Variant identifier
  - `productId`: Parent product (`onDelete: Cascade`)
  - `size`: Sizing designation (e.g., `36 XXX`, `Adult S/M`, `Child L`)
  - `stock`: Available real-time inventory count
  - *Unique Constraint*: `@@unique([productId, size])`

#### `BoutiqueOrder` & `OrderItem`
Records retail sales transactions.

- **`BoutiqueOrder`**:
  - `orderNumber`: Unique readable order code (e.g., `ORD-9821`)
  - `studentId`: Optional customer reference (`onDelete: SetNull`)
  - `customerName`: Buyer name
  - `paymentMethod`: `cash`, `card`, `transfer`, `wallet_debt`
  - `totalAmount`: Total purchase sum
  - `ledgerStatus`: `settled` or `charged_debt`

- **`OrderItem`**:
  - `orderId`: Associated order (`onDelete: Cascade`)
  - `productId`: Referenced catalog product (`onDelete: Restrict`)
  - `title`: Product name snapshot
  - `size`: Selected size variant
  - `price`: Price snapshot per unit
  - `quantity`: Units purchased

---

### 2.8 Financial Accounting Suite Entities

#### `Expense`
Studio operational and pedagogical expenses.
- `expenseNumber`: Unique expense identifier (e.g., `EXP-2026-081`)
- `category`: `studio_rent`, `utilities`, `piano_maintenance`, `costumes_production`, `cleaning_sanitization`, `marketing_social`, `software_licenses`, `administrative_legal`
- `description`: Expense explanation
- `amount` & `vatAmount`: Subtotal and VAT breakdowns
- `total`: Total disbursement
- `vendor`: Payee or service provider
- `paymentMethod`: `bank_transfer`, `petty_cash`, `corporate_card`
- `status`: `approved`, `pending_audit`, `rejected`
- `approvedBy`: Approving administrator

#### `Invoice` & `InvoiceLineItem`
Billing and Accounts Receivable (AR) management.
- `invoiceNumber`: Unique invoice code (e.g., `INV-2026-104`)
- `studentId` & `familyId`: Associated account references
- `issueDate` & `dueDate`: Invoice timeline
- `subtotal`, `taxAmount`, `total`: Financial totals
- `amountPaid`: Cumulative settlement amount
- `remainingDue`: Unsettled balance
- `status`: `unpaid`, `partially_paid`, `paid`, `overdue`, `cancelled`
- `agingBucket`: `current`, `1_30_days`, `31_60_days`, `over_60_days`

#### `PaymentTransaction`
Settlements recorded against invoices or cash shifts.
- `transactionNumber`: Unique receipt number
- `invoiceId`: Settled invoice reference
- `studentId`: Paying student reference
- `amount`: Transaction amount
- `method`: `cash`, `card`, `bank_transfer`, `fawry`, `instapay`
- `receivedBy`: Staff member taking payment
- `shiftId`: Associated open cash drawer shift

#### `PayrollRecord`
Monthly faculty salary and instruction compensation.
- `instructorId`: Associated faculty member
- `month`: Payroll period (e.g., `2026-09`)
- `baseSalary`: Fixed monthly base compensation
- `hourlyRate` & `hoursTaught`: Group classes compensation
- `privateSessionsCount` & `privateSessionRate`: Solo instruction compensation
- `bonuses` & `deductions`: Adjustments
- `netPayable`: Final calculated remuneration
- `status`: `pending`, `processed`, `paid`

#### `JournalEntry` & `JournalEntryLine`
Double-entry general ledger vouchers.
- `voucherNumber`: Unique journal voucher code
- `memo`: Transaction description
- `totalDebit` & `totalCredit`: Balanced ledger totals
- `lines`: Individual debit/credit entries against account codes (`1010 Cash`, `4010 Tuition`, etc.)

#### `CashDrawerShift`
Front-desk cash drawer register management.
- `shiftNumber`: Unique shift code
- `cashierName`: Cashier on duty
- `openingFloat`: Initial cash balance
- `cashSalesTotal` & `cashDrops`: Cash transactions during shift
- `expectedCash`: Calculated cash expectation ($Float + Sales - Drops$)
- `actualCashCounted`: Cash physical count upon shift closure
- `variance`: Discrepancy ($Actual - Expected$)
- `status`: `open` or `closed`

---

### 2.9 Admissions & Student CRM Entities

#### `AdmissionLead`
Prospective dancer inquiries and audition pipeline.
- `dancerName`, `age`, `parentName`, `parentPhone`, `parentEmail`: Contact details
- `program`: Desired discipline (`classical`, `contemporary`, `youth`)
- `stage`: Pipeline stage: `new_inquiry`, `audition_scheduled`, `evaluated`, `enrolled`, `rejected`
- `experience`: Prior ballet training history
- `notes`: Artistic director comments
- `convertedStudentId`: Linked student ID once converted

#### `StudentNote` & `SkillEvaluation`
Pedagogical progress and clinical/artistic evaluation.
- **`StudentNote`**:
  - `author` & `authorRole`: Note author
  - `category`: `general`, `medical`, `tuition`, `performance`
  - `text`: Detailed note content
- **`SkillEvaluation`**:
  - `evaluator`: Master instructor name
  - Scores: `barre`, `center`, `allegro`, `musicality` (scale 0.0 to 10.0)
  - `notes`: Performance feedback

---

### 2.10 Communications, Auditing & CMS Configuration

#### `PortalContentStore`
Stores the dynamic JSON document driving public landing page content (`hero`, `branding`, `faculty`, `programs`, `performances`, `notice`).

#### `WhatsAppReminderConfig` & `WhatsAppGatewayConfig`
Maintains operational settings for automated pre-session WhatsApp notifications:
- `sendMinutesBefore`: Minutes prior to class when notifications dispatch (e.g., 60 minutes)
- `studentTemplateEn` / `studentTemplateAr`: Bilingual notification templates for students
- `instructorTemplateEn` / `instructorTemplateAr`: Bilingual notification templates for faculty
- `gatewayUrl`, `apiKey`, `sessionName`, `status`: Gateway connectivity parameters
- `autoCron`: Automated reminder scheduler flag

#### `OpenWaLog`
Chronological dispatch log of all outbound automated and manual WhatsApp notifications.
- `id`: Unique log identifier (`cuid()`)
- `recipientPhone`: Mobile recipient number with international country code
- `recipientName`: Dancer, parent, or faculty recipient name
- `triggerEvent`: Dispatch trigger event (`checkin_receipt`, `session_reminder`, `password_otp`, `manual_dispatch`, `course_broadcast`)
- `language`: Selected template language (`en` or `ar`)
- `body`: Rendered text message content
- `status`: Dispatch state (`dispatched`, `delivered`, `failed`)
- `createdAt`: Timestamp of message dispatch

#### `CrmAuditEntry`
System-wide administrative audit trail logging sensitive operational actions.
- `id`: Unique audit log identifier (`cuid()`)
- `action`: Executed action (e.g., `lead_converted`, `debt_adjusted`, `shift_closed`, `staff_created`)
- `actor`: Staff member or system process initiating the action
- `details`: Serialized JSON details or contextual notes
- `category`: Audit domain: `crm`, `auth`, `pos`, `attendance`, `accounting`
- `createdAt`: Timestamp of logged event

---

### 2.11 Session Refresh Tokens: `RefreshToken`
Opaque, single-use refresh tokens backing the short-lived access-token scheme (§5.2 of the architecture doc). Only SHA-256 hashes are persisted — raw tokens never touch the database.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Unique token record identifier |
| `tokenHash` | `String` | `@unique` | SHA-256 hex of the opaque refresh token |
| `subjectType` | `String` | Required | `staff`, `family`, or `student` |
| `subjectId` | `String` | Required | Staff, family, or student id the token was issued to |
| `expiresAt` | `DateTime` | Required | Absolute expiry (30 days via `REFRESH_TOKEN_TTL`) |
| `revokedAt` | `DateTime?` | Optional | Set on rotation/logout; revoked tokens are rejected, and re-presenting one triggers theft revocation of the whole subject |
| `createdAt` | `DateTime` | `@default(now())` | Issuance timestamp |

---

### 2.12 Online Payment Links: `PaymentLink`
Provider-agnostic online pay-link records (Paymob / Fawry / InstaPay). Live gateway keys plug in later via `providerRef` without schema changes.

| Field Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Unique link record identifier |
| `ref` | `String` | `@unique` | Unguessable provider reference (e.g. `PAYMOB-A1B2C3`); doubles as webhook secret |
| `provider` | `String` | Required | `paymob`, `fawry`, or `instapay` |
| `amount` | `Float` | Required | Rounded payable amount |
| `currency` | `String` | `@default("EGP")` | Settlement currency |
| `invoiceId` | `String?` | Optional | Linked invoice when created against one |
| `studentId` | `String?` | Optional | Linked dancer when created against one |
| `phone` | `String?` | Optional | Parent phone the link was shared with |
| `status` | `String` | `@default("pending")` | `pending`, `paid`, `failed`, `expired`, `cancelled` |
| `url` | `String` | Required | Portal payment URL embedding the ref |
| `providerRef` | `String?` | Optional | Live gateway transaction id once integrated |
| `expiresAt` | `DateTime` | Required | Link expiry (48h after creation) |
| `paidAt` | `DateTime?` | Optional | Settlement timestamp |
| `createdAt` | `DateTime` | `@default(now())` | Issuance timestamp |

---

### 2.13 Multi-Campus & Academic Calendar: `Branch` & `AcademicYear`

#### `Branch`
Represents physical conservatory campuses (e.g., *Zamalek Main Campus*, *New Cairo Annex*).
- `id`: Unique identifier (e.g., `branch-zamalek`)
- `name`: English branch name
- `nameAr`: Arabic branch name
- `code`: Unique shortcode (`ZAM`, `NCAIRO`)
- `address`: Physical campus address
- `phone`: Front-desk contact line
- `isMain`: Flag designating the flagship conservatory
- `active`: Operational status

#### `AcademicYear`
Defines operational terms and curricular sessions (e.g., `2025/2026`).
- `id`: Unique term identifier
- `name`: Term name
- `startDate` / `endDate`: Academic window bounds
- `isCurrent`: Boolean flag marking the active school term
- `active`: Status flag

---

### 2.14 Academy Structure: `Category`, `Group` & `GroupEnrollment`

#### `Category`
Top-level artistic discipline or age program (e.g., *Classical Ballet Division*, *Contemporary Conservatory*).
- `id`: Category code
- `name` / `nameAr`: Bilingual titles
- `description`: Curricular objectives
- `order`: Visual display ordering

#### `Group`
Cohorts of students learning together under an assigned lead instructor.
- `id`: Group code (e.g., `GRP-PRE-PRO-A`)
- `name` / `nameAr`: Bilingual group names
- `categoryId`: Foreign key to parent `Category`
- `leadInstructorId`: Primary master instructor from `StaffUser`

#### `GroupEnrollment`
Associates student dancers with their active groups (`studentId`, `groupId`, `enrolledAt`).

---

### 2.15 Staff Shifts & Leave Governance: `StaffShift` & `StaffLeave`

#### `StaffShift`
Front-desk receptionist and teaching faculty shift roster.
- `id`: Shift record ID
- `staffId`: Foreign key to `StaffUser`
- `date`: Calendar date of scheduled duty
- `startTime` / `endTime`: Working hours (e.g., `09:00` - `17:00`)
- `duty`: Assigned station (*Front desk reception*, *Studio supervision*, *Private coaching*)
- `status`: `scheduled`, `completed`, `cancelled`

#### `StaffLeave`
Time-off and vacation requests with administrative approval flow (`from`, `to`, `reason`, `status: pending|approved|rejected`, `decidedBy`).

---

### 2.16 Egyptian Tax Authority E-Receipts: `EtaDocument`
Manages electronic invoicing and fiscal receipt submissions compliant with ETA specifications.
- `id`: Document identifier
- `invoiceId`: Linked `Invoice` reference
- `docType`: `receipt` (B2C) or `invoice` (B2B)
- `etaDocUuid`: UUID returned upon ETA portal acceptance
- `status`: `draft`, `submitted`, `valid`, `invalid`, `cancelled`
- `submissionDate`: Transmission timestamp
- `totalAmount` / `taxAmount`: Fiscal amounts in `Decimal(12, 2)`
- `rawPayload` / `rawResponse`: Cryptographic payload and receipt response for audit compliance

---

### 2.17 Conservatory Press & Articles: `BlogPost`
Content store for academy announcements, audition calls, and ballet performance reviews.
- `id`: Article ID
- `slug`: SEO-friendly URL slug (`@unique`)
- `title` / `titleAr`: Bilingual article headlines
- `content` / `contentAr`: Rich markdown article bodies
- `coverUrl`: Header photography link
- `published`: Publication visibility flag
- `publishedAt`: Publication timestamp

---

### 2.18 Growth, Loyalty & Promotions: `Referral` & `PromoCode`

#### `Referral`
Tracks student-to-student referral invites and earned incentives.
- `id`: Referral event ID
- `referrerFamilyId`: Recommending household
- `referredFamilyId` / `referredStudentId`: Newly registered dancer
- `code`: Referral invite code
- `status`: `pending`, `rewarded`, `expired`
- `rewardApplied`: Boolean flag indicating tuition credit applied

#### `PromoCode`
Discount vouchers for seasonal workshops, audition fees, or boutique uniforms.
- `id`: Promo code ID
- `code`: Alphanumeric voucher code (`@unique`)
- `discountPercent`: Percentage off (e.g., `15.0`)
- `discountAmount`: Fixed currency deduction (`Decimal(12, 2)`)
- `maxUses` / `timesUsed`: Usage caps and counters
- `validFrom` / `validUntil`: Validity window
- `active`: Promo status flag





<!-- ============================================================================== -->
<!-- SECTION 4: CHAPTER 3: REST API SPECIFICATION & SECURITY -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/docs/03_REST_API_SPECIFICATION.md -->
<!-- ============================================================================== -->

# 4. CHAPTER 3: REST API SPECIFICATION & SECURITY

# 📡 Étoile Platform — REST API Specification & Security Reference

This document provides the exhaustive specification for the Étoile Ballet Academy NestJS REST API (`http://localhost:3001/api`). It details every HTTP endpoint, security guard, RBAC permission, request body DTO, and JSON response structure.

---

## 1. Global API Standards & Protocols

- **Base URL**: `http://localhost:3001/api`
- **Payload Format**: `application/json; charset=utf-8`
- **Authentication**: Short-lived JWT access tokens (30 min, `ACCESS_TOKEN_TTL`) in the `Authorization` header, renewed via rotating opaque refresh tokens:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
  Full session lifecycle is documented in §2.9 (refresh, rotation, reuse detection, logout).
- **Pagination**: All list endpoints accept `?page=` / `?limit=` (bounded server-side, e.g. `GET /api/students?page=2&limit=50`). Responses remain plain JSON arrays.
- **Health**: `GET /api/health` (public) returns `{ status: 'ok'|'degraded', db: 'up'|'down', time }`.
- **Rate Limiting**: Defended by `@nestjs/throttler` (default: 120 requests/minute per IP) with per-route budgets on brute-force-sensitive auth endpoints (login/card/family 60/min, OTP request 10/min, OTP verify 30/min, refresh 30/min). Password guessing is primarily defeated by **per-account lockout**: 10 wrong passwords lock the account for 15 minutes (`429 Too Many Requests`), surviving IP rotation; a successful login clears the counter.
- **Security Headers**: Managed by `helmet` with an explicit Content Security Policy (self-only scripts; images from self/`data:`/https for Unsplash photos and WhatsApp QR codes).
- **Validation**: Strict global `ValidationPipe` stripping non-whitelisted properties and transforming primitives.

### Standard Response Status Codes
| HTTP Code | Name | Semantic Application |
| :--- | :--- | :--- |
| `200 OK` | Standard Success | Successful retrieval, modification, or operational command |
| `201 Created` | Resource Created | Successful record creation, check-in, or registration |
| `400 Bad Request` | Validation Error | Malformed body, missing required fields, or validation constraint failed |
| `401 Unauthorized` | Auth Failure | Missing, expired, or cryptographically invalid Bearer JWT |
| `403 Forbidden` | RBAC Insufficient | Valid JWT, but the user's role lacks access to the requested endpoint |
| `404 Not Found` | Not Found | Target student, course, session, or resource does not exist |
| `429 Too Many Requests`| Throttled | Client has exceeded 120 requests within the rolling 60-second window |

---

## 2. Authentication Module (`/api/auth`)

Manages login, smart card RFID scanning, first-time student onboarding, OTP recovery, and staff management.

### 2.1 Staff Password Login
`POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "identifier": "director@etoile.fr",
    "password": "etoile2026"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "refresh_token": "9f2c…(opaque, single-use, 30-day)",
    "expires_in": 1800,
    "user": {
      "id": "STAFF-01",
      "name": "Madame Elena Rostova",
      "nameAr": "مدام إيلينا روستوفا",
      "email": "director@etoile.fr",
      "role": "superadmin",
      "department": "Artistic Direction",
      "cardCode": "DIR-01",
      "shiftActive": true
    }
  }
  ```
  `expires_in` is the access-token lifetime in seconds. Clients must call `POST /api/auth/refresh` before expiry (§2.9).

### 2.2 Physical Card Code Login (Student & Staff)
`POST /api/auth/card-login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "cardCode": "ETOILE-892101",
    "password": "etoile2026"
  }
  ```
- **Response `201 Created` (Student)**:
  ```json
  {
    "success": true,
    "userType": "student",
    "mustChangePassword": false,
    "student": {
      "id": "STU-001",
      "name": "Maya Moreau",
      "barcode": "ETOILE-892101",
      "walletBalance": 45.0
    },
    "subscription": {
      "id": "sub_cuid...",
      "planName": "Conservatory Classical Elite (16 Sessions)",
      "remainingSessions": 2,
      "totalSessions": 16,
      "endDate": "2026-09-14T00:00:00.000Z"
    }
  }
  ```
  Successful (non-first-time) logins also return `access_token`, `refresh_token` and `expires_in` per §2.1. First-time logins return a single-purpose setup token (`mustChangePassword: true`) that is **rejected by every guarded endpoint** — it can only be consumed implicitly via §2.4.

### 2.3 Request First-Time Setup Temporary Password
`POST /api/auth/request-initial-password`
- **Access**: Public
- **Request Body**:
  ```json
  { "cardCode": "ETOILE-892102" }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "userType": "student",
    "maskedPhone": "+33 6 ** ** ** 01",
    "message": "Temporary verification code dispatched to registered WhatsApp"
  }
  ```

### 2.4 Complete First-Time Password Setup
`POST /api/auth/first-time-setup`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "cardCode": "ETOILE-892102",
    "tempPassword": "etoile2026",
    "newPassword": "NewSecurePassword2026!"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Password updated successfully. You may now log in."
  }
  ```

### 2.5 Request Password Reset OTP
`POST /api/auth/forgot-password/request-otp`
- **Access**: Public (10 requests/min per IP — requesting only notifies the victim's own number)
- **Request Body**: `{ "cardCode": "ETOILE-892101" }`
- **Response `201 Created`**: Returns masked phone and logs a crypto-random 6-digit OTP in the OpenWA queue (10-minute validity). After 5 wrong verifications the code locks for 15 minutes (`Too many incorrect attempts`).

### 2.6 Reset Password with OTP
`POST /api/auth/forgot-password/reset`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "cardCode": "ETOILE-892101",
    "otp": "892104",
    "newPassword": "BrandNewSecret2026!"
  }
  ```

### 2.7 Student & Parent Authentication (Unified Card & Credential Login)
`POST /api/auth/card-login`
- **Access**: Public
- **Request Body**: `{ "cardCode": "ETOILE-892101", "password": "..." }`
- **Identifier**: Accepts student physical card barcode (`ETOILE-XXXXXX`), student ID (`STU-XXX`), registered parent email, or registered parent phone.
- **Parents**: Log in seamlessly using their dancer's credentials (student card barcode, student ID, or registered parent email/phone with student password).
- **Response `201 Created`**: Returns authenticated session tokens, `userType: 'student'`, `student` profile, `familyId`, linked `family` household details, subscriptions, and active enrollments.
*(Note: Legacy passwordless `/api/auth/family/login`, family PIN endpoints, and demo family accounts have been permanently deprecated and disabled).*

### 2.8 Profile & Demo Helpers
- `GET /api/auth/demo-cards`: Public endpoint returning quick-fill test card badges for students and staff.
- `GET /api/auth/family/me`: Returns authenticated family household profile with all linked students (`JwtAuthGuard` required). Supported for student sessions.
- `GET /api/auth/me`: Returns current authenticated staff user profile (`JwtAuthGuard` required).

### 2.9 Session Refresh, Rotation & Logout
Access tokens live 30 minutes (`ACCESS_TOKEN_TTL`, seconds-overrideable). Refresh tokens are opaque, single-use, 30-day (`REFRESH_TOKEN_TTL`) SHA-256-hashed records in `RefreshToken`.
- `POST /api/auth/refresh`: Body `{ "refreshToken": "<opaque>" }` → `201` with a fresh `{ access_token, refresh_token, expires_in }` pair; the presented token is revoked (rotation). Re-presenting an already-rotated token signals theft: **all tokens of that subject are revoked** and the call returns `401`.
- `POST /api/auth/logout`: Body `{ "refreshToken": "<opaque>" }` → revokes that refresh token (`200`, idempotent).
- Unknown/expired/revoked refresh tokens → `401 Unauthorized` (no information leakage).

### 2.10 Staff Roster & User Management
- `GET /api/auth/staff`: Returns all staff members (`JwtAuthGuard` required).
- `POST /api/auth/staff`: Creates a new staff member (`@Roles('superadmin', 'owner')`).
- `PATCH /api/auth/staff/:id/shift`: Toggles on-duty shift status (`@Roles('superadmin', 'owner')`).
- `PATCH /api/auth/staff/:id/role`: Updates staff role (`@Roles('superadmin', 'owner')`).
- `PATCH /api/auth/staff/:id/password`: Resets staff password (`@Roles('superadmin', 'owner')`).
- `DELETE /api/auth/staff/:id`: Deletes a staff member with self-deletion prevention guards (`@Roles('superadmin', 'owner')`).

---

## 3. Courses & Curriculum Module (`/api/courses`)

Provides curriculum definition, weekly session scheduling, enrollment rosters, and WhatsApp reminders.

### 3.1 Course Catalog & Timetables
- `GET /api/courses?program=classical&instructorId=STAFF-01`: Retrieves courses filtered by program and instructor. **Public**, but contact details follow viewer scoping: anonymous callers receive no staff emails/phones; signed-in viewers receive the full instructor card.
- `GET /api/courses/:id`: Retrieves a single course with relations. Credential columns (`passwordHash`, OTP) and non-staff household contacts are never serialized.
- `POST /api/courses`: Creates a course (`@Roles('superadmin', 'owner', 'receptionist')`).
  ```json
  {
    "code": "BAL-CL-102",
    "title": "Vaganova Level V Variations",
    "titleAr": "تنويعات فاجانوفا المستوى الخامس",
    "program": "classical",
    "level": "pre-pro",
    "capacity": 16,
    "instructorId": "STAFF-01",
    "dayOfWeek": "Monday, Thursday",
    "startTime": "18:00",
    "endTime": "19:30",
    "studioRoom": "Grand Studio Petipa"
  }
  ```
- `PATCH /api/courses/:id`: Modifies course attributes (`@Roles('superadmin', 'owner', 'receptionist')`).
- `DELETE /api/courses/:id`: Removes a course (`@Roles('superadmin', 'owner', 'receptionist')`).

### 3.2 Scheduled Sessions & Calendar
- `GET /api/courses/sessions?courseId=CRS-CLASS-01`: Lists scheduled class sessions.
- `POST /api/courses/:id/sessions`: Creates an individual calendar class session (`@Roles('superadmin', 'owner', 'receptionist', 'instructor')`).
  ```json
  {
    "title": "Giselle Act II Wili Variations",
    "sessionDate": "2026-09-22T16:00:00.000Z",
    "startTime": "16:00",
    "endTime": "17:30",
    "studioRoom": "Grand Studio Petipa",
    "instructorId": "STAFF-01",
    "notes": "Bring white romantic tutu skirt"
  }
  ```
- `PATCH /api/courses/sessions/:sessionId`: Updates session notes, room, or timing.
- `DELETE /api/courses/sessions/:sessionId`: Deletes a session.

### 3.3 Course Enrollment & Roster
- `POST /api/courses/:id/enroll`: Enrolls a student in a course (`@Roles('superadmin', 'owner', 'receptionist', 'instructor')`).
  ```json
  { "studentId": "STU-001" }
  ```
- `DELETE /api/courses/:id/enroll/:studentId`: Unenrolls a student from a course.

### 3.4 Personalized Schedules
- `GET /api/courses/student/my-schedule/:identifier`: Returns upcoming classes, remaining quota, and enrolled courses for a student. **Public for kiosk use, but `parentPhone` is only included for signed-in viewers** — anonymous barcode lookups cannot be used as a phone directory.
- `GET /api/courses/instructor/my-schedule/:identifier`: Returns the weekly teaching timetable, enrolled student counts, and studio assignments for an instructor. Staff emails/phones and roster parent phones are served only to authenticated (staff) viewers.

### 3.5 Automated WhatsApp Reminders & Broadcast
- `GET /api/courses/reminders/config`: Retrieves pre-session notification settings.
- `PATCH /api/courses/reminders/config`: Updates reminder window and templates (`@Roles('superadmin', 'owner', 'receptionist')`).
  ```json
  {
    "enabled": true,
    "sendMinutesBefore": 45,
    "studentTemplateEn": "Bonjour {studentName}! Reminder for your {courseTitle} today at {time} in {studio}."
  }
  ```
- `POST /api/courses/sessions/:sessionId/send-reminder`: Manually triggers WhatsApp reminders to all enrolled dancers for that session.
- `POST /api/courses/:id/broadcast`: Broadcasts a custom announcement message to all dancers enrolled in the course.

---

## 4. Students & CRM Module (`/api/students`)

Manages dancer profiles, digital ID badges, wallet debt, evaluations, and pedagogical notes.

- `GET /api/students`: Returns all students with active subscriptions and attendance logs.
- `GET /api/students/:id`: Returns single student details.
- `POST /api/students`: Registers a new student dancer.
  ```json
  {
    "name": "Sylvie Guillem",
    "nameAr": "سيلفي غيليم",
    "age": 17,
    "program": "classical",
    "level": "Conservatory Soloist",
    "parentName": "Pierre Guillem",
    "parentPhone": "+33 6 88 12 34 56",
    "parentEmail": "pierre@guillem.fr",
    "planTier": "PLAN-PRE-PRO"
  }
  ```
- `PATCH /api/students/:id`: Updates demographic or program info.
- `DELETE /api/students/:id`: Removes a student and cascades related records.
- `PATCH /api/students/:id/wallet`: Modifies student wallet balance (`{ "amount": 50.0 }`).
- `PATCH /api/students/:id/quota`: Modifies remaining subscription classes (`{ "delta": 2 }`).
- `POST /api/students/:id/notes`: Adds a medical, general, or performance note.
- `POST /api/students/:id/evaluations`: Submits ballet technical evaluations (barre, center, allegro, musicality).

---

## 5. Subscriptions & Packages Module (`/api/subscriptions`)

Manages conservatory tuition packages, class session quotas, duration validity, and subscription eligibility evaluation.

### 5.1 List Active Subscription Plans
`GET /api/subscriptions/plans`
- **Access**: Public
- **Description**: Returns all currently active subscription plan templates offered by the academy ordered by price descending.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "PLAN-PRE-PRO",
      "name": "Conservatory Classical Elite (16 Sessions)",
      "nameAr": "النخبة الكلاسيكية للمعهد (16 حصة)",
      "program": "classical",
      "maxSessions": 16,
      "durationDays": 30,
      "price": 4800.0,
      "description": "Intensive daily Vaganova technique, pointe variations, and pas de deux masterclasses.",
      "active": true
    }
  ]
  ```

### 5.2 Create Subscription Plan
`POST /api/subscriptions/plans`
- **Access**: `@Roles('superadmin', 'owner')`
- **Request Body**:
  ```json
  {
    "name": "Contemporary Soloist Intensive (12 Sessions)",
    "nameAr": "مكثف الصولو المعاصر (12 حصة)",
    "program": "contemporary",
    "maxSessions": 12,
    "durationDays": 30,
    "price": 3600.0,
    "description": "Floorwork, Gaga technique, and repertory development."
  }
  ```
- **Response `201 Created`**: Returns the created `SubscriptionPlan` record.

### 5.3 Evaluate Subscription Eligibility
`POST /api/subscriptions/evaluate`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "maxSessions": 16,
    "usedSessions": 14,
    "startDate": "2026-09-01T00:00:00.000Z",
    "cycleDays": 30,
    "scanDate": "2026-09-18T14:30:00.000Z",
    "price": 4800.0
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "active",
    "allowed": true,
    "remainingSessions": 2,
    "usedSessions": 14,
    "maxSessions": 16,
    "daysRemaining": 13,
    "dailyAccrualRate": 160.0,
    "reason": "Subscription verified and valid."
  }
  ```

---

## 6. Fast-Track Attendance Module (`/api/attendance`)

High-speed kiosk check-in verification engine.

### 6.1 Process Check-In
`POST /api/attendance/checkin`
- **Access**: `@Roles('superadmin', 'owner', 'receptionist', 'instructor', 'family', 'student')` — families/students are household-scoped (own dancers only, else `denied_scope`).
- **Request Body**:
  ```json
  {
    "barcode": "ETOILE-892101",
    "method": "hid_barcode",
    "wifiBssid": "Etoile-Secure-5G [F4:92:BF:11:80:A2]"
  }
  ```
  `premiseVerified` is computed **server-side** by comparing `wifiBssid` against `PREMISE_WIFI_BSSID` — a spoofed fingerprint yields a granted-but-unverified record, never a trusted one. A repeat scan within the 60-second double-fire window returns the original grant with `"duplicate": true` instead of consuming a second session.
- **Response `201 Created` (Granted)**:
  ```json
  {
    "success": true,
    "status": "granted",
    "student": {
      "id": "STU-001",
      "name": "Maya Moreau",
      "barcode": "ETOILE-892101",
      "walletBalance": 45.0
    },
    "record": {
      "id": "att_cuid...",
      "timestamp": "2026-09-18T14:30:00.000Z",
      "classTitle": "Conservatory Pointe & Variations",
      "quotaRemaining": 1,
      "premiseVerified": true
    },
    "message": "Access Granted: Class quota decremented to 1"
  }
  ```
- **Response `200 OK` (Denied — Quota Exhausted)**:
  ```json
  {
    "success": false,
    "status": "denied_quota",
    "student": { "id": "STU-004", "name": "Amira Al-Mansoor" },
    "reason": "Class package quota exhausted (0 remaining). Please renew at reception."
  }
  ```

### 6.2 Attendance Audit Logs
`GET /api/attendance/logs`
- **Access**: Authenticated Staff
- Returns chronological check-in events with status, device method, and timestamp.

---

## 7. Point of Sale Boutique Module (`/api/pos`)

Controls conservatory dancewear, inventory stock, and retail checkout.

- `GET /api/pos/products`: Lists products with size variant inventories.
- `POST /api/pos/products`: Adds a retail product (`@Roles('superadmin', 'owner', 'receptionist')`).
- `PATCH /api/pos/products/:id`: Updates product metadata or price.
- `DELETE /api/pos/products/:id`: Deletes a product.
- `PATCH /api/pos/products/:id/stock`: Updates variant inventory stock.
  ```json
  {
    "size": "38 XXX",
    "stock": 20
  }
  ```
- `GET /api/pos/orders`: Retrieves historical boutique sales orders.
- `POST /api/pos/checkout`: Completes a retail checkout transaction (`@Roles('superadmin', 'owner', 'receptionist', 'family', 'student')`; portal roles are household-scoped for `wallet_debt`). **Pricing is server-authoritative**: every line is re-priced from the product catalog (client-sent prices are ignored) and variant stock is validated before any ledger movement — insufficient stock returns `400`.
  ```json
  {
    "customerName": "Éléonore Moreau",
    "studentId": "STU-001",
    "paymentMethod": "wallet_debt",
    "items": [
      {
        "productId": "PROD-01",
        "title": "Grishko 2007 Pro Pointe Shoes",
        "size": "37 XXX",
        "quantity": 1,
        "price": 115.0
      }
    ]
  }
  ```

---

## 8. Financial Accounting Suite (`/api/accounting`)

Comprehensive financial management, revenue recognition, P&L, AR, expenses, payroll, and cash drawers.

### 8.1 Profit & Loss Statement
`GET /api/accounting/pnl`
- **Access**: `@Roles('superadmin', 'owner')`
- **Response `200 OK`**:
  ```json
  {
    "period": "Current Academic Term 2026 (EGP / ج.م)",
    "currency": "EGP",
    "revenue": {
      "totalSubscriptionsSold": 94800,
      "recognizedSubscriptions": 61200,
      "deferredRevenue": 33600,
      "retailGrossMargin": 48300,
      "totalRecognizedInflow": 109500
    },
    "expenses": {
      "payroll": 42000,
      "opex": 28400,
      "totalOperationalOutflow": 70400
    },
    "netProfit": 39100,
    "metrics": {
      "mrr": 73440,
      "churnRate": 2.1,
      "quotaUtilizationRate": 87.5
    }
  }
  ```
  All figures are computed purely from database rows (zero baselines when books are empty): `mrr` is revenue earned in the trailing 30 days, `churnRate` is the share of non-`active` subscriptions, and `retailGrossMargin` is gross boutique intake.

### 8.2 Daily Accrual Calculator
`GET /api/accounting/accrual?price=4800&totalDays=30&daysInMonth1=15`
- Returns daily accrual rate and split between Month 1 recognized revenue and Month 2 deferred revenue.

### 8.3 Studio Operating Expenses
- `GET /api/accounting/expenses`: Lists categorized studio expenses.
- `POST /api/accounting/expenses`: Logs a new expense voucher.
- `DELETE /api/accounting/expenses/:id`: Removes an expense voucher.

### 8.4 Invoicing & Accounts Receivable
- `GET /api/accounting/invoices`: Returns customer invoices, line items, and payment status.
- `POST /api/accounting/invoices`: Issues a new invoice with itemized lines. Payload is strictly mapped to the schema (`subtotal`, `taxRate`, `taxAmount`, `total`, `dueDate`; lines carry `description`, `quantity`, `unitPrice` → stored `amount`); unknown legacy fields are normalized, never persisted. New invoices open as `unpaid` with `remainingDue = total`.

### 8.5 Instructor Monthly Payroll
- `GET /api/accounting/payroll`: Lists faculty payroll slips.
- `POST /api/accounting/payroll`: Creates a monthly payroll record.
- `PATCH /api/accounting/payroll/:id/pay`: Marks payroll slip as paid with payment reference.

### 8.6 Double-Entry General Ledger
- `GET /api/accounting/journal`: Returns double-entry journal vouchers.
- `POST /api/accounting/journal`: Posts a balanced debit/credit voucher.

### 8.7 Cash Register Shift Management
- `GET /api/accounting/cash-shifts`: Lists front-desk cashier shifts.
- `POST /api/accounting/cash-shifts`: Opens a new cash shift with opening float.
- `PATCH /api/accounting/cash-shifts/:id/close`: Closes cash shift with actual cash count and records variance.

---

## 9. WhatsApp & OpenWA Module (`/api/openwa`)

Manages WhatsApp gateway connectivity, QR pairing, and notification dispatching.

- `GET /api/openwa/status`: Returns gateway connectivity status (`connected`, `pairing`, `disconnected`).
- `POST /api/openwa/connect`: Initiates connection in `builtin_qr` or `external_gateway` mode.
- `POST /api/openwa/pair-confirm`: Confirms pairing for a phone number.
- `POST /api/openwa/disconnect`: Disconnects active WhatsApp session.
- `GET /api/openwa/gateway-config`: Retrieves active gateway settings and connection parameters.
- `PATCH /api/openwa/gateway-config`: Updates gateway URL and API secret tokens.
- `GET /api/openwa/messages`: Retrieves message audit queue logs.
- `POST /api/openwa/dispatch`: Dispatches an outbound WhatsApp notification.
- `POST /api/openwa/webhook`: Incoming webhook receiver from external WhatsApp gateways.

---

## 10. Dynamic Portal CMS Module (`/api/portal-content`)

Headless CMS controlling the public website and portal interface without redeployment.

- `GET /api/portal-content`: Public endpoint returning the complete portal content tree.
- `PUT /api/portal-content`: Updates entire content tree (`@Roles('superadmin', 'owner')`).
- `PATCH /api/portal-content/hero`: Updates hero headline, tagline, CTA, and background image.
- `PATCH /api/portal-content/branding`: Updates academy name, contact phone, email, and social links.
- `PATCH /api/portal-content/notice`: Updates the sitewide broadcast notice banner.
- `POST /api/portal-content/programs`: Saves or updates a training program offering.
- `POST /api/portal-content/faculty`: Creates a faculty instructor profile.
- `PUT /api/portal-content/faculty/:id`: Updates an instructor profile.
- `DELETE /api/portal-content/faculty/:id`: Deletes an instructor profile.
- `POST /api/portal-content/performances`: Creates a stage performance event.
- `PUT /api/portal-content/performances/:id`: Updates a performance event.
- `DELETE /api/portal-content/performances/:id`: Deletes a performance event.
- `POST /api/portal-content/reset`: Resets CMS content back to canonical conservatory defaults.

---

## 11. Admission Leads Module (`/api/leads`)

Handles inquiries from the public website and processes them through the audition pipeline.

- `POST /api/leads`: Public endpoint called by the website's `EnrollModal`.
- `GET /api/leads`: Retrieves all prospective dancer inquiries (`@Roles('superadmin', 'owner', 'receptionist')`).
- `PATCH /api/leads/:id/stage`: Transitions lead stage (`new_inquiry`, `audition_scheduled`, `evaluated`, `enrolled`, `rejected`).
- `POST /api/leads/:id/convert`: Converts an auditioned lead into a registered `Student` record with a generated barcode and subscription package.

---

## 12. Analytics Module (`/api/analytics`)

Staff-only (`@Roles('superadmin', 'owner', 'receptionist', 'instructor')`) dashboard aggregates. All figures derive from database rows; empty books report zeros, never synthetic projections.

- `GET /api/analytics/overview`: Counts (students, active packages, attendance events, leads, sessions, orders), money (recognized tuition, retail, inflow, opex, payroll, outflow, net, margin, AR debt, unpaid invoices), engagement (quota utilization, funnel conversion, SLA breaches) and program mix.
- `GET /api/analytics/trend?range=90D&metric=revenue`: `range` ∈ `30D|90D|12M`, `metric` ∈ `revenue|attendance|enrollment`. Returns `n` equal calendar buckets over the trailing window (out-of-window events clamp into the oldest bucket) plus the window `total`.
- `GET /api/analytics/attention`: Operational watchlists (low quota ≤2 left, debtors, expiring ≤7 days, stale leads >48h, pending reminders), capped at 20 rows each. Includes household phones for staff outreach.
- `GET /api/analytics/forecast`: 3-month low/base/high projection scaled from real recognized inflow.

---

## 13. Operations Snapshots (`/api/ops`)

Staff-only (`@Roles('superadmin', 'owner', 'receptionist', 'instructor')`) read-only operational queries backing the dashboard widgets. No pagination — bounded snapshots.

- `GET /api/ops/renewal-queue`: Tuition renewal watchlist, high priority first. Response `{ queue: [...] }` where each item carries `studentId`, `name`, `phone` (parent WhatsApp), `reason` (`no_package` | `expired` | `expiring_soon` ≤7 days | `low_quota` ≤2 sessions), `priority` (`high` | `medium`), plus `left` and `endDate` when a package exists.
- `GET /api/ops/schedule-conflicts`: Double-booking detector over non-cancelled sessions. Response `{ total, conflicts: [...] }`; each conflict has `type` (`room` = same studio overlapping times, `instructor` = same instructor overlapping times), `day` (YYYY-MM-DD), `sessionIds`, and a human `message`. Capped at 50.

---

## 14. Online Payments (`/api/payments`)

Provider-agnostic pay-link records (Paymob / Fawry / InstaPay). The record layer is live; per-provider live API keys plug into `providerRef`/`url` later without changing callers. Links expire after 48h; the portal base URL resolves from `PAYLINK_PORTAL_URL`, else `PUBLIC_APP_URL + /pay`, else the production default.

- `POST /api/payments/paylink` (`@Roles('superadmin', 'owner', 'receptionist')`): Body `{ invoiceId?, studentId?, amount, provider, phone? }`. Amount must be > 0; referenced invoice/student must exist (`404` otherwise). Returns `201` with `{ url, ref, amount, currency, provider, status: 'pending', expiresAt }`.
- `GET /api/payments/paylink/:ref`: Public link-status lookup for the portal pay page — `{ ref, amount, currency, provider, status, expiresAt }`, no PII.
- `POST /api/payments/webhook`: Public provider callback authenticated by the unguessable `ref`. Body `{ ref, status: 'paid'|'failed'|'expired'|'cancelled', providerRef? }`. Idempotent — replaying a `paid` notification returns current state. Unknown ref → `404`.

---

## 15. Branches & Multi-Campus Management (`/api/branches`)

Enables multi-campus conservatory management across physical branches and academic terms.

- `GET /api/branches`: Public endpoint returning all active academy campuses (e.g., *Zamalek Main Campus*, *New Cairo Annex*) with address, contact lines, and main flag.
- `GET /api/branches/academic-years`: Returns academic calendar sessions (`2025/2026`, `2026/2027`) and flags the active current term.
- `POST /api/branches/academic-years/rollover` (`@Roles('superadmin', 'owner')`): Closes the current term and archives active subscriptions or rolls student enrollments into the upcoming academic year.

---

## 16. Egyptian Tax Authority E-Receipts (`/api/eta`)

Compliant fiscal document generation and electronic receipt submission to the Egyptian Tax Authority portal.

- `GET /api/eta/docs` (`@Roles('superadmin', 'owner')`): Retrieves all drafted, submitted, or validated ETA fiscal receipts with submission status, total amount, and tax amount.
- `POST /api/eta/submit` (`@Roles('superadmin', 'owner')`): Body `{ invoiceId, invoice? }`. Formats an invoice according to ETA e-receipt schema specifications. Generates a signed document draft or submits directly to the ETA portal when credentials are live.
- `POST /api/eta/retry` (`@Roles('superadmin', 'owner')`): Retries failed transmissions or re-queries submission status from the tax portal.

---

## 17. Academy Structure & Curriculum Workload (`/api/academy`)

Hierarchical management of the conservatory curriculum: Categories › Groups › Sessions.

- `GET /api/academy/categories`: Retrieves all curriculum categories with their child groups.
- `POST /api/academy/categories` (`@Roles('superadmin', 'owner')`): Creates a top-level discipline category.
- `GET /api/academy/groups`: Lists active student cohorts with lead instructor and session counts.
- `POST /api/academy/groups` (`@Roles('superadmin', 'owner')`): Creates a new student group within a category.
- `POST /api/academy/groups/:id/enroll` (`@Roles('superadmin', 'owner', 'receptionist')`): Enrolls a student into a group cohort.
- `DELETE /api/academy/groups/:id/enroll/:studentId`: Removes a student from a cohort.
- `POST /api/academy/groups/:id/waitlist`: Adds prospective or overflow students to the group waitlist.
- `POST /api/academy/groups/:id/waitlist/promote`: Promotes a waitlisted student to active enrolled status upon vacancy.
- `GET /api/academy/workload/instructors`: Aggregates teaching hours and dancer ratios per ballet master.

---

## 18. Staff Roster & Shifts (`/api/roster`)

Front-desk receptionist and teaching faculty shift scheduling and leave administration.

- `GET /api/roster/shifts` (`@Roles('superadmin', 'owner', 'receptionist')`): Returns staff duty roster for any requested date range.
- `POST /api/roster/shifts` (`@Roles('superadmin', 'owner')`): Schedules a front-desk or studio duty shift.
- `PATCH /api/roster/shifts/:id` / `DELETE /api/roster/shifts/:id`: Updates shift hours or cancels scheduled shifts.
- `GET /api/roster/leaves`: Lists vacation, sick leave, or absence requests.
- `POST /api/roster/leaves`: Submits a staff leave request.
- `POST /api/roster/leaves/:id/decide` (`@Roles('superadmin', 'owner')`): Approves or rejects a staff leave request.

---

## 19. Conservatory Blog & Publishing (`/api/blog`)

Headless editorial engine for academy announcements, stage performances, and ballet press.

- `GET /api/blog`: Public listing of published conservatory articles with pagination and category filtering.
- `GET /api/blog/:slug`: Public retrieval of a single article by slug.
- `GET /api/blog/sitemap.xml`: XML sitemap for SEO search indexing.
- `POST /api/blog` (`@Roles('superadmin', 'owner')`): Creates a new article draft.
- `PATCH /api/blog/:id`: Edits article body, cover URL, or bilingual translation.
- `POST /api/blog/:id/publish`: Toggles publication status.
- `DELETE /api/blog/:id`: Archives or deletes an article.

---

## 20. Referrals, Growth & Loyalty (`/api/referrals`, `/api/testimonials`)

Student referral rewards, acquisition tracking, and student testimonials.

- `GET /api/referrals/mine` (`@Roles('student', 'family')`): Returns authenticated household's personal referral code and list of invited dancers.
- `GET /api/referrals` (`@Roles('superadmin', 'owner', 'receptionist')`): Complete referral registry and conversion audit.
- `POST /api/referrals/:id/reward` (`@Roles('superadmin', 'owner')`): Grants tuition credit or package discounts to successful referrers.
- `GET /api/testimonials`: Public endpoint returning curated student and parent reviews.
- `POST /api/testimonials` (`@Roles('superadmin', 'owner')`): Adds or curates academy testimonials.

---

## 21. Nightly Operations Scheduler & SLA Watch (`/api/ops`)

Automated maintenance tasks, admissions funnel SLAs, and celebration dispatches.

- `GET /api/ops/funnel-sla`: Identifies prospective student inquiries sitting in `new_inquiry` or `trial_scheduled` for > 48 hours without staff action.
- `GET /api/ops/audit-log`: Comprehensive system-wide security, finance, and CRM audit trail.
- `GET /api/ops/deletion-requests`: GDPR/privacy deletion requests submitted by families.
- `GET /api/ops/celebrations` & `POST /api/ops/celebrations/dispatch`: Tracks upcoming student birthdays or attendance milestones and dispatches congratulatory WhatsApp cards.
- `POST /api/ops/nightly/run`: Executes nightly maintenance (aging calculation, expired link cleanup).

---

## 22. System Health & Diagnostics (`/api/health`)

Real-time telemetry and infrastructure health verification.

- `GET /api/health`: Liveness probe returning `{ status: 'ok', timestamp }`.
- `GET /api/health/detailed`: Diagnostic telemetry returning PostgreSQL connectivity state, database latency, process memory usage, system uptime, and third-party integration statuses (WhatsApp gateway, payment providers).




<!-- ============================================================================== -->
<!-- SECTION 5: CHAPTER 4: CLIENT & STUDENT PORTAL MANUAL -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/docs/04_CLIENT_PORTAL_MANUAL.md -->
<!-- ============================================================================== -->

# 5. CHAPTER 4: CLIENT & STUDENT PORTAL MANUAL

# 🩰 Étoile Platform — Client & Student Portal User Manual

The **Client & Student Portal** (`http://localhost:5173`) provides an elegant, French-conservatory inspired digital environment for prospective students, enrolled dancers, families, and faculty instructors. It runs on Vite 5 and React 18, featuring seamless bilingual support (English and Arabic), dark-mode conservatory aesthetics, real-time timetable countdowns, canvas barcode generation, and multi-factor authentication.

---

## 1. Portal Views Overview

The portal automatically adjusts its interface depending on the user's authentication state and active navigation view:

```mermaid
graph TD
    Root[Client Portal Entrypoint :5173] --> Header[Floating Aurora Glassmorphic Header]
    Header --> Nav{Navigation State}
    Nav -->|Public View| LandingPage[1. Conservatory Showcase & Stage Canvas]
    Nav -->|Catalog View| ClassesCatalog[2. Classes & Curriculum Catalog]
    Nav -->|Login Trigger| LoginPage[3. Smart Card & Credential Login]
    LoginPage --> AuthCheck{Authentication Type}
    AuthCheck -->|Student / Parent| StudentPortal[4. Student & Family Portal & Digital ID]
    AuthCheck -->|Faculty Member| InstructorPortal[5. Instructor Portal & Classes]
```

---

## 2. Public Landing Page & Visual Architecture (`LandingPage.tsx`)

The landing page provides a premier showcase of the academy's heritage, artistic philosophy, curriculum, faculty, and performance season, driven in real time by the **Portal Content CMS** and elevated by modern visual components.

### 2.1 Floating Glassmorphic Header (`AppHeader.tsx`)
- **Aurora Aesthetic**: Features dynamic scroll adaptation — seamlessly transitions from a transparent hero header into a floating dark-glass pill (`backdrop-blur-md`, subtle golden borders `rgba(202,168,104,0.2)`).
- **Academy Emblem**: Gold insignia with a delicate breathing animation pulse indicating live academy operational status.
- **Bilingual & Navigation Controls**: 1-click English/Arabic switcher (`dir="ltr"` / `dir="rtl"`), navigation anchor links, and an **"Access Portal"** quick-action button.
- **Mobile Drawer**: Smooth slide-over navigation sheet for mobile viewports.

### 2.2 Stage Atmosphere Particle Canvas (`StageAtmosphereCanvas.tsx`)
- An interactive, hardware-accelerated HTML5 Canvas particle simulation.
- Generates golden stage dust motes and soft ambient spotlight cones reacting to viewport movement, evoking the atmosphere of the Paris Opéra Garnier stage.

### 2.3 Interactive Onboarding Stepper (`OnboardingChecklist.tsx`)
- A personalized checklist component displayed to newly enrolled dancers and their parents.
- **Interactive Steps**:
  1. **Activate Smart Badge**: Verify conservatory card code (`ETOILE-XXXXXX`).
  2. **Set Private Password**: Complete initial verification via WhatsApp temporary code.
  3. **Explore Assigned Curriculum**: Review studio hall, attire requirements, and schedule.
  4. **Connect on WhatsApp**: Instant link to the academy's official WhatsApp channel.
  5. **Download Digital Pass**: Export high-resolution Code128 barcode ID to phone wallet.

### 2.4 Landing Page Core Sections:
1. **Conservatory Hero Banner**:
   - High-impact editorial typography with tiered headlines (e.g., *ÉTOILE BALLET ACADEMY — Perfection in Movement*).
   - Dynamic CTA buttons: **"Enroll for Audition"** (opens `EnrollModal`) and **"Explore Curriculum"** (navigates to `ClassesCatalogPage`).
2. **Global Broadcast Notice**:
   - Optional top banner for urgent announcements (e.g., *Spring Audition Registrations Open*).
   - Supports 3 visual severities: `info` (blue-gray), `gold` (conservatory amber), and `warning` (rose).
3. **Heritage & Pedagogical Philosophy**:
   - Highlights the academy's Vaganova, French, and Balanchine training foundations with live metric counters.
4. **Curriculum Showcase**:
   - Interactive program cards for **Classical Ballet**, **Contemporary Dance**, and **Youth Academy**.
   - Clicking **"View Syllabus & Details"** opens `ProgramModal` revealing class frequencies, age brackets, tuition rates, and training privileges.
5. **Distinguished Faculty Roster**:
   - Showcases Master Teachers, Prima Ballerinas, and Resident Choreographers with bios.
6. **Performance Season & Box Office**:
   - Calendar cards for major stage productions with status indicators: `upcoming`, `sold_out`, and `box_office`.
7. **Footer & Quick Navigation**:
   - Academy contact information, physical campus addresses (Paris Opera, Cairo Zamalek), social links, and legal notices.

---

## 3. Classes & Curriculum Catalog (`ClassesCatalogPage.tsx`)

A dedicated catalog allowing prospective and existing dancers to explore the full conservatory schedule.

### Key Capabilities:
- **Interactive Program Filter**: Toggle instantly between *All Disciplines*, *Classical Ballet*, *Contemporary Dance*, and *Youth Academy*.
- **Course Detail Cards**:
  - Course code (e.g., `BAL-CL-101`) and full title in active language.
  - Assigned studio room (e.g., *Grand Studio Petipa*, *Studio Pavlova*).
  - Weekly schedule days and exact hours (e.g., *Mon, Wed, Fri — 16:00 to 17:30*).
  - Assigned master instructor with avatar badge.
  - Enrollment capacity gauge displaying current availability.
- **Direct Class Audition Trigger**: Clicking **"Audition for this Class"** launches `EnrollModal` pre-filled with the selected course code and discipline.

---

## 4. Enrollment & Audition Modal (`EnrollModal.tsx`)

A streamlined lead capture system that connects prospective dancers directly into the academy's administrative CRM.

### Form Fields & Validation:
- **Dancer Full Name**: Prospective student's name.
- **Dancer Age**: Enforces age bracket alignment.
- **Parent / Guardian Name**: Contact person for minor dancers.
- **Parent WhatsApp Phone Number**: Required for automated audition confirmations.
- **Parent Email Address**: Billing and documentation contact.
- **Target Program**: Pre-selected from the clicked program or class card.
- **Prior Dance Experience**: Text area documenting previous school training, years en pointe, or syllabus level.

### Processing Pipeline:
1. Submits payload to `POST /api/leads`.
2. Creates a new record in `AdmissionLead` with stage `new_inquiry`.
3. Displays a confirmation modal informing the parent that an audition confirmation has been scheduled.
4. Generates an instant notification in the staff CRM.

---

## 5. Multi-Modal Authentication (`ClientLoginPage.tsx`)

The login portal allows students, parents, and faculty to authenticate quickly using their preferred credential:

```mermaid
graph TD
    LoginEntry[Client Login Page] --> TabChoice{Authentication Method}
    TabChoice -->|Method A| CardScan[1. Smart Card Barcode / RFID Code]
    TabChoice -->|Method B| StudentCreds[2. Student ID / Parent Phone or Email]
    TabChoice -->|Method C| DemoHelper[3. 1-Click Demo Cards Drawer]

    CardScan --> CardSubmit[POST /api/auth/card-login]
    StudentCreds --> CardSubmit
    DemoHelper --> CardSubmit

    CardSubmit --> FirstLoginCheck{isFirstLogin == true?}
    FirstLoginCheck -->|Yes| SetupFlow[First-Time WhatsApp Password Setup]
    FirstLoginCheck -->|No| PortalDirect[Direct Portal Entry (Student & Family Context)]
```

### 5.1 Smart Card, Student ID & Parent Credential Login
- **Students and Instructors**: Authenticate using physical card code (`ETOILE-892101` or `INS-01`).
- **Parents**: Log in directly using their student's credentials:
  - Student card barcode (`ETOILE-XXXXXX`)
  - Student ID (`STU-XXX`)
  - Registered parent email
  - Registered parent phone
  paired with the student's password.
- **Unified Context**: Authentication loads both the individual student's pedagogical progress and the complete family household data (invoices, pay links, siblings, schedules) without requiring a separate, insecure passwordless family login.

### 5.2 First-Time Password Setup via WhatsApp
1. If the student has never logged in before (`isFirstLogin: true`), entering the card code prompts the user to verify their identity.
2. Clicking **"Send Temporary Code to WhatsApp"** calls `POST /api/auth/request-initial-password`.
3. The server generates a temporary code and dispatches it to the parent's registered WhatsApp.
4. The dancer/parent enters the temporary code, sets a new private password, and is automatically logged in.

### 5.3 Forgot Password & OTP Recovery
- Dancers or parents who forgot their password click **"Forgot Password?"**.
- The system dispatches a 6-digit numeric OTP to the registered WhatsApp number.
- Entering the valid OTP allows immediate password reset without administrator intervention.

### 5.4 1-Click Demo Cards Drawer
For evaluation and testing, the login screen includes a quick-fill drawer with seeded accounts:
- **Maya Moreau** (`ETOILE-892101`): Classical Pre-Pro dancer with active quota.
- **Leo Moreau** (`ETOILE-892102`): Youth dancer testing first-time setup flow.
- **Lucas Marchand** (`INS-01`): Faculty instructor testing teacher portal.

---

## 6. Student & Family Portal (`ClientPortal.tsx`)

The personal self-service dashboard for enrolled dancers and their parents.

### 6.1 Digital Conservatory ID Card (`BarcodeRenderer.tsx`)
- Displays dancer's official photo, full name (bilingual), student ID, and conservatory level.
- **Code128 Standard Barcode**: Rendered natively on an HTML5 canvas based on the student's unique barcode number (`ETOILE-XXXXXX`).
- **QR Code**: Rendered alongside for camera scanning terminals.
- **Export & Print**: Dancers can click **"Download ID Badge"** to save a high-resolution PNG image for their mobile wallet or print a physical conservatory badge.

### 6.2 Real-Time Schedule & Class Countdown
- Displays the student's next scheduled class session.
- Features a **live countdown timer** (e.g., *Class starts in 2 hours, 14 minutes*).
- Details the exact studio hall (*Grand Studio Petipa*), teaching ballet master, and attire requirements.

### 6.3 Subscription Quota & Expiry Tracker
- **Session Progress Bar**: Visually indicates classes attended vs total classes purchased (e.g., *14 of 16 Classes Attended*).
- **Expiration Date**: Displays contract end date with a countdown of remaining days.
- **Quota Warning Alert**: If remaining sessions drop to 2 or fewer, a gold warning banner prompts the dancer to renew their package.

### 6.4 Student Wallet Balance & Debt Settlement
- **Account Ledger**: Shows real-time balance. Positive values represent available credit; negative values indicate outstanding debt (e.g., *Debt: -650 EGP / -650 ج.م*).
- **Overdraft Limit**: Shows allowable debt ceiling (e.g., *Max Negative Limit: 1,500 EGP / 150 €*).
- **1-Click Debt Settle Modal**: Allows parents to simulate clearing outstanding tuition debt via Card, Bank Transfer, or Cash at the front desk.

### 6.5 Historical Attendance Records
- Chronological timeline of all past check-ins.
- Badges indicating whether access was `granted`, `late`, or `denied`.
- Hardware method indicator: `hid_barcode` (physical laser scanner) or `qr_camera` (tablet camera).

### 6.6 Faculty Evaluations & Progress Notes
- Displays technical ballet ratings from master teachers across 4 core criteria (0.0 to 10.0):
  1. **Barre Technique**: Turnout, alignment, extension, and foot articulation.
  2. **Center Work**: Adagio control, pirouettes, and balance en pointe.
  3. **Allegro & Elevation**: Grand allegro jumps, batterie, and landing softness.
  4. **Musicality & Artistry**: Phrasing, epaulement, expression, and stage presence.
- Official commentary notes from the Artistic Director.

### 6.7 Household Invoicing & Digital Pay-Links (`PayLinkButton.tsx`)
- Displays family invoices with payment status (`pending`, `paid`, `cancelled`).
- **1-Click Digital Payment**: Parents can click **"Pay Online"** to generate an instant pay-link via Paymob (Credit/Debit cards), Fawry (reference pay codes), or InstaPay.
- Automatically reconciles invoice balance upon webhook confirmation without front-desk waiting.

---

## 7. Faculty & Instructor Portal (`InstructorPortal.tsx`)

When an instructor logs in with their staff credentials or card code (`INS-01`), the portal renders the **Faculty Portal**.

### Key Capabilities:
1. **Faculty Overview**:
   - Instructor name, pedagogy department (*Contemporary Pedagogy*), and assigned studio halls.
2. **Weekly Teaching Timetable**:
   - Displays all assigned course sessions for the current week.
   - Indicates session status: `scheduled`, `completed`, or `cancelled`.
3. **Enrolled Dancers Roster**:
   - Displays real-time student count enrolled in each course (e.g., *14 Dancers Enrolled / Cap 18*).
4. **1-Click WhatsApp Session Reminders**:
   - Faculty can click **"Send Session Reminder"** to trigger automated WhatsApp notifications to all enrolled dancers 60 minutes prior to class.
5. **Class Broadcast Announcement**:
   - Allows instructors to type a custom rehearsal announcement (e.g., *"Please bring character skirts and shoes for Act II rehearsal"*), which dispatches to all dancers' WhatsApp contacts.



<!-- ============================================================================== -->
<!-- SECTION 6: CHAPTER 5: ADMIN CRM & OPERATIONS ERP MANUAL -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/docs/05_ADMIN_CRM_ERP_MANUAL.md -->
<!-- ============================================================================== -->

# 6. CHAPTER 5: ADMIN CRM & OPERATIONS ERP MANUAL

# 🏛️ Étoile Platform — Admin CRM & Operations ERP Manual

The **Admin & Operations ERP** (`http://localhost:5174`) is the operational command center of Étoile Ballet Academy. It equips Artistic Directors, Owners, Receptionists, and Department Heads with comprehensive tools for attendance check-ins, student lifecycle CRM, boutique retail POS, curriculum scheduling, automated WhatsApp notifications, portal CMS editing, and staff administration.

---

## 1. System Navigation & Keyboard Shortcuts

The ERP features an intuitive, role-aware sidebar navigation with persistent state and rapid accessibility shortcuts:

```mermaid
graph TD
    AdminRoot[Admin ERP :5174] --> SidebarNav[Sidebar Navigation]
    SidebarNav --> NavCore[Core Command: Dashboard, Analytics, Check-In, Schedule]
    SidebarNav --> NavAcademy[Academy Workflow: Home, Categories, Groups, Sessions]
    SidebarNav --> NavCRM[Student CRM, Admissions Pipeline, Packages]
    SidebarNav --> NavFinance[Store POS, Financial Suite, Pay Links, ETA]
    SidebarNav --> NavComms[WhatsApp Messages, CMS Editor, Blog]
    SidebarNav --> NavStaff[Growth & Promos, Staff Roster, Audit Logs, Users, Settings]
```

### Operational Modules Roster (22 Tabs):
1. `overview`: **Executive Dashboard** — Pulse, real-time MRR, studio status, and urgent alerts.
2. `analytics`: **Analytics & Intelligence** — Trailing trends, revenue recognition, program mix, and forecasts.
3. `checkin`: **Check-In Kiosk** — Sub-second scanning, audio chimes, premise WiFi, and offline queue.
4. `schedule`: **Studio Schedule** — Week grid, room occupancy, and automated conflict detection.
5. `courses`: **Academy Home** — 3-step hierarchy overview, legacy courses, and faculty workload.
6. `categories`: **Categories** — Top-level artistic disciplines and age divisions.
7. `groups`: **Groups** — Cohorts with lead instructors and student rosters.
8. `sessions`: **Sessions** — Class calendar timetable with pre-session WhatsApp notifications.
9. `students`: **Students CRM** — Full dancer profiles, wallets, evaluations, medical notes.
10. `admissions`: **Admissions Pipeline** — Lead capture, audition scheduling, and 1-click conversion.
11. `subscriptions`: **Packages & Quotas** — Plan configurations, remaining sessions, and renewals.
12. `pos`: **Boutique POS** — Uniforms, pointe shoes, variant matrix, and debt ledger checkout.
13. `financials`: **Financial Command** — IFRS-15 daily accruals, P&L, AR aging, payroll, cash shifts, pay-links.
14. `openwa`: **WhatsApp Dispatcher** — Gateway status, QR pairing, automated templates, audit log.
15. `cms`: **Website CMS** — Live visual editor for public portal branding, hero copy, faculty, and season.
16. `blog`: **Blog Manager** — Conservatory news, audition calls, and press publishing.
17. `growth`: **Growth & Referrals** — Student referral tracking, promo codes, and discount policies.
18. `roster`: **Staff Roster & Shifts** — Shift scheduling, reception duties, and leave governance.
19. `audit`: **Audit Log** — Comprehensive security, CRM, and financial audit trails.
20. `users`: **Administrators & Staff** — Staff accounts, RBAC role assignment, and card bindings.
21. `settings`: **Settings Hub** — Multi-branch campus management (`Zamalek`, `New Cairo`), academic years, ETA tax setup.
22. `my_profile`: **My Profile** — Staff credential management and personal duty status.

### Power-User Keyboard Shortcuts:
- **`Cmd + B`** / **`Ctrl + B`**: Toggle sidebar collapse/expand.
- **Keys `1` through `8`**: Instant shortcut to switch between permitted operational modules.

---

## 2. Dashboard Overview (`DashboardOverview.tsx`)

The central executive cockpit providing instantaneous operational metrics, studio status, and urgent alerts.

### Key Components:
1. **Live Paris Conservatory Clock**:
   - Accurately tracks European Conservatory Time (`Europe/Paris`) to seconds, ensuring synchronization across international branches.
2. **Executive KPI Cards**:
   - **Monthly Recurring Revenue (MRR)**: Real-time subscription and enrollment revenue with month-over-month growth trends.
   - **Active Dancers**: Current enrolled student population across Classical, Contemporary, and Youth divisions.
   - **Today's Check-Ins**: Real-time counter of dancers who have successfully passed through the attendance kiosk today.
   - **Studio Occupancy Rate**: Percentage of studio hall hours currently occupied by scheduled classes.
3. **Live Studio Room Indicators**:
   - Visual status badges for each conservatory dance hall (*Grand Studio Petipa*, *Studio Pavlova*, *Studio Nijinsky*) indicating active rehearsals and ongoing classes.
4. **Quick Action Shortcuts**:
   - Immediate navigation buttons to **"Launch Fast-Track Check-In"**, **"Register New Dancer"**, **"Open Boutique POS"**, and **"Log Studio Expense"**.

---

## 3. Fast-Track Attendance Check-In Kiosk (`FastTrackCheckIn.tsx`)

A sub-second, hardware-integrated attendance kiosk engineered for peak arrival rush hours before class commencement.

```mermaid
sequenceDiagram
    autonumber
    actor Dancer as Dancer / Student
    participant Scanner as USB Barcode / Camera
    participant Kiosk as Kiosk Controller
    participant Synth as Web Audio Synthesizer
    participant API as NestJS API (:3001)
    participant WA as WhatsApp Dispatcher
    actor Parent as Parent WhatsApp

    Dancer->>Scanner: Present Physical Barcode / Phone QR
    Scanner->>Kiosk: Capture Code ("ETOILE-892101")
    Kiosk->>API: POST /api/attendance/checkin (Barcode + Premise BSSID)
    API->>API: Verify Subscription Validity & Quota
    alt Quota Available (> 0) & Date Valid
        API->>API: Decrement Quota (usedSessions + 1)
        API-->>Kiosk: 201 Created (Granted, remaining: 1)
        Kiosk->>Synth: Play Harmonic Chord (C5-E5-G5-C6)
        Kiosk->>Kiosk: Display Green Success Card & Student Photo
        API->>WA: Queue Check-In Receipt Message
        WA-->>Parent: WhatsApp: "Maya Moreau checked in for Pointe at 16:00"
    else Quota Exhausted (0 remaining)
        API-->>Kiosk: 200 OK (Denied Quota)
        Kiosk->>Synth: Play Dissonance Tone (F3-D#3)
        Kiosk->>Kiosk: Display Red Alert Card ("Quota Exhausted")
    end
```

### Key Technical Capabilities:
- **USB HID Keyboard Emulation**: Listens globally for high-speed keystroke bursts from laser barcode scanners. Operators do not need to click or focus any input field.
- **WebRTC Camera Scanner**: Enables front-desk tablets or laptops to scan QR codes via the front/rear device camera.
- **Manual Input Modal**: Allows receptionists to enter a student barcode or ID manually in case of lost or damaged badges.
- **Premise WiFi Geofence Lock**: Verifies the kiosk terminal network against the authorized conservatory BSSID (`Etoile-Secure-5G [F4:92:BF:11:80:A2]`).
- **Zero-Latency Audio Synth**: Employs the native browser `AudioContext` to synthesize instant harmonic audio feedback without downloading audio files.
- **Automated WhatsApp Parent Receipts**: As soon as access is granted, the backend automatically dispatches a check-in receipt to the parent's registered mobile number.
- **Offline Resiliency & Queue Synchronization (`offlineQueue.ts`)**:
  - In the event of network disruption at reception, scans are preserved in `localStorage` with client-generated UUID idempotency keys.
  - A visual banner indicates `Offline Mode (X pending scans)`.
  - When connection is restored, the queue auto-flushes every 8 seconds via idempotent `POST /api/attendance/checkin`, ensuring zero duplicate quota deductions.

---

## 4. Courses & Curriculum Management (`CourseManagement.tsx`)

The pedagogical timetable and course administration engine.

### Key Capabilities:
1. **Course Creation & Syllabus Management**:
   - Create and edit courses with bilingual titles (`title`, `titleAr`), detailed repertoire descriptions, and program tiers (`classical`, `contemporary`, `youth`).
   - Define student capacity limits with automated enrollment caps.
   - Assign primary faculty instructors from the staff roster.
   - Designate recurring weekly days and studio rooms (*Studio Petipa*, *Studio Pavlova*, *Studio Nijinsky*).
2. **Student Enrollment Manager**:
   - 1-click student enrollment and unenrollment modal.
   - Live capacity tracking (e.g., *14 / 15 Enrolled — 1 Spot Left*).
3. **Session Calendar & Scheduling**:
   - Generate individual calendar sessions for specific dates and times.
   - Attach attire, pointe shoe, or rehearsal notes (e.g., *Bring white romantic tutu skirt*).
4. **Automated WhatsApp Pre-Session Reminders**:
   - Configure pre-session notification windows (15, 30, 45, 60, 90, or 120 minutes before class).
   - Edit bilingual message templates with dynamic variable tokens (`{studentName}`, `{courseTitle}`, `{time}`, `{studio}`, `{instructorName}`).
   - **"Send Reminders Now"**: Manually triggers batch reminders to all enrolled students for any selected session.
5. **Class Broadcast Messaging**:
   - Broadcast emergency schedule changes, masterclass notices, or rehearsals directly to all dancers enrolled in a course.

---

## 5. Student CRM & Admissions Pipeline (`StudentCrm.tsx`, `StudentProfilePage.tsx`)

A comprehensive student management system covering the entire dancer lifecycle from initial audition inquiry to conservatory graduation.

### 5.1 Student Directory
- Fast full-text search across dancer names, parent names, email, and barcode codes.
- Filter by discipline (*Classical*, *Contemporary*, *Youth*), conservatory level, and financial debt status.
- Export student roster data.

### 5.2 Full Student Profile View
- **Demographic & Household**: Dancer age, emergency phone, parent contact, and linked household ID.
- **Digital Barcode & ID Card**: Live Code128 barcode rendering on HTML5 canvas with high-resolution PNG download and print capabilities.
- **Wallet Ledger & Debt Allowance**:
  - Live account balance (positive credit or negative debt).
  - Configurable maximum debt ceiling (e.g., *Max Negative Limit: 1,500 EGP / 150 €*).
  - Quick-action balance adjustment modal.
- **Active Subscriptions**: Displays current package, remaining sessions, daily accrual rate, and expiration countdown.
- **Historical Attendance Timeline**: Audit log of every check-in event with timestamp and device verification method.
- **Pedagogical Notes**: Categorized notes repository for staff (*General*, *Medical & Injury*, *Performance & Repertoire*, *Tuition & Invoicing*).
- **Artistic Skill Evaluation Rubrics**: Technical scores (0.0 to 10.0) across *Barre*, *Center*, *Allegro*, and *Musicality*, with master teacher notes.

### 5.3 Admissions Lead Pipeline (Kanban & Table)
- Inquiries submitted from the public website's `EnrollModal` flow directly into the **Admissions Pipeline**.
- **Stages**:
  1. `new_inquiry`: Initial web lead received.
  2. `audition_scheduled`: Dancer invited to conservatory studio audition.
  3. `evaluated`: Artistic Director has reviewed dancer's anatomical turnout and musicality.
  4. `enrolled`: Dancer accepted into the academy.
  5. `rejected`: Not accepted at this time.
- **1-Click Conversion to Student**: Clicking **"Convert to Student"** creates a registered `Student` record, assigns an initial subscription package, generates a unique barcode badge, and archives the lead.

---

## 6. Subscriptions & Package Manager (`SubscriptionManager.tsx`)

Manages the academy's class package plans, student quotas, and revenue recognition simulations.

### Key Capabilities:
- **Subscription Package Catalog**:
  - Create and edit package tiers (e.g., *Conservatory Classical Elite — 16 Classes / 30 Days / 4,800 EGP (480 €)*).
  - Set session quotas, duration in days, and discipline requirements.
- **Student Quota Overrides**:
  - Manually grant extra classes or extend validity expiration dates for dancers with medical excuses.
- **Revenue Recognition Simulator**:
  - Evaluates daily accrual allocation for any package price and duration based on the platform's accounting formula ($R_d = \frac{P}{T_{days}}$).

---

## 7. Store & Boutique POS (`PosBoutique.tsx`)

The retail point-of-sale system managing academy uniforms, pointe shoes, tights, and accessories.

### Key Capabilities:
1. **Multi-Size Variant Inventory Matrix**:
   - Tracks stock at the individual size level (e.g., *Grishko 2007 Pro: 36 XXX = 12 in stock, 37 XXX = 8 in stock*).
   - Real-time stock decrement upon checkout.
   - Low-stock visual warning badges.
2. **Visual Product Catalog & SKU Search**:
   - Category filtering (*Pointe Shoes*, *Leotards*, *Tights*, *Accessories*).
   - Instant SKU barcode lookup for hardware scanner compatibility.
3. **Cart & Multi-Tender Checkout**:
   - Fast cart addition with size variant selection.
   - **Tender Options**:
     - **Cash**: Updates cash sales and expected cash in the active cash drawer shift.
     - **Card**: Electronic terminal processing.
     - **Bank Transfer**: Records reference number.
     - **Student Wallet Debt**: Charges purchase directly to the student's account ledger, checking against their `maxNegativeDebt` ceiling.
4. **Order History & Receipts**:
   - Itemized purchase logs with printable receipt generation.

---

## 8. WhatsApp Messages & Gateway Manager (`OpenWaDispatcher.tsx`)

The central management interface for the academy's WhatsApp communication infrastructure.

### Key Capabilities:
- **Gateway Status Monitor**: Displays current connection status (`connected`, `pairing`, `disconnected`), connected phone number, and last heartbeat.
- **Pairing Engine**:
  - Supports **Built-in QR Engine** (generates pairing QR in browser) and **External Gateway Bridge** (integrates with external Baileys/OpenWA server).
- **Live Message Audit Queue**:
  - Chronological log of all outbound messages with recipient phone, student name, trigger event, and delivery status (`dispatched`, `delivered`, `failed`).
  - **Retry Action**: 1-click retry for failed notifications.
- **Manual Message Dispatcher**:
  - Allows staff to send immediate ad-hoc WhatsApp messages to any student or parent phone number.

---

## 9. Website & Portal CMS Editor (`PortalCmsEditor.tsx`)

A real-time, zero-downtime visual content management system controlling the public website and portal.

### Editable Sections:
1. **Academy Branding**: Academy name (EN/AR), taglines, phone, email, website URL, physical addresses, and social links.
2. **Hero Presentation**: Headline tiers (Lines 1, 2, 3 in EN/AR), subtitles, CTA button text, and hero background image link.
3. **Sitewide Announcement Banner**: Toggle notice active/inactive, customize message copy, and set severity level (`info`, `gold`, `warning`).
4. **Curriculum Programs**: Add, edit, or reorder programs, including titles, tuition pricing, age groups, schedules, and bulleted features.
5. **Faculty Roster**: Add, modify, or remove instructors, uploading photo URLs, professional titles, and career biographies.
6. **Performance Season**: Manage stage events, venues, dates, and box office ticket statuses.
7. **1-Click Factory Reset**: Restores CMS content back to canonical conservatory defaults if needed.

---

## 10. Administrators & Staff User Management (`AdminUsersManagement.tsx`)

Enterprise user management and Role-Based Access Control (RBAC).

### Key Capabilities:
- **Staff User Directory**: View all administrative and pedagogical accounts with their assigned roles and departments.
- **Create Staff Member**: Register new users with email, temporary password, department, and physical RFID card code (`cardCode`).
- **Role Assignment**: Assign roles with strict permission boundaries (`superadmin`, `owner`, `receptionist`, `instructor`).
- **On-Duty Shift Status**: Toggle active receptionist or instructor shift status.
- **Password Reset**: Administrators can issue secure password resets for staff members.
- **Self-Deletion Protection**: Guards prevent logged-in administrators from accidentally deleting their own account.

---

## 11. Analytics & Business Intelligence Hub (`AnalyticsHub.tsx`)

A dedicated data intelligence view synthesizing live performance metrics from PostgreSQL.
- **Revenue Trajectories**: Visual bucketed revenue trends across 30-day, 90-day, and 12-month windows.
- **Program Mix Distribution**: Percentage share of enrollment between Classical Ballet, Contemporary Dance, and Youth Division.
- **Predictive Forecasting**: 3-month conservative, base, and optimistic revenue forecasts calculated from historical recognized daily accruals.
- **Action Watchlists**: Identifies low-quota dancers (≤ 2 sessions remaining), tuition debtors, and expiring contracts for front-desk follow-up.

---

## 12. Studio Schedule Board & Conflict Prevention (`ScheduleBoard.tsx`)

Timetable orchestration across all dance studios.
- **Weekly Schedule Grid**: Visual timeline of studio occupancy for *Grand Studio Petipa*, *Studio Pavlova*, and *Studio Nijinsky*.
- **Automated Conflict Detection**: Evaluates non-cancelled sessions via `GET /api/ops/schedule-conflicts` to flag double-booked studio halls or instructors overlapping in time.
- **Pre-Session Notifications**: Trigger manual or scheduled WhatsApp reminders directly from the board.

---

## 13. Academy Hierarchy: Categories, Groups & Sessions (`AcademyView.tsx`)

A 3-step structured curricular model:
1. **Step 1 — Categories**: Define curriculum disciplines (e.g., *Pre-Professional Division*, *Youth Program*).
2. **Step 2 — Groups**: Form student cohorts within categories and assign primary ballet masters (`leadInstructorId`).
3. **Step 3 — Sessions**: Schedule individual studio classes linked to groups with automated enrollment tracking.

---

## 14. Admissions Pipeline Board (`AdmissionsPipeline.tsx`)

A dedicated Kanban board tracking prospective student inquiries:
- **Pipeline Stages**: `new_inquiry` → `trial_scheduled` → `evaluated` → `enrolled` → `rejected`.
- **SLA Watch**: Highlights leads older than 48 hours requiring staff follow-up (`GET /api/ops/funnel-sla`).
- **1-Click Conversion**: Automatically instantiates a `Student` record, assigns a barcode card, provisions a subscription plan, and links the family household.

---

## 15. Staff Roster & Shifts (`RosterView.tsx`)

Front-desk and faculty operational duty management.
- **Shift Scheduling**: Assign duty hours (`09:00` - `17:00`) and operational stations (*Reception desk*, *Studio floor manager*, *Masterclass coach*).
- **Leave Requests**: Review and approve/reject staff vacation or emergency absence applications.

---

## 16. Growth, Referrals & Promo Codes (`GrowthView.tsx`)

Academy expansion and customer loyalty toolkit.
- **Referral Tracking**: Monitor which families have referred new students and track reward eligibility.
- **Promo Code Generator**: Issue percentage or fixed-amount vouchers for workshops and uniform purchases with expiry bounds and usage limits.

---

## 17. Conservatory Blog & Press Manager (`BlogManager.tsx`)

Bilingual publishing engine for public conservatory announcements, performance season reviews, and audition dates.
- Rich text markdown editing with English and Arabic translations.
- Cover photography upload and automated SEO slug generation.

---

## 18. System Security & Audit Log (`AuditLogView.tsx`)

Immutable activity trail capturing sensitive administrative events:
- Security events (staff logins, role changes, password resets).
- CRM actions (debt overrides, manual quota additions, lead conversions).
- Financial events (invoice cancellations, journal vouchers, drawer shift closures).

---

## 19. Academy Settings Hub (`SettingsHub.tsx`)

Conservatory-wide system configuration:
- **Multi-Campus Management**: Configure physical branch locations (`Zamalek`, `New Cairo`) with contact information and main campus flags.
- **Academic Years**: Define term calendars (`2025/2026`) and execute seamless year rollover.
- **Tax Authority Integration**: Egyptian Tax Authority (ETA) e-receipt taxpayer ID, issuer code, and environment switches.
- **Payment Gateways**: Configure Paymob, Fawry, and InstaPay credentials.
- **WhatsApp Gateway Settings**: Manage provider bridge parameters and secret redaction toggles.




<!-- ============================================================================== -->
<!-- SECTION 7: CHAPTER 6: FINANCIAL ACCOUNTING SUITE & ALGORITHMS -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/docs/06_FINANCIAL_ACCOUNTING_SUITE.md -->
<!-- ============================================================================== -->

# 7. CHAPTER 6: FINANCIAL ACCOUNTING SUITE & ALGORITHMS

# 💰 Étoile Platform — Financial Accounting Suite & Algorithms

This document details the financial architecture, revenue recognition models, double-entry bookkeeping rules, and accounting workflows built into the Étoile Ballet Academy platform. The system adheres to international accounting principles (**IFRS 15 / ASC 606**) for deferred subscription revenue and provides front-desk cash drawer governance.

---

## 1. Financial Architecture Overview

The financial suite consists of seven interconnected subsystems managed within the `/admin` portal and backed by the NestJS `AccountingModule`:

```mermaid
graph TD
    subgraph Inflows ["Inflows & Revenue Streams"]
        SubRevenue["Subscription Packages Sold"]
        StoreSales["Boutique POS Retail Sales"]
        TuitionInvoices["Student Tuition & Private Lessons"]
    end

    subgraph CoreEngine ["Financial Accounting Engine"]
        AccrualModel["Daily Accrual Revenue Model\n(IFRS 15 Compliant)"]
        ARManager["Invoicing & AR Aging Buckets\n(Current, 1-30, 31-60, 60+)"]
        PnLCalculator["Profit & Loss (P&L) Engine"]
        GeneralLedger["Double-Entry General Ledger\n(Debit = Credit Balancing)"]
        DrawerShift["Cash Drawer Register Shifts\n(Float, Sales, Drops, Variance)"]
    end

    subgraph Outflows ["Outflows & Operational Costs"]
        Payroll["Instructor Monthly Payroll\n(Base + Hours + Privates)"]
        StudioExpenses["Studio Operating Expenses\n(Rent, Piano Tuning, Utilities)"]
    end

    SubRevenue --> AccrualModel
    StoreSales --> DrawerShift
    TuitionInvoices --> ARManager
    
    AccrualModel --> PnLCalculator
    ARManager --> PnLCalculator
    DrawerShift --> PnLCalculator
    Payroll --> PnLCalculator
    StudioExpenses --> PnLCalculator

    AccrualModel -.-> GeneralLedger
    ARManager -.-> GeneralLedger
    Payroll -.-> GeneralLedger
    StudioExpenses -.-> GeneralLedger
```

---

## 2. Subscription Revenue Recognition & Daily Accrual Model

### 2.1 The Accounting Challenge
In performing arts academies, students purchase class packages (e.g., *16 Classes for 480.00 € over 30 days*) that frequently span across calendar months (e.g., from August 15 to September 14).
- **Cash Basis Accounting** incorrectly recognizes the full 480.00 € in August, distorting profitability and leaving September with zero recognized revenue despite ongoing instruction costs.
- **Accrual Accounting (IFRS 15)** requires revenue to be recognized proportionally as the performance obligation is satisfied over time, treating unearned amounts as **Deferred Revenue (Contract Liability)**.

### 2.2 The Mathematical Formula
The platform calculates revenue on a strict **pro-rata daily accrual basis**:

$$\text{Daily Accrual Rate } (R_d) = \frac{\text{Plan Purchase Price } (P)}{\text{Total Contract Days } (T_{days})}$$

$$\text{Recognized Revenue } (R_{rec}) = R_d \times \text{Elapsed Days } (D_{elapsed})$$

$$\text{Deferred Revenue } (R_{def}) = P - R_{rec}$$

### 2.3 Concrete Example
A dancer purchases the *Conservatory Classical Elite* package on **August 15, 2026**:
- **Price ($P$)**: $4,800\text{ EGP}$ (or $480.00\text{ \euro}$)
- **Contract Duration ($T_{days}$)**: $30\text{ days}$ (expires September 14, 2026)
- **Daily Rate ($R_d$)**: $\frac{4,800}{30} = 160.00\text{ EGP / day}$ (or $16.00\text{ \euro / day}$)

At the close of August (17 elapsed days: Aug 15 to Aug 31):
- **August Recognized Revenue**: $160.00 \times 17 = 2,720.00\text{ EGP}$ ($272.00\text{ \euro}$) (Credited to Revenue)
- **August Deferred Revenue**: $4,800.00 - 2,720.00 = 2,080.00\text{ EGP}$ ($208.00\text{ \euro}$) (Held as Unearned Revenue contract liability)

In September (remaining 13 days: Sep 1 to Sep 14):
- **September Recognized Revenue**: $160.00 \times 13 = 2,080.00\text{ EGP}$ ($208.00\text{ \euro}$) recognized as performance obligations conclude.

---

## 3. Profit & Loss (P&L) Statement (`PnLStatementView.tsx`)

The P&L engine computes real-time profitability by aggregating recognized inflows against operational outflows:

### 3.1 Inflow Calculation
$$\text{Total Recognized Inflow} = \text{Recognized Subscriptions} + \text{Boutique Retail Gross Margin}$$
- **Recognized Subscriptions**: Sum of daily accrued revenue for all active contracts to date.
- **Boutique Retail Margin**: Gross boutique intake summed from `BoutiqueOrder` records (no cost baselines — empty books report zero).

### 3.2 Outflow Calculation
$$\text{Total Operational Outflow} = \text{Faculty Payroll} + \text{Studio OpEx}$$
- **Faculty Payroll**: Cumulative net remuneration from `PayrollRecord` entries for the academic term.
- **Studio OpEx**: Total verified expenditures from `Expense` records.

### 3.3 Net Profit
$$\text{Net Profit} = \text{Total Recognized Inflow} - \text{Total Operational Outflow}$$

### 3.4 Key Executive Metrics
- **Monthly Recurring Revenue (MRR)**: Subscription revenue earned inside the trailing 30-day window (overlap of each contract with `[now-30d, now]` × daily rate).
- **Churn Rate**: Share of subscriptions whose status is not `active` (expired by quota or date).
- **Quota Utilization Rate**: Percentage of purchased class sessions that dancers have physically attended ($\frac{\sum \text{usedSessions}}{\sum \text{maxSessions}} \times 100$).

---

## 4. Invoicing & Accounts Receivable Aging (`InvoicingAndArView.tsx`)

The Accounts Receivable (AR) module manages tuition billings, private coaching invoices, payment settlements, and aging debt.

### 4.1 Invoice Structure
- **Header**: Invoice number (`INV-XXXXXX`), student/family ID, customer name, issue date, due date, payment terms.
- **Itemized Lines (`InvoiceLineItem`)**: Description, quantity, unit price, subtotal.
- **Taxes & Totals**: Applicable VAT rate, subtotal, tax amount, and final total.
- **Settlement Tracking**: `amountPaid`, `remainingDue`, and status (`unpaid`, `partially_paid`, `paid`, `overdue`, `cancelled`).

### 4.2 AR Aging Buckets
The system categorizes all outstanding unpaid balances into standardized aging buckets:

| Aging Bucket | Overdue Period | Urgency Level | Automated Operational Action |
| :--- | :--- | :--- | :--- |
| **Current** | $0\text{ days}$ (Not yet due) | Normal | Standard invoice issued; due date pending |
| **1 — 30 Days** | $1 \text{ to } 30\text{ days overdue}$ | Notice | Friendly WhatsApp statement sent to parent |
| **31 — 60 Days** | $31 \text{ to } 60\text{ days overdue}$| Warning | Formal tuition reminder; front-desk notice flagged |
| **Over 60 Days** | $> 60\text{ days overdue}$ | Critical | Account suspended; check-in kiosk denies entry |

### 4.3 Multi-Channel Payment Recording
Staff can record invoice settlements across multiple payment rails:
- `cash`: Enters the active front-desk cash drawer shift.
- `card`: Credit/debit card terminal transaction.
- `bank_transfer`: Direct bank transfer with reference code.
- `fawry` / `instapay`: Regional instant payment gateways.

---

## 5. Studio Operating Expense Tracker (`ExpenseTrackerView.tsx`)

Maintains financial control over all conservatory operating disbursements.

### 5.1 Expense Categories
1. `studio_rent`: Facility lease and dance hall rental.
2. `piano_maintenance`: Regular tuning and acoustic maintenance of conservatory grand pianos.
3. `utilities`: Electricity, climate control, and water utilities.
4. `costumes_production`: Repertoire costumes, tiaras, and stage props for annual productions.
5. `cleaning_sanitization`: Specialized sprung marley floor cleaning and sanitization.
6. `marketing_social`: Digital campaigns and audition announcements.
7. `software_licenses`: Music licensing (SACEM), platform hosting, and accounting tools.
8. `administrative_legal`: Legal retained counsel and audit compliance.

### 5.2 Approval Workflow
- When staff submit an expense, it enters as `pending_audit`.
- Only `superadmin` or `owner` roles can update the status to `approved` or `rejected`.

---

## 6. Faculty & Instructor Payroll Calculator (`PayrollCalculatorView.tsx`)

Calculates complex monthly remuneration for ballet masters, accompanists, and guest choreographers.

### 6.1 Remuneration Formula
$$\text{Net Payable} = \text{Base} + (\text{HourlyRate} \times \text{HoursTaught}) + (\text{PrivateRate} \times \text{PrivatesCount}) + \text{Bonuses} - \text{Deductions}$$

- **Base Salary**: Fixed monthly compensation for resident artistic staff.
- **Group Hours Compensation**: Repertoire and group technique classes taught.
- **Private Coaching Compensation**: One-on-one competition coaching and variation preparation.
- **Bonuses**: Repertoire staging bonuses, student competition prizes.
- **Deductions**: Advance draws, tax withholdings.

### 6.2 Settlement Execution
Once reviewed, clicking **"Mark as Paid"** generates a unique local-rail transaction reference (CIB bank transfer or InstaPay, e.g., `CIB-982104`), updates the status to `paid`, and locks the record against further edits.

---

## 7. Double-Entry General Ledger (`GeneralLedgerView.tsx`)

Ensures complete accounting integrity via balanced double-entry journal vouchers.

### 7.1 Chart of Accounts (COA) Structure
| Account Code | Account Name | Type | Normal Balance |
| :--- | :--- | :--- | :--- |
| `1010` | Cash on Hand (Front Desk) | Asset | Debit |
| `1020` | Operating Bank Account | Asset | Debit |
| `1200` | Accounts Receivable (Tuition Due) | Asset | Debit |
| `1300` | Retail Boutique Inventory | Asset | Debit |
| `2010` | Accounts Payable (Suppliers) | Liability | Credit |
| `2100` | Deferred Subscription Revenue | Liability | Credit |
| `3010` | Academy Capital & Retained Earnings| Equity | Credit |
| `4010` | Classical Ballet Tuition Revenue | Revenue | Credit |
| `4020` | Boutique Retail Sales Revenue | Revenue | Credit |
| `5010` | Faculty Pedagogical Payroll Expense| Expense | Debit |
| `5020` | Studio Rent & Facilities Expense | Expense | Debit |
| `5030` | Piano & Floor Maintenance Expense | Expense | Debit |

### 7.2 Integrity Constraint
Every journal voucher enforces strict balancing before posting:

$$\sum \text{Debit Lines} = \sum \text{Credit Lines}$$

Any voucher where $\sum \text{Debits} \neq \sum \text{Credits}$ is rejected with a validation error.

---

## 8. Front-Desk Cash Drawer Shift Management (`CashDrawerShiftView.tsx`)

Provides strict financial governance over physical cash handled at the academy reception desk.

```mermaid
stateDiagram-v2
    [*] --> ShiftOpen: Receptionist opens shift with Opening Float (e.g. 500 €)
    ShiftOpen --> Transactions: Cash Boutique Sales (+ Cash)
    ShiftOpen --> Transactions: Cash Tuition Payments (+ Cash)
    ShiftOpen --> Transactions: Cash Drops / Mid-Day Safe Deposits (- Cash)
    Transactions --> ShiftClosing: Receptionist performs physical cash count
    ShiftClosing --> ShiftClosed: System calculates Variance (Actual - Expected)
    ShiftClosed --> [*]
```

### 8.1 Opening a Shift
- The receptionist on duty enters their name and physical **Opening Float** (e.g., $500.00\text{ \euro}$ in coin and banknote change).
- The system generates a unique shift code (e.g., `SHIFT-2026-081`) with status `open`.

### 8.2 Real-Time Cash Accumulation
During the shift:
- Any boutique sale paid in cash increments `cashSalesTotal`.
- Any invoice settled in cash increments `cashSalesTotal`.
- Any mid-day deposit sent to the main safe is logged as a `cashDrop`.

### 8.3 Expected Cash Calculation
$$\text{Expected Cash} = \text{Opening Float} + \text{Cash Sales} - \text{Cash Drops}$$

### 8.4 Closing the Shift & Variance Reconciliation
At the end of the day:
1. The cashier physically counts the cash drawer banknotes and coins.
2. Enters `actualCashCounted`.
3. The system calculates the discrepancy:

$$\text{Variance} = \text{Actual Cash Counted} - \text{Expected Cash}$$

- **Zero Variance ($0.00\text{ \euro}$)**: Perfect cash drawer reconciliation.
- **Negative Variance**: Cash shortage requiring cashier explanatory notes.
- **Positive Variance**: Cash overage requiring investigation.
4. The shift status transitions to `closed`, locking all payment transaction ties.

---

## 9. Digital Payments & Pay-Links Gateway Engine (`PaymentLink`)

The academy supports omnichannel online settlement alongside in-person front-desk payments:

### 9.1 Multi-Provider Pay-Links
- **Gateways Supported**: Paymob (Cards, Mobile Wallets), Fawry (Reference payment codes), and InstaPay (Direct account transfer).
- **Link Generation**: Created via `POST /api/payments/paylink` with a 48-hour expiration window.
- **Dynamic Portal URL**: Embeds the unguessable crypto-random reference code (`PAYMOB-XXXXXX`).

### 9.2 Automated Webhook Reconciliation
1. Gateway notifies `POST /api/payments/webhook`.
2. The endpoint verifies provider reference authenticity.
3. Automatically marks the invoice as paid, records a `PaymentTransaction`, updates student ledger balances, and creates an audit entry without manual cashier intervention.

---

## 10. Egyptian Tax Authority (ETA) Electronic Receipt Compliance (`EtaDocument`)

Ensures statutory tax compliance for academy operations within Egypt:
- **B2C e-Receipts & B2B Invoices**: Auto-formatted to the required ETA JSON schema including unified tax registration numbers, issuer codes, item descriptions, and VAT tax buckets.
- **Drafting & Transmission Pipeline**:
  - `POST /api/eta/submit`: Prepares electronic invoice structure with tax calculations.
  - Automatically transitions from `draft` to `submitted` and records ETA receipt UUIDs upon validation.
- **Historical Audit Archive**: Full storage of raw signed request payloads and responses (`rawPayload`, `rawResponse`) for government tax inspection.

---

## 11. Multi-Campus Segment Reporting (Branches)

Allows financial controllers to analyze revenues and operational expenditures segregated by physical campus:
- **Campus Segment Allocation**: Every tuition invoice, POS boutique order, and instructor payroll record tracks the target campus branch (`Zamalek`, `New Cairo`).
- **Campus P&L**: Separate profitability, studio utilization, and average revenue per student (ARPU) metrics per facility.




<!-- ============================================================================== -->
<!-- SECTION 8: CHAPTER 7: DEPLOYMENT, OPERATIONS & TESTING REFERENCE -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/docs/07_DEPLOYMENT_OPERATIONS_AND_TESTING.md -->
<!-- ============================================================================== -->

# 8. CHAPTER 7: DEPLOYMENT, OPERATIONS & TESTING REFERENCE

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



<!-- ============================================================================== -->
<!-- SECTION 9: CHAPTER 8: ROADMAP EXECUTION & PRODUCTION READINESS -->
<!-- SOURCE: /Users/bishoy/Desktop/Etoile/docs/08_ROADMAP_EXECUTION.md -->
<!-- ============================================================================== -->

# 9. CHAPTER 8: ROADMAP EXECUTION & PRODUCTION READINESS

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



