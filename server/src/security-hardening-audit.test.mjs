// Security-hardening & correctness audit for the Étoile Ballet Academy API.
// Runs against a live server (same convention as the other *.audit.test.mjs
// suites) and is wired into `npm test` AFTER the legacy suites.
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:3001/api';
const prisma = new PrismaClient();

const results = [];
function record(name, passed, details) {
  results.push({ name, passed });
  console.log(`${passed ? '✅' : '❌'} ${name}: ${details}`);
}

async function staffLogin(identifier, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  assert.strictEqual(res.status, 201, `login failed for ${identifier}: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function resetLeo() {
  await prisma.student.updateMany({
    where: { barcode: 'ETOILE-892102' },
    data: { passwordHash: null, isFirstLogin: true, otpCode: null, otpExpiresAt: null, otpAttempts: 0, otpLockedUntil: null },
  });
}

async function runAudit() {
  console.log('🛡️  Starting Étoile Security-Hardening & Correctness Audit...\n');
  const directorToken = await staffLogin('director@etoile.fr', 'etoile2026');
  const receptionToken = await staffLogin('reception@etoile.fr', 'etoile2026');
  const authHeaders = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

  // 1. Health endpoint -------------------------------------------------------
  {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    record('Health endpoint live', res.status === 200 && data.db === 'up', `status=${data.status} db=${data.db}`);
    assert.strictEqual(res.status, 200);
  }

  // 2. Demo cards carry no phone numbers ------------------------------------
  {
    const res = await fetch(`${BASE_URL}/auth/demo-cards`);
    const data = await res.json();
    const leaksPhone = Array.isArray(data) && data.some((c) => 'parentPhone' in c || 'phone' in c);
    record('Demo cards sanitized', res.status === 200 && data.length > 0 && !leaksPhone, `${data.length} cards, phone leaked: ${leaksPhone}`);
    assert.strictEqual(res.status, 200);
    assert.ok(!leaksPhone);
  }

  // 3. Anonymous schedule lookups redact contacts ------------------------------
  {
    const stuRes = await fetch(`${BASE_URL}/courses/student/my-schedule/ETOILE-892101`);
    const stu = await stuRes.json();
    record(
      'Student schedule redacts parentPhone anonymously',
      stuRes.status === 200 && stu.student?.parentPhone === undefined,
      `status=${stuRes.status} parentPhone=${stu.student?.parentPhone ?? 'absent'}`,
    );
    assert.strictEqual(stuRes.status, 200);
    assert.strictEqual(stu.student?.parentPhone, undefined);

    const insRes = await fetch(`${BASE_URL}/courses/instructor/my-schedule/INS-01`);
    const ins = await insRes.json();
    record(
      'Instructor schedule redacts contacts anonymously',
      insRes.status === 200 && ins.instructor?.email === undefined && ins.instructor?.phone === undefined,
      `status=${insRes.status}`,
    );
    assert.strictEqual(insRes.status, 200);
    assert.strictEqual(ins.instructor?.email, undefined);
  }

  // 4. Temp setup tokens cannot touch the API ----------------------------------
  {
    await resetLeo();
    const reqRes = await fetch(`${BASE_URL}/auth/request-initial-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'ETOILE-892102' }),
    });
    assert.strictEqual(reqRes.status, 201);

    const logsRes = await fetch(`${BASE_URL}/openwa/messages`, {
      headers: { Authorization: `Bearer ${directorToken}` },
    });
    const logs = await logsRes.json();
    const tempLog = logs.find((l) => l.body && l.body.includes('ETOILE-892102'));
    const tempPassword = tempLog.body.match(/Temporary Password:\s*\*?(ETOILE-\d+)\*?/i)[1];

    const loginRes = await fetch(`${BASE_URL}/auth/card-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'ETOILE-892102', password: tempPassword }),
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.mustChangePassword, true);
    assert.ok(loginData.token, 'must-change-password flow returns a setup token');

    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    record('Temporary setup token rejected by guards', meRes.status === 401, `GET /auth/me with setup token → ${meRes.status}`);
    assert.strictEqual(meRes.status, 401);
    await resetLeo();
  }

  // 5. OTP brute-force lockout --------------------------------------------------
  {
    await resetLeo();
    const otpRes = await fetch(`${BASE_URL}/auth/forgot-password/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'ETOILE-892102' }),
    });
    assert.strictEqual(otpRes.status, 201);

    let lastStatus = 0;
    let lastBody = '';
    for (let i = 0; i < 6; i++) {
      const r = await fetch(`${BASE_URL}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardCode: 'ETOILE-892102', otp: '000000', newPassword: 'nope-nope-1' }),
      });
      lastStatus = r.status;
      lastBody = await r.text();
    }
    const locked = lastStatus === 400 && lastBody.includes('Too many');
    record('OTP locks after repeated failures', locked, `6th attempt → ${lastStatus}`);
    assert.ok(locked);
    await resetLeo();
  }

  // 6. Unified Student/Parent & Instructor Login (Family login removed) --------
  {
    // A. Verify that legacy /auth/family/login is removed and returns 404
    const legacyFamilyLogin = await fetch(`${BASE_URL}/auth/family/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'FAM-01' }),
    });
    assert.strictEqual(legacyFamilyLogin.status, 404);

    // B. Student logs in with barcode and student password
    const studentLogin = await fetch(`${BASE_URL}/auth/card-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'ETOILE-892101', password: 'etoile2026' }),
    });
    const stuData = await studentLogin.json();
    assert.strictEqual(studentLogin.status, 201);
    assert.strictEqual(stuData.userType, 'student');
    assert.strictEqual(stuData.student.id, 'STU-001');
    assert.strictEqual(stuData.familyId, 'FAM-01');

    // C. Parent logs in using student ID with student password
    const parentLoginId = await fetch(`${BASE_URL}/auth/card-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'STU-001', password: 'etoile2026' }),
    });
    const parentIdData = await parentLoginId.json();
    assert.strictEqual(parentLoginId.status, 201);
    assert.strictEqual(parentIdData.student.id, 'STU-001');

    // D. Parent logs in using parent email with student password
    const parentLoginEmail = await fetch(`${BASE_URL}/auth/card-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'eleonore.moreau@artparis.fr', password: 'etoile2026' }),
    });
    const parentEmailData = await parentLoginEmail.json();
    assert.strictEqual(parentLoginEmail.status, 201);
    assert.strictEqual(parentEmailData.student.id, 'STU-001');

    // E. Invalid password rejected
    const badPass = await fetch(`${BASE_URL}/auth/card-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: 'ETOILE-892101', password: 'wrongpassword' }),
    });
    assert.strictEqual(badPass.status, 401);

    record(
      'Unified Student/Parent Login Active (Family Login Removed)',
      legacyFamilyLogin.status === 404 && studentLogin.status === 201 && parentLoginEmail.status === 201 && badPass.status === 401,
      'Legacy family login removed (404); Barcode, Student ID, and Parent Email login verified with student password.'
    );
  }

  // 7. Invoice creation maps to the real schema ---------------------------------
  {
    const res = await fetch(`${BASE_URL}/accounting/invoices`, {
      method: 'POST',
      headers: authHeaders(directorToken),
      body: JSON.stringify({
        customerName: 'Audit Test Client',
        subtotal: 100,
        taxRate: 0,
        total: 100,
        items: [{ description: 'Audit tuition line', quantity: 2, unitPrice: 50 }],
      }),
    });
    const inv = await res.json();
    const ok =
      res.status === 201 &&
      Number(inv.total) === 100 &&
      inv.status === 'unpaid' &&
      Number(inv.items?.[0]?.amount) === 100;
    record('Invoice creation round-trips on schema fields', ok, `status=${res.status} total=${inv.total} line=${inv.items?.[0]?.amount}`);
    assert.ok(ok);
  }

  // 8. POS: server prices win + stock validated ----------------------------------
  {
    const productsRes = await fetch(`${BASE_URL}/pos/products`);
    const products = await productsRes.json();
    const withStock = products.find((p) => p.variants?.some((v) => v.stock > 2));
    assert.ok(withStock, 'Need a product with stock > 2 for POS audit');
    const variant = withStock.variants.find((v) => v.stock > 2);
    const catalogPrice = withStock.price;

    const tampered = await fetch(`${BASE_URL}/pos/checkout`, {
      method: 'POST',
      headers: authHeaders(directorToken),
      body: JSON.stringify({
        items: [{ productId: withStock.id, size: variant.size, quantity: 1, price: 0.01 }],
        paymentMethod: 'cash',
        customerName: 'Audit Desk',
      }),
    });
    const tamperedData = await tampered.json();
    const priceOk = tampered.status === 201 && Number(tamperedData.totalAmount) === Number(catalogPrice);
    record('Checkout re-prices from catalog (tampered 0.01 rejected)', priceOk, `charged=${tamperedData.totalAmount} catalog=${catalogPrice}`);
    assert.ok(priceOk);

    const oversell = await fetch(`${BASE_URL}/pos/checkout`, {
      method: 'POST',
      headers: authHeaders(directorToken),
      body: JSON.stringify({
        items: [{ productId: withStock.id, size: variant.size, quantity: variant.stock + 100, price: catalogPrice }],
        paymentMethod: 'cash',
        customerName: 'Audit Desk',
      }),
    });
    record('Oversell rejected with 400', oversell.status === 400, `oversell → ${oversell.status}`);
    assert.strictEqual(oversell.status, 400);
  }

  // 9. Attendance: premise flag + double-scan dedupe ------------------------------
  {
    const regRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: authHeaders(directorToken),
      body: JSON.stringify({
        name: 'Audit Dancer',
        nameAr: 'راقص تجريبي',
        age: 12,
        program: 'classical',
        level: 'Beginner',
        parentName: 'Audit Parent',
        parentPhone: '+33 6 00 00 00 99',
        parentEmail: 'audit.parent@example.com',
      }),
    });
    const created = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    assert.match(created.barcode, /^ETOILE-\d+$/);

    const scan = (extra) =>
      fetch(`${BASE_URL}/attendance/checkin`, {
        method: 'POST',
        headers: authHeaders(receptionToken),
        body: JSON.stringify({ barcode: created.barcode, method: 'hid_barcode', ...extra }),
      }).then((r) => r.json());

    const first = await scan({ wifiBssid: 'Evil-AP-Spoof' });
    assert.strictEqual(first.success, true);
    record('Spoofed BSSID check-in marked unverified', first.record?.premiseVerified === false, `premiseVerified=${first.record?.premiseVerified}`);
    assert.strictEqual(first.record?.premiseVerified, false);

    const second = await scan({});
    record('Immediate re-scan deduped (no second deduction)', second.success === true && second.duplicate === true, `duplicate=${second.duplicate}`);
    assert.strictEqual(second.duplicate, true);

    const afterRes = await fetch(`${BASE_URL}/students/${created.id}`, {
      headers: { Authorization: `Bearer ${directorToken}` },
    });
    const after = await afterRes.json();
    record('Exactly one session consumed by double scan', after.subscription?.usedSessions === 1, `usedSessions=${after.subscription?.usedSessions}`);
    assert.strictEqual(after.subscription?.usedSessions, 1);

    await fetch(`${BASE_URL}/students/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${directorToken}` },
    });
  }

  // 10. Refresh-token rotation, reuse detection & logout -------------------------
  {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'director@etoile.fr', password: 'etoile2026' }),
    });
    const loginData = await loginRes.json();
    assert.ok(loginData.access_token && loginData.refresh_token, 'login must issue an access+refresh pair');
    assert.strictEqual(loginData.expires_in, 1800);
    const claims = JSON.parse(Buffer.from(loginData.access_token.split('.')[1], 'base64').toString());
    record(
      'Access token is short-lived (~30 min)',
      Math.abs(claims.exp - claims.iat - 1800) < 5,
      `ttl=${claims.exp - claims.iat}s`,
    );
    assert.ok(Math.abs(claims.exp - claims.iat - 1800) < 5);

    const doRefresh = (body) =>
      fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    const r1 = await doRefresh({ refreshToken: loginData.refresh_token });
    const d1 = await r1.json();
    const rotated =
      r1.status === 201 && !!d1.access_token && !!d1.refresh_token && d1.refresh_token !== loginData.refresh_token;
    record('Refresh rotates to a fresh pair', rotated, `status=${r1.status}`);
    assert.ok(rotated);

    const reuse = await doRefresh({ refreshToken: loginData.refresh_token });
    record('Re-presenting a rotated token is rejected (theft response)', reuse.status === 401, `reuse → ${reuse.status}`);
    assert.strictEqual(reuse.status, 401);

    const garbage = await doRefresh({ refreshToken: 'not-a-real-token' });
    const missing = await doRefresh({});
    record('Unknown/missing refresh tokens rejected', garbage.status === 401 && missing.status === 400, `unknown=${garbage.status} missing=${missing.status}`);
    assert.strictEqual(garbage.status, 401);
    assert.strictEqual(missing.status, 400);

    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: d1.refresh_token }),
    });
    const logoutData = await logoutRes.json();
    assert.strictEqual(logoutRes.status, 201);
    assert.strictEqual(logoutData.success, true);

    const afterLogout = await doRefresh({ refreshToken: d1.refresh_token });
    record('Logged-out refresh token stays revoked', afterLogout.status === 401, `post-logout refresh → ${afterLogout.status}`);
    assert.strictEqual(afterLogout.status, 401);
  }

  // 11. Per-account login lockout --------------------------------------------------
  {
    const badLogin = () =>
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'reception@etoile.fr', password: 'wrong-password' }),
      }).then((r) => r.status);

    let statuses = [];
    for (let i = 0; i < 10; i++) statuses.push(await badLogin());
    assert.ok(statuses.every((s) => s === 401), 'first 10 wrong passwords → 401');

    const lockedRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'reception@etoile.fr', password: 'wrong-password' }),
    });
    const lockedBody = await lockedRes.text();
    const locked = lockedRes.status === 429 && lockedBody.toLowerCase().includes('locked');
    record('Account locks after 10 wrong passwords', locked, `11th attempt → ${lockedRes.status}`);
    assert.ok(locked);

    // Cleanup: unlock the desk account directly (test-only backdoor).
    await prisma.staffUser.updateMany({
      where: { email: 'reception@etoile.fr' },
      data: { failedLoginAttempts: 0, loginLockedUntil: null },
    });
    const okLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'reception@etoile.fr', password: 'etoile2026' }),
    });
    record('Unlocked account logs in normally', okLogin.status === 201, `after reset → ${okLogin.status}`);
    assert.strictEqual(okLogin.status, 201);
  }

  // 12. Ops snapshots + payment links ------------------------------------------------
  {
    const noAuthRenewal = await fetch(`${BASE_URL}/ops/renewal-queue`);
    const noAuthConflicts = await fetch(`${BASE_URL}/ops/schedule-conflicts`);
    record(
      'Ops endpoints require staff auth',
      noAuthRenewal.status === 401 && noAuthConflicts.status === 401,
      `renewal=${noAuthRenewal.status} conflicts=${noAuthConflicts.status}`,
    );
    assert.strictEqual(noAuthRenewal.status, 401);
    assert.strictEqual(noAuthConflicts.status, 401);

    const renewalRes = await fetch(`${BASE_URL}/ops/renewal-queue`, {
      headers: { Authorization: `Bearer ${directorToken}` },
    });
    const renewal = await renewalRes.json();
    const renewalOk =
      renewalRes.status === 200 &&
      Array.isArray(renewal.queue) &&
      renewal.queue.every((q) => q.studentId && q.name && q.phone !== undefined && q.reason && q.priority);
    record('Renewal queue returns shaped watchlist', renewalOk, `items=${renewal.queue?.length ?? '?'}`);
    assert.ok(renewalOk);

    const conflictsRes = await fetch(`${BASE_URL}/ops/schedule-conflicts`, {
      headers: { Authorization: `Bearer ${directorToken}` },
    });
    const conflicts = await conflictsRes.json();
    const conflictsOk =
      conflictsRes.status === 200 &&
      typeof conflicts.total === 'number' &&
      Array.isArray(conflicts.conflicts) &&
      conflicts.conflicts.every((c) => (c.type === 'room' || c.type === 'instructor') && c.day && Array.isArray(c.sessionIds));
    record('Schedule conflicts return typed report', conflictsOk, `total=${conflicts.total}`);
    assert.ok(conflictsOk);

    const noAuthPaylink = await fetch(`${BASE_URL}/payments/paylink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 500, provider: 'paymob' }),
    });
    record('Pay-link creation requires staff auth', noAuthPaylink.status === 401, `anonymous → ${noAuthPaylink.status}`);
    assert.strictEqual(noAuthPaylink.status, 401);

    const paylinkRes = await fetch(`${BASE_URL}/payments/paylink`, {
      method: 'POST',
      headers: authHeaders(directorToken),
      body: JSON.stringify({ amount: 500, provider: 'paymob' }),
    });
    const paylink = await paylinkRes.json();
    const paylinkOk = paylinkRes.status === 201 && !!paylink.url && !!paylink.ref && Number(paylink.amount) === 500;
    record('Pay-link created with ref + url', paylinkOk, `status=${paylinkRes.status} ref=${paylink.ref}`);
    assert.ok(paylinkOk);

    const badAmount = await fetch(`${BASE_URL}/payments/paylink`, {
      method: 'POST',
      headers: authHeaders(directorToken),
      body: JSON.stringify({ amount: 0, provider: 'paymob' }),
    });
    const badProvider = await fetch(`${BASE_URL}/payments/paylink`, {
      method: 'POST',
      headers: authHeaders(directorToken),
      body: JSON.stringify({ amount: 500, provider: 'cash' }),
    });
    record('Pay-link validates amount + provider', badAmount.status === 400 && badProvider.status === 400, `zero=${badAmount.status} provider=${badProvider.status}`);
    assert.strictEqual(badAmount.status, 400);
    assert.strictEqual(badProvider.status, 400);

    const statusRes = await fetch(`${BASE_URL}/payments/paylink/${paylink.ref}`);
    const statusData = await statusRes.json();
    record('Pay-link status is publicly readable', statusRes.status === 200 && statusData.status === 'pending', `status=${statusData.status}`);
    assert.strictEqual(statusData.status, 'pending');

    const hook = (body) =>
      fetch(`${BASE_URL}/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const paidRes = await hook({ ref: paylink.ref, status: 'paid', providerRef: 'PB-123' });
    const paidData = await paidRes.json();
    const replayRes = await hook({ ref: paylink.ref, status: 'paid' });
    const replayData = await replayRes.json();
    const unknownHook = await hook({ ref: 'NOPE-000000', status: 'paid' });
    const badHook = await hook({ ref: paylink.ref, status: 'maybe' });
    const webhookOk =
      paidData.status === 'paid' && replayData.status === 'paid' &&
      unknownHook.status === 404 && badHook.status === 400;
    record('Webhook reconciles (idempotent) + validates', webhookOk, `paid=${paidData.status} replay=${replayData.status} unknown=${unknownHook.status} bad=${badHook.status}`);
    assert.ok(webhookOk);
  }

  console.log('\n========================================');
  const passed = results.filter((r) => r.passed).length;
  console.log(`🏁 HARDENING AUDIT: ${passed}/${results.length} passed`);
  console.log('========================================\n');
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}

runAudit().catch(async (err) => {
  console.error('❌ Hardening audit failed:', err);
  try {
    await resetLeo();
  } catch {}
  await prisma.$disconnect();
  process.exit(1);
});
