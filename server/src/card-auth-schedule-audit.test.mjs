import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const BASE_URL = 'http://localhost:3001/api';
const prisma = new PrismaClient();

async function resetTestData() {
  const passwordHash = await argon2.hash('etoile2026', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
  });
  // Reset Lucas Marchand (INS-01)
  await prisma.staffUser.updateMany({
    where: { cardCode: 'INS-01' },
    data: {
      passwordHash,
      isFirstLogin: false,
      otpCode: null,
      otpExpiresAt: null,
    },
  });
  // Reset Leo (ETOILE-892102)
  await prisma.student.updateMany({
    where: { barcode: 'ETOILE-892102' },
    data: {
      passwordHash: null,
      isFirstLogin: true,
      otpCode: null,
      otpExpiresAt: null,
    },
  });
}

async function runAudit() {
  console.log('🩰 Starting Étoile Academy Card Auth & Schedule Verification Audit...\n');
  await resetTestData();
  try {

  // Test 1: Student Card Login with Maya Lindqvist (ETOILE-892101)
  console.log('1. Testing Student Card Login (ETOILE-892101)...');
  const studentLoginRes = await fetch(`${BASE_URL}/auth/card-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardCode: 'ETOILE-892101', password: 'etoile2026' }),
  });
  const studentData = await studentLoginRes.json();
  assert.strictEqual(studentLoginRes.status, 201, `Expected 201, got ${studentLoginRes.status}: ${JSON.stringify(studentData)}`);
  assert.strictEqual(studentData.userType, 'student');
  assert.strictEqual(studentData.student.name, 'Maya Moreau');
  assert.strictEqual(studentData.student.barcode, 'ETOILE-892101');

  assert.ok(studentData.subscription, 'Student must have active subscription');
  assert.ok(studentData.subscription.totalSessions >= 12, 'Subscription totalSessions must be present');
  assert.ok(studentData.subscription.remainingSessions >= 0, 'Subscription remainingSessions must be present');
  assert.ok(studentData.subscription.endDate, 'Subscription expiration date must be present');
  console.log(`   ✅ Student card login success: ${studentData.student.name}, Subscription: ${studentData.subscription.planName}, Quota: ${studentData.subscription.remainingSessions}/${studentData.subscription.totalSessions} sessions, Expires: ${studentData.subscription.endDate}`);

  // Test 2: Instructor Card Login with Lucas Marchand (INS-01)
  console.log('\n2. Testing Instructor Card Login (INS-01)...');
  const instructorLoginRes = await fetch(`${BASE_URL}/auth/card-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardCode: 'INS-01', password: 'etoile2026' }),
  });

  const instructorData = await instructorLoginRes.json();
  assert.strictEqual(instructorLoginRes.status, 201, `Expected 201, got ${instructorLoginRes.status}: ${JSON.stringify(instructorData)}`);
  assert.strictEqual(instructorData.userType, 'instructor');
  assert.strictEqual(instructorData.user.name, 'Lucas Marchand');
  assert.strictEqual(instructorData.user.cardCode, 'INS-01');
  assert.ok(instructorData.access_token, 'Instructor must receive valid access token');
  console.log(`   ✅ Instructor card login success: ${instructorData.user.name} (${instructorData.user.department})`);

  // Test 3: WhatsApp First-Time Login Password Request (Leo Chen - ETOILE-892102)
  console.log('\n3. Testing WhatsApp First-Time Password Request for Leo Chen (ETOILE-892102)...');
  const reqInitRes = await fetch(`${BASE_URL}/auth/request-initial-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardCode: 'ETOILE-892102' }),
  });
  const reqInitData = await reqInitRes.json();
  assert.strictEqual(reqInitRes.status, 201, `Expected 201, got ${reqInitRes.status}`);
  assert.strictEqual(reqInitData.success, true);
  assert.strictEqual(reqInitData.userType, 'student');
  assert.ok(reqInitData.maskedPhone, 'Masked phone number must be returned');
  console.log(`   ✅ Temporary password dispatched to Leo's WhatsApp (${reqInitData.maskedPhone})`);

  // Check OpenWaLog to retrieve the dispatched temp password for automated verification
  const waLogsRes = await fetch(`${BASE_URL}/openwa/messages`, {
    headers: { Authorization: `Bearer ${instructorData.access_token}` },
  });
  const waLogs = await waLogsRes.json();
  const tempPassLog = waLogs.find((l) => l.body && l.body.includes('ETOILE-892102'));
  assert.ok(tempPassLog, 'WhatsApp message log must contain the dispatched password');
  const match = tempPassLog.body.match(/Temporary Password:\s*\*?(ETOILE-\d+)\*?/i);
  assert.ok(match, 'Password pattern ETOILE-XXXX must be in WhatsApp body');
  const tempPassword = match[1];
  console.log(`   ✅ Retrieved dispatched temp password from WhatsApp queue: ${tempPassword}`);


  // Test 4: First-Time Setup: Set New Permanent Password
  console.log('\n4. Testing First-Time Setup & Permanent Password Creation...');
  const setupRes = await fetch(`${BASE_URL}/auth/first-time-setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cardCode: 'ETOILE-892102',
      tempPassword,
      newPassword: 'myNewSecretPass2026',
    }),
  });
  const setupData = await setupRes.json();
  assert.strictEqual(setupRes.status, 201, `Expected 201, got ${setupRes.status}: ${JSON.stringify(setupData)}`);
  assert.strictEqual(setupData.success, true);
  assert.strictEqual(setupData.mustChangePassword, false);
  assert.ok(setupData.access_token, 'Must return active session token');
  console.log(`   ✅ First-time setup complete. New password established for Leo Chen.`);

  // Verify login with new password
  const verifyNewLogin = await fetch(`${BASE_URL}/auth/card-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardCode: 'ETOILE-892102', password: 'myNewSecretPass2026' }),
  });
  assert.strictEqual(verifyNewLogin.status, 201, 'Login with newly created password must succeed');
  console.log(`   ✅ Login with new permanent password verified successfully.`);

  // Test 5: Forgot Password with WhatsApp OTP (INS-01)
  console.log('\n5. Testing Forgot Password with WhatsApp OTP (INS-01)...');
  const forgotOtpRes = await fetch(`${BASE_URL}/auth/forgot-password/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardCode: 'INS-01' }),
  });
  const forgotOtpData = await forgotOtpRes.json();
  assert.strictEqual(forgotOtpRes.status, 201);
  assert.strictEqual(forgotOtpData.success, true);
  assert.ok(forgotOtpData.maskedPhone);
  console.log(`   ✅ 6-Digit OTP dispatched to Instructor WhatsApp (${forgotOtpData.maskedPhone})`);

  // Retrieve OTP from OpenWaLog
  const waLogsRes2 = await fetch(`${BASE_URL}/openwa/messages`, {
    headers: { Authorization: `Bearer ${instructorData.access_token}` },
  });

  const waLogs2 = await waLogsRes2.json();
  const otpLog = waLogs2.find(l => l.body && l.body.includes('password reset security OTP code'));
  assert.ok(otpLog, 'OTP WhatsApp message log must exist');
  const otpMatch = otpLog.body.match(/\b\d{6}\b/);
  assert.ok(otpMatch, '6-digit OTP must be found in message');
  const otpCode = otpMatch[0];
  console.log(`   ✅ Retrieved 6-digit OTP code from WhatsApp queue: ${otpCode}`);

  // Reset password with OTP
  const resetRes = await fetch(`${BASE_URL}/auth/forgot-password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cardCode: 'INS-01',
      otp: otpCode,
      newPassword: 'balletMaster2026',
    }),
  });
  const resetData = await resetRes.json();
  assert.strictEqual(resetRes.status, 201);
  assert.strictEqual(resetData.success, true);
  console.log(`   ✅ Password reset with WhatsApp OTP verified successfully.`);

  // Verify login with newly reset password
  const verifyResetLogin = await fetch(`${BASE_URL}/auth/card-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardCode: 'INS-01', password: 'balletMaster2026' }),
  });
  assert.strictEqual(verifyResetLogin.status, 201);
  console.log(`   ✅ Instructor login with reset password verified successfully.`);

  // Test 6: Student Personalized Schedule & Subscription Details Endpoint
  console.log('\n6. Testing Student Personalized Schedule Endpoint (/api/courses/student/my-schedule/ETOILE-892101)...');
  const stuScheduleRes = await fetch(`${BASE_URL}/courses/student/my-schedule/ETOILE-892101`);
  const stuSchedule = await stuScheduleRes.json();
  assert.strictEqual(stuScheduleRes.status, 200);
  assert.strictEqual(stuSchedule.student.name, 'Maya Moreau');

  assert.ok(stuSchedule.subscription, 'Subscription must be present');
  assert.strictEqual(typeof stuSchedule.subscription.remainingSessions, 'number');
  assert.strictEqual(typeof stuSchedule.subscription.totalSessions, 'number');
  assert.ok(stuSchedule.subscription.endDate, 'Expiration date must be present');
  assert.ok(Array.isArray(stuSchedule.enrolledCourses), 'Enrolled courses must be array');
  assert.ok(Array.isArray(stuSchedule.upcomingSessions), 'Upcoming sessions must be array');
  console.log(`   ✅ Maya's Subscription: ${stuSchedule.subscription.remainingSessions}/${stuSchedule.subscription.totalSessions} sessions left, Expiration Date: ${stuSchedule.subscription.endDate} (${stuSchedule.subscription.daysRemaining} days remaining)`);
  console.log(`   ✅ Maya's Specific Enrolled Courses: ${stuSchedule.enrolledCourses.map(c => c.title).join(', ')}`);
  console.log(`   ✅ Maya's Specific Upcoming Sessions: ${stuSchedule.upcomingSessions.length} session(s) scheduled`);

  // Test 7: Instructor Personalized Schedule Endpoint (/api/courses/instructor/my-schedule/INS-01)
  console.log('\n7. Testing Instructor Personalized Schedule Endpoint (/api/courses/instructor/my-schedule/INS-01)...');
  const insScheduleRes = await fetch(`${BASE_URL}/courses/instructor/my-schedule/INS-01`);
  const insSchedule = await insScheduleRes.json();
  assert.strictEqual(insScheduleRes.status, 200);
  assert.strictEqual(insSchedule.instructor.name, 'Lucas Marchand');
  assert.ok(Array.isArray(insSchedule.assignedCourses), 'Assigned courses must be array');
  assert.ok(Array.isArray(insSchedule.weeklySessions), 'Weekly sessions must be array');
  console.log(`   ✅ Lucas's Assigned Courses (${insSchedule.assignedCourses.length}): ${insSchedule.assignedCourses.map(c => c.title).join(', ')}`);
  console.log(`   ✅ Lucas's Weekly Teaching Sessions: ${insSchedule.weeklySessions.length} session(s)`);
  console.log(`   ✅ Lucas's Total Active Enrolled Students: ${insSchedule.totalStudentsCount} dancers`);

  console.log('\n🎉 ALL CARD AUTH, WHATSAPP PASSWORD, AND PERSONALIZED SCHEDULE AUDIT TESTS PASSED 100%!\n');
  } finally {
    await resetTestData();
    await prisma.$disconnect();
  }
}

runAudit().catch((err) => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
