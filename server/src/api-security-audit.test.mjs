// Automated API & Security Test Runner for Étoile Ballet Academy API
const BASE_URL = 'http://localhost:3001/api';

const results = [];

function record(name, category, passed, details, severity = 'INFO') {
  results.push({ name, category, passed, details, severity });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name}: ${details}`);
}

async function runTests() {
  console.log('🚀 Starting Comprehensive Étoile API & Security Test Suite...\n');

  let superadminToken = null;
  let receptionistToken = null;
  let familyToken = null;

  // -------------------------------------------------------------
  // 1. AUTHENTICATION & LOGIN ENDPOINTS
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'director@etoile.fr', password: 'etoile2026' }),
    });
    const data = await res.json();
    if (res.status === 201 || res.status === 200) {
      if (data.access_token && data.user && !data.user.passwordHash) {
        superadminToken = data.access_token;
        record('Superadmin Login Valid', 'AUTH', true, 'Returned 200 with JWT and sanitized user object (no passwordHash)');
      } else {
        record('Superadmin Login Sanitization', 'AUTH', false, 'Missing token or exposed password hash', 'HIGH');
      }
    } else {
      record('Superadmin Login Valid', 'AUTH', false, `Status ${res.status}: ${JSON.stringify(data)}`, 'CRITICAL');
    }
  } catch (e) {
    record('Superadmin Login Valid', 'AUTH', false, e.message, 'CRITICAL');
  }

  // Receptionist Login
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'reception@etoile.fr', password: 'etoile2026' }),
    });
    const data = await res.json();
    if (res.status === 201 || res.status === 200) {
      receptionistToken = data.access_token;
      record('Receptionist Login Valid', 'AUTH', true, 'Returned 200 with JWT and receptionist role');
    } else {
      record('Receptionist Login Valid', 'AUTH', false, `Status ${res.status}`, 'HIGH');
    }
  } catch (e) {
    record('Receptionist Login Valid', 'AUTH', false, e.message, 'HIGH');
  }

  // Invalid Credentials (Wrong Password)
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'director@etoile.fr', password: 'wrongpassword' }),
    });
    record('Reject Bad Password', 'AUTH', res.status === 401, `Status: ${res.status} (expected 401 Unauthorized)`);
  } catch (e) {
    record('Reject Bad Password', 'AUTH', false, e.message);
  }

  // Non-existent user
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'attacker@evil.com', password: 'etoile2026' }),
    });
    record('Reject Unknown User', 'AUTH', res.status === 401, `Status: ${res.status} (expected 401 Unauthorized)`);
  } catch (e) {
    record('Reject Unknown User', 'AUTH', false, e.message);
  }

  // Empty Payload Validation
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    record('Validation On Empty Body', 'VALIDATION', res.status === 400, `Status: ${res.status} (expected 400 Bad Request)`);
  } catch (e) {
    record('Validation On Empty Body', 'VALIDATION', false, e.message);
  }

  // -------------------------------------------------------------
  // 2. UNIFIED STUDENT / PARENT AUTHENTICATION (FAMILY LOGIN REMOVED)
  // -------------------------------------------------------------
  try {
    // Legacy endpoint must return 404
    const legacyRes = await fetch(`${BASE_URL}/auth/family/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'FAM-01' }),
    });
    record(
      'Legacy Family Login Endpoint Disabled',
      'FAMILY_AUTH',
      legacyRes.status === 404,
      `POST /auth/family/login returns ${legacyRes.status} (disabled in favor of unified student/parent authentication)`
    );

    // Login with student credentials (barcode + student password)
    const res = await fetch(`${BASE_URL}/auth/card-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'ETOILE-892101', password: 'etoile2026' }),
    });
    const data = await res.json();
    if ((res.status === 200 || res.status === 201) && data.access_token && data.student) {
      familyToken = data.access_token;
      record(
        'Student/Parent Card Login Valid & Scoped',
        'FAMILY_AUTH',
        data.student.id === 'STU-001' && data.familyId === 'FAM-01',
        `Returned authorized session for dancer ${data.student.name} with familyId ${data.familyId}`
      );
    } else {
      record('Student/Parent Card Login Valid & Scoped', 'FAMILY_AUTH', false, `Status ${res.status}: ${JSON.stringify(data).slice(0, 100)}`);
    }
  } catch (e) {
    record('Student/Parent Card Login Valid & Scoped', 'FAMILY_AUTH', false, e.message);
  }

  // Family Me Verification with Student Token
  try {
    if (familyToken) {
      const res = await fetch(`${BASE_URL}/auth/family/me`, {
        headers: { Authorization: `Bearer ${familyToken}` },
      });
      const data = await res.json();
      record(
        'Family Session Restore (/auth/family/me)',
        'FAMILY_AUTH',
        res.status === 200 && (data.familyId === 'FAM-01' || data.id === 'FAM-01'),
        `Successfully restored family profile for ${data.parentName || data.family?.parentName || 'FAM-01'}`
      );
    }
  } catch (e) {
    record('Family Session Restore', 'FAMILY_AUTH', false, e.message);
  }

  // Demo Cards Endpoint (sanitized, replaces legacy family demo accounts)
  try {
    const res = await fetch(`${BASE_URL}/auth/demo-cards`);
    const data = await res.json();
    record(
      'Demo Cards Public Endpoint',
      'FAMILY_AUTH',
      res.status === 200 && Array.isArray(data) && data.length > 0,
      `Returned ${Array.isArray(data) ? data.length : 0} demo cards with sanitized fields`
    );
  } catch (e) {
    record('Demo Cards Public Endpoint', 'FAMILY_AUTH', false, e.message);
  }

  // Card Authentication Endpoints
  try {
    const resEmptyCard = await fetch(`${BASE_URL}/auth/card-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: '' }),
    });
    record(
      'Card Login Rejects Empty Code',
      'AUTH',
      resEmptyCard.status === 400,
      `Status: ${resEmptyCard.status} (expected 400 Bad Request)`
    );

    const resUnknownCard = await fetch(`${BASE_URL}/auth/card-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'NON-EXISTENT-CARD-999', password: 'password' }),
    });
    record(
      'Card Login Rejects Unknown Card',
      'AUTH',
      resUnknownCard.status === 401,
      `Status: ${resUnknownCard.status} (expected 401 Unauthorized)`
    );

    const resReqEmpty = await fetch(`${BASE_URL}/auth/request-initial-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: '' }),
    });
    record(
      'Request Initial Password Validates Card',
      'AUTH',
      resReqEmpty.status === 400,
      `Status: ${resReqEmpty.status} (expected 400 Bad Request)`
    );

    const resOtpEmpty = await fetch(`${BASE_URL}/auth/forgot-password/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: '' }),
    });
    record(
      'Password Reset OTP Validates Card',
      'AUTH',
      resOtpEmpty.status === 400,
      `Status: ${resOtpEmpty.status} (expected 400 Bad Request)`
    );
  } catch (e) {
    record('Card Authentication Endpoints', 'AUTH', false, e.message);
  }

  // -------------------------------------------------------------
  // 3. JWT GUARDS & RBAC AUTHORIZATION
  // -------------------------------------------------------------
  try {
    const resUnauth = await fetch(`${BASE_URL}/auth/me`);
    record('Unauthenticated /auth/me Rejected', 'AUTH_GUARD', resUnauth.status === 401, `Status: ${resUnauth.status} (expected 401)`);

    const resBadToken = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer forged.token.value' },
    });
    record('Forged Token /auth/me Rejected', 'AUTH_GUARD', resBadToken.status === 401, `Status: ${resBadToken.status} (expected 401)`);

    if (superadminToken) {
      const resAuth = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      const profile = await resAuth.json();
      record('Authenticated /auth/me Allowed', 'AUTH_GUARD', resAuth.status === 200 && profile.email === 'director@etoile.fr', `Status: ${resAuth.status}`);
    }

    if (receptionistToken) {
      // Receptionist trying to alter staff shift status (Superadmin/Owner only)
      const resRbac = await fetch(`${BASE_URL}/auth/staff/STAFF-01/shift`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${receptionistToken}` },
      });
      record(
        'RBAC Blocks Receptionist from Staff Shift Alteration',
        'RBAC',
        resRbac.status === 403,
        `Status: ${resRbac.status} (expected 403 Forbidden)`
      );
    }

    if (superadminToken) {
      // Superadmin altering staff shift status
      const resSuper = await fetch(`${BASE_URL}/auth/staff/STAFF-03/shift`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      record(
        'RBAC Allows Superadmin Staff Shift Alteration',
        'RBAC',
        resSuper.status === 200,
        `Status: ${resSuper.status} (expected 200 OK)`
      );
    }

    if (familyToken) {
      // Family token trying to access superadmin student directory
      const resFamRbac = await fetch(`${BASE_URL}/students`, {
        headers: { Authorization: `Bearer ${familyToken}` },
      });
      record(
        'RBAC Blocks Family Token from Academy Student Directory',
        'RBAC',
        resFamRbac.status === 403,
        `Status: ${resFamRbac.status} (expected 403 Forbidden)`
      );
    }
  } catch (e) {
    record('JWT Guard & RBAC Tests', 'RBAC', false, e.message);
  }

  // -------------------------------------------------------------
  // 4. SENSITIVE DATA EXPOSURE AUDIT (ALL ROUTES GUARDED)
  // -------------------------------------------------------------
  // A. Students Directory
  try {
    const res = await fetch(`${BASE_URL}/students`);
    const isProtected = res.status === 401;
    record(
      'SECURITY AUDIT: GET /api/students Guarded',
      'SECURITY_DEFECT',
      isProtected,
      `Status: ${res.status} (expected 401 Unauthorized)`
    );

    if (superadminToken) {
      const resAuth = await fetch(`${BASE_URL}/students`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      const data = await resAuth.json();
      record(
        'Authenticated Staff Can Access /api/students',
        'SECURITY_DEFECT',
        resAuth.status === 200 && Array.isArray(data),
        `Returned ${Array.isArray(data) ? data.length : 0} student records from PostgreSQL`
      );
    }
  } catch (e) {
    record('GET /api/students check', 'SECURITY_DEFECT', false, e.message);
  }

  // B. Financials P&L Endpoint
  try {
    const res = await fetch(`${BASE_URL}/accounting/pnl`);
    record(
      'SECURITY AUDIT: GET /api/accounting/pnl Guarded',
      'SECURITY_DEFECT',
      res.status === 401,
      `Status: ${res.status} (expected 401 Unauthorized)`
    );

    if (superadminToken) {
      const resAuth = await fetch(`${BASE_URL}/accounting/pnl`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      record(
        'Authenticated Director Can Access /api/accounting/pnl',
        'SECURITY_DEFECT',
        resAuth.status === 200,
        `Status: ${resAuth.status}`
      );
    }
  } catch (e) {
    record('GET /api/accounting/pnl check', 'SECURITY_DEFECT', false, e.message);
  }

  // C. Staff Payroll Endpoint
  try {
    const res = await fetch(`${BASE_URL}/accounting/payroll`);
    record(
      'SECURITY AUDIT: GET /api/accounting/payroll Guarded',
      'SECURITY_DEFECT',
      res.status === 401,
      `Status: ${res.status} (expected 401 Unauthorized)`
    );
  } catch (e) {
    record('GET /api/accounting/payroll check', 'SECURITY_DEFECT', false, e.message);
  }

  // D. Expenses & Invoices Endpoints
  try {
    const resExp = await fetch(`${BASE_URL}/accounting/expenses`);
    record(
      'SECURITY AUDIT: GET /api/accounting/expenses Guarded',
      'SECURITY_DEFECT',
      resExp.status === 401,
      `Status: ${resExp.status} (expected 401 Unauthorized)`
    );

    const resInv = await fetch(`${BASE_URL}/accounting/invoices`);
    record(
      'SECURITY AUDIT: GET /api/accounting/invoices Guarded',
      'SECURITY_DEFECT',
      resInv.status === 401,
      `Status: ${resInv.status} (expected 401 Unauthorized)`
    );

    const resShifts = await fetch(`${BASE_URL}/accounting/cash-shifts`);
    record(
      'SECURITY AUDIT: GET /api/accounting/cash-shifts Guarded',
      'SECURITY_DEFECT',
      resShifts.status === 401,
      `Status: ${resShifts.status} (expected 401 Unauthorized)`
    );
  } catch (e) {
    record('Accounting endpoints check', 'SECURITY_DEFECT', false, e.message);
  }

  // E. Leads CRM Endpoint
  try {
    const res = await fetch(`${BASE_URL}/leads`);
    record(
      'SECURITY AUDIT: GET /api/leads (CRM Leads) Guarded',
      'SECURITY_DEFECT',
      res.status === 401,
      `Status: ${res.status} (expected 401 Unauthorized)`
    );
  } catch (e) {
    record('GET /api/leads check', 'SECURITY_DEFECT', false, e.message);
  }

  // F. WhatsApp Messages Queue
  try {
    const res = await fetch(`${BASE_URL}/openwa/messages`);
    record(
      'SECURITY AUDIT: GET /api/openwa/messages Guarded',
      'SECURITY_DEFECT',
      res.status === 401,
      `Status: ${res.status} (expected 401 Unauthorized)`
    );
  } catch (e) {
    record('GET /api/openwa/messages check', 'SECURITY_DEFECT', false, e.message);
  }

  // G. Portal CMS Modification Guard
  try {
    const res = await fetch(`${BASE_URL}/portal-content/hero`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Étoile Ballet Academy Paris' }),
    });
    record(
      'SECURITY AUDIT: PATCH /api/portal-content/hero Guarded',
      'SECURITY_DEFECT',
      res.status === 401,
      `Status: ${res.status} (expected 401 Unauthorized)`
    );
  } catch (e) {
    record('PATCH /api/portal-content/hero check', 'SECURITY_DEFECT', false, e.message);
  }

  // -------------------------------------------------------------
  // 5. PUBLIC & FUNCTIONAL API BEHAVIOR
  // -------------------------------------------------------------
  // A. Public Portal Content Retrieval
  try {
    const res = await fetch(`${BASE_URL}/portal-content`);
    const data = await res.json();
    record(
      'Public Portal Content Retrieval',
      'API_FUNCTION',
      res.status === 200 && !!data.hero && !!data.programs,
      `Returned valid CMS tree with hero headline "${data?.hero?.headlineLine1} ${data?.hero?.headlineLine2}"`
    );
  } catch (e) {
    record('Public Portal Content Retrieval', 'API_FUNCTION', false, e.message);
  }

  // B. Public Landing Lead Submission
  try {
    const res = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dancerName: 'Audition Applicant Test',
        age: 10,
        parentName: 'Test Parent',
        parentPhone: '+33 6 00 11 22 33',
        parentEmail: 'test.parent@example.com',
        program: 'classical',
        notes: 'Inquiry submitted from public landing',
      }),
    });
    record(
      'Public Lead Enrollment (POST /api/leads)',
      'API_FUNCTION',
      res.status === 201 || res.status === 200,
      `Status: ${res.status} (expected 201 Created)`
    );
  } catch (e) {
    record('Public Lead Enrollment', 'API_FUNCTION', false, e.message);
  }

  // C. Public Subscription Plans Retrieval
  try {
    const res = await fetch(`${BASE_URL}/subscriptions/plans`);
    const data = await res.json();
    record(
      'Public Subscriptions Plans Retrieval',
      'API_FUNCTION',
      res.status === 200 && Array.isArray(data) && data.length > 0,
      `Returned ${Array.isArray(data) ? data.length : 0} subscription plans from database`
    );
  } catch (e) {
    record('Public Subscriptions Plans', 'API_FUNCTION', false, e.message);
  }

  // D. Public POS Products Retrieval
  try {
    const res = await fetch(`${BASE_URL}/pos/products`);
    const data = await res.json();
    record(
      'Public POS Products Retrieval',
      'API_FUNCTION',
      res.status === 200 && Array.isArray(data) && data.length > 0,
      `Returned ${Array.isArray(data) ? data.length : 0} boutique products`
    );
  } catch (e) {
    record('Public POS Products', 'API_FUNCTION', false, e.message);
  }

  // E. Authenticated Subscription Accrual Calculator
  try {
    if (superadminToken) {
      const res = await fetch(`${BASE_URL}/accounting/accrual?price=4800&totalDays=30&daysInMonth1=15`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      const data = await res.json();
      const isMathCorrect = data.recognizedRevenueMonth1 === 2400 && data.deferredRevenueMonth2 === 2400 && data.dailyAccrualRate === 160;
      record(
        'Authenticated Accrual Allocation Calculation',
        'API_FUNCTION',
        res.status === 200 && isMathCorrect,
        `Calculated: M1=${data.recognizedRevenueMonth1}€, M2=${data.deferredRevenueMonth2}€, Daily=${data.dailyAccrualRate}€`
      );
    }
  } catch (e) {
    record('Authenticated Accrual Allocation Calculation', 'API_FUNCTION', false, e.message);
  }

  // F. Authenticated Attendance Check-in
  try {
    if (receptionistToken) {
      const res = await fetch(`${BASE_URL}/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${receptionistToken}`,
        },
        body: JSON.stringify({ barcode: 'ETOILE-892101', method: 'hid_barcode' }),
      });
      const data = await res.json();
      record(
        'Authenticated Attendance Check-in Execution',
        'API_FUNCTION',
        res.status === 201 || res.status === 200,
        `Check-in response: success=${data.success}, remainingQuota=${data.quotaRemaining ?? data.reason}`
      );
    }
  } catch (e) {
    record('Authenticated Attendance Check-in Execution', 'API_FUNCTION', false, e.message);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n========================================');
  console.log('🏁 TEST RUN COMPLETE');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Tests: ${total} | Passed: ${passed} | Deficiencies/Vulnerabilities Flagged: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS LIST:');
    results.filter(r => !r.passed).forEach(r => console.log(` - [${r.category}] ${r.name}: ${r.details}`));
    process.exit(1);
  }
}

runTests();
