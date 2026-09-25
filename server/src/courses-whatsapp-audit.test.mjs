import assert from 'node:assert';

const BASE_URL = 'http://localhost:3001/api';

async function runAudit() {
  console.log('🧪 Starting Courses, Sessions, Pre-Session Reminders & OpenWA Audit...\n');

  // 1. Authenticate as Superadmin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'director@etoile.fr',
      password: 'etoile2026',
    }),
  });
  assert(loginRes.status === 200 || loginRes.status === 201, 'Superadmin login failed');
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('✅ [AUTH] Superadmin Authenticated successfully');

  // 2. Fetch Courses
  const coursesRes = await fetch(`${BASE_URL}/courses`);
  assert.strictEqual(coursesRes.status, 200, 'Failed to fetch courses');
  const courses = await coursesRes.json();
  assert(Array.isArray(courses) && courses.length >= 1, 'Expected at least 1 course in DB');
  console.log(`✅ [COURSES] Fetched ${courses.length} courses from DB`);

  // 3. Fetch Sessions
  const sessionsRes = await fetch(`${BASE_URL}/courses/sessions`);
  assert.strictEqual(sessionsRes.status, 200, 'Failed to fetch sessions');
  const sessions = await sessionsRes.json();
  assert(Array.isArray(sessions) && sessions.length >= 1, 'Expected at least 1 session in DB');
  console.log(`✅ [SESSIONS] Fetched ${sessions.length} sessions from DB`);

  // 4. Fetch WhatsApp Reminder Config
  const reminderConfigRes = await fetch(`${BASE_URL}/courses/reminders/config`);
  assert.strictEqual(reminderConfigRes.status, 200, 'Failed to fetch reminder config');
  const reminderConfig = await reminderConfigRes.json();
  assert(reminderConfig && typeof reminderConfig.sendMinutesBefore === 'number');
  console.log(`✅ [REMINDERS] Reminder config active: ${reminderConfig.sendMinutesBefore}m before session`);

  // 5. Update WhatsApp Reminder Config (RBAC Guarded)
  const updateRemRes = await fetch(`${BASE_URL}/courses/reminders/config`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      sendMinutesBefore: 45,
    }),
  });
  assert.strictEqual(updateRemRes.status, 200, 'Failed to update reminder config');
  const updatedRem = await updateRemRes.json();
  assert.strictEqual(updatedRem.sendMinutesBefore, 45);
  console.log('✅ [REMINDERS] Dynamic reminder window updated to 45m before session');

  // 6. Test WhatsApp Gateway Status & QR Generation
  const waStatRes = await fetch(`${BASE_URL}/openwa/status`, { headers: authHeaders });
  assert.strictEqual(waStatRes.status, 200, 'Failed to fetch WhatsApp gateway status');
  const waStat = await waStatRes.json();
  console.log(`✅ [OPENWA] WhatsApp Status: ${waStat.status}, Mode: ${waStat.mode}`);

  const qrConnectRes = await fetch(`${BASE_URL}/openwa/connect`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ mode: 'builtin_qr' }),
  });
  assert.strictEqual(qrConnectRes.status, 201, 'Failed to connect via builtin QR');
  const qrConnect = await qrConnectRes.json();
  assert(qrConnect.qrCodeData && qrConnect.qrCodeData.startsWith('data:image/png;base64,'));
  console.log('✅ [OPENWA] Live dynamic QR code generated for mobile pairing');

  // 7. Confirm Pairing
  const pairRes = await fetch(`${BASE_URL}/openwa/pair-confirm`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      phoneNumber: '+33699887766',
      pushName: 'Étoile Official Desk',
    }),
  });
  assert.strictEqual(pairRes.status, 201);
  const pairedData = await pairRes.json();
  assert.strictEqual(pairedData.status, 'connected');
  assert.strictEqual(pairedData.phoneNumber, '+33699887766');
  console.log('✅ [OPENWA] Paired WhatsApp device: +33699887766 (Étoile Official Desk)');

  // 8. Test Dispatching Pre-Session Reminder for session 1
  const testSession = sessions[0];
  const remindRes = await fetch(`${BASE_URL}/courses/sessions/${testSession.id}/send-reminder`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.strictEqual(remindRes.status, 201);
  const remindResult = await remindRes.json();
  assert.strictEqual(remindResult.success, true);
  assert(typeof remindResult.messagesDispatched === 'number');
  console.log(`✅ [REMINDERS] Pre-session reminder dispatched: ${remindResult.messagesDispatched} messages for "${testSession.title}"`);

  // 9. Update Gateway Configuration
  const gatewayUpdateRes = await fetch(`${BASE_URL}/openwa/gateway-config`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      gatewayUrl: 'http://localhost:21465',
      sessionName: 'etoile-conservatory-primary',
    }),
  });
  assert.strictEqual(gatewayUpdateRes.status, 200);
  console.log('✅ [OPENWA] Open-Source Gateway configuration updated successfully');

  // 10. Test Course Creation CRUD
  const newCourseRes = await fetch(`${BASE_URL}/courses`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      code: `TEST-${Date.now().toString().slice(-4)}`,
      title: 'Masterclass Pas de Deux Virtuoso',
      titleAr: 'ماستركلاس الرقص الثنائي الاستعراضي',
      program: 'classical',
      level: 'Advanced Masterclass',
      capacity: 12,
      studioRoom: 'Studio Opéra Garnier',
      dayOfWeek: 'Saturday',
      startTime: '11:00',
      endTime: '13:00',
    }),
  });
  assert.strictEqual(newCourseRes.status, 201);
  const newCourse = await newCourseRes.json();
  console.log(`✅ [COURSES_CRUD] Course "${newCourse.title}" created with ID ${newCourse.id}`);

  // 11. Schedule Session for New Course
  const newSessionRes = await fetch(`${BASE_URL}/courses/${newCourse.id}/sessions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Pas de Deux Virtuoso - Act 1 Adagio',
      sessionDate: '2026-09-20',
      startTime: '11:00',
      endTime: '13:00',
      studioRoom: 'Studio Opéra Garnier',
    }),
  });
  assert.strictEqual(newSessionRes.status, 201);
  const newSession = await newSessionRes.json();
  console.log(`✅ [SESSIONS_CRUD] Scheduled session "${newSession.title}" for course ${newCourse.code}`);

  // 12. Delete Test Course (clean up)
  const delCourseRes = await fetch(`${BASE_URL}/courses/${newCourse.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(delCourseRes.status, 200);
  console.log('✅ [COURSES_CRUD] Test course deleted cleanly');

  console.log('\n========================================');
  console.log('🏁 ALL 12 AUDIT CRITERIA PASSED 100%');
  console.log('========================================\n');
}

runAudit().catch((err) => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
