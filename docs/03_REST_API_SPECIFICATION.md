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

