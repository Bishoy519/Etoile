import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:3001/api';
const prisma = new PrismaClient();

async function runEndToEndLifecycle() {
  console.log('🩰 =========================================================================');
  console.log('🩰 ÉTOILE BALLET ACADEMY — END-TO-END CONSERVATORY LIFECYCLE AUDIT');
  console.log('🩰 =========================================================================\n');

  let leadId = null;
  let studentId = null;
  let studentBarcode = null;
  let familyId = null;
  let journalId = null;
  let directorToken = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Public Admission Inquiry (Lead Submission)
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Public Web Portal Admission Inquiry (Lead Submission) ---');
    const leadPayload = {
      dancerName: 'Camille Dupont',
      age: 14,
      parentName: 'Hélène Dupont',
      parentPhone: '+33 6 55 44 33 22',
      parentEmail: 'helene.dupont@artparis.fr',
      program: 'classical',
      division: 'pre-pro',
      experience: '6 years Vaganova classical pointe training',
      notes: 'Applying for Pre-Professional Conservatory Classical track',
    };

    const leadRes = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadPayload),
    });

    const leadData = await leadRes.json();
    assert.strictEqual(leadRes.status, 201, `Failed to submit lead: ${JSON.stringify(leadData)}`);
    assert.ok(leadData.lead && leadData.lead.id, 'Lead record must be created');
    assert.strictEqual(leadData.lead.dancerName, 'Camille Dupont');
    assert.strictEqual(leadData.lead.stage, 'new_inquiry');
    leadId = leadData.lead.id;
    console.log(`✅ [LEAD_INQUIRY] Lead created successfully: ID=${leadId}, Stage=${leadData.lead.stage}, Dancer=${leadData.lead.dancerName}`);

    // -------------------------------------------------------------------------
    // STEP 2: Staff Authentication & Director RBAC Login
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Staff Authentication & Director RBAC Verification ---');
    const authRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'director@etoile.fr', password: 'etoile2026' }),
    });

    const authData = await authRes.json();
    assert.ok(authRes.status === 200 || authRes.status === 201, `Staff login failed: ${JSON.stringify(authData)}`);
    assert.ok(authData.access_token, 'Director must receive valid JWT Bearer token');
    assert.strictEqual(authData.user.role, 'superadmin');
    assert.strictEqual(authData.user.passwordHash, undefined, 'passwordHash must be stripped');
    directorToken = authData.access_token;
    console.log(`✅ [AUTH_RBAC] Director authenticated with role: ${authData.user.role} (${authData.user.name})`);

    // -------------------------------------------------------------------------
    // STEP 3: Audition Scheduling & Stage Advancement
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Audition Evaluation & Stage Progression ---');
    // Advance to audition_scheduled
    const stageRes1 = await fetch(`${BASE_URL}/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`,
      },
      body: JSON.stringify({ stage: 'audition_scheduled' }),
    });
    assert.strictEqual(stageRes1.status, 200);

    // Advance to audition_passed
    const stageRes2 = await fetch(`${BASE_URL}/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`,
      },
      body: JSON.stringify({ stage: 'audition_passed' }),
    });
    const passedData = await stageRes2.json();
    assert.strictEqual(passedData.stage, 'audition_passed');
    console.log(`✅ [AUDITION_STAGE] Candidate Camille Dupont passed technical audition evaluation (stage: ${passedData.stage})`);

    // -------------------------------------------------------------------------
    // STEP 4: 1-Click Conversion to Enrolled Academy Student & Pass Issuance
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: 1-Click Conversion to Enrolled Academy Student ---');
    const convertRes = await fetch(`${BASE_URL}/leads/${leadId}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`,
      },
      body: JSON.stringify({ planTier: 'elite_16' }),
    });

    const studentData = await convertRes.json();
    assert.strictEqual(convertRes.status, 201, `Lead conversion failed: ${JSON.stringify(studentData)}`);
    assert.ok(studentData.id, 'Student ID must be present');
    assert.ok(studentData.barcode, 'Student barcode must be present');
    assert.match(studentData.barcode, /^ETOILE-\d+$/, 'Barcode must match ETOILE-XXXXXX format');
    studentId = studentData.id;
    studentBarcode = studentData.barcode;
    familyId = studentData.familyId;

    // Verify subscription created
    const sub = await prisma.studentSubscription.findFirst({
      where: { studentId },
    });
    assert.ok(sub, 'Student subscription must be active');
    assert.strictEqual(sub.maxSessions, 16);
    assert.strictEqual(sub.usedSessions, 0);
    assert.strictEqual(Number(sub.price), 480);
    assert.strictEqual(Number(sub.dailyAccrualRate), 16); // 480 / 30 = 16€/day
    console.log(`✅ [STUDENT_ENROLMENT] Lead successfully converted to Student: ID=${studentId}, Barcode=${studentBarcode}, Level=${studentData.level}`);
    console.log(`✅ [SUBSCRIPTION] Issued "Conservatory Classical Elite (16 Sessions)": Price=480€, Quota=0/16, Daily Accrual Rate=16.00€/day`);

    // -------------------------------------------------------------------------
    // STEP 5: Initial IFRS 15 Contract Liability Evaluation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Initial IFRS 15 Contract Liability Evaluation ---');
    const accrualRes = await fetch(
      `${BASE_URL}/accounting/accrual?price=480&totalDays=30&daysInMonth1=0`,
      {
        headers: { Authorization: `Bearer ${directorToken}` },
      },
    );
    const accrualData = await accrualRes.json();
    assert.strictEqual(accrualRes.status, 200);
    assert.strictEqual(accrualData.dailyAccrualRate, 16);
    assert.strictEqual(accrualData.recognizedRevenueMonth1, 0);
    assert.strictEqual(accrualData.deferredRevenueMonth2, 480);
    console.log(`✅ [IFRS15_INITIAL] Contract Liability at Inception: Daily Rate=16€/day, Recognized=0€, Deferred Liability=480€`);

    // -------------------------------------------------------------------------
    // STEP 6: Physical / USB HID Barcode Scanner Kiosk Check-In
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: High-Speed USB HID Barcode Scanner Kiosk Attendance ---');
    const checkInRes = await fetch(`${BASE_URL}/attendance/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`,
      },
      body: JSON.stringify({
        barcode: studentBarcode,
        classTitle: 'Conservatory Classical Pointe & Variations',
        verifiedMethod: 'hid_barcode',
        premiseVerified: true,
        wifiBssid: 'Etoile-Secure-5G [F4:92:BF:11:80:A2]',
      }),
    });

    const checkInData = await checkInRes.json();
    assert.strictEqual(checkInRes.status, 201, `Check-in failed: ${JSON.stringify(checkInData)}`);
    assert.strictEqual(checkInData.success, true);
    assert.strictEqual(checkInData.student.name, 'Camille Dupont');
    assert.strictEqual(checkInData.quotaRemaining, 15);
    console.log(`✅ [ATTENDANCE_KIOSK] USB HID Scan successful: Status=GRANTED, Dancer=${checkInData.student.name}, Quota Updated=15/16 remaining`);

    // -------------------------------------------------------------------------
    // STEP 7: Automated WhatsApp Check-In Receipt Dispatch
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Automated WhatsApp Parent Check-In Receipt Verification ---');
    const waMessagesRes = await fetch(`${BASE_URL}/openwa/messages`, {
      headers: { Authorization: `Bearer ${directorToken}` },
    });
    const waMessages = await waMessagesRes.json();
    assert.strictEqual(waMessagesRes.status, 200);

    const receiptMsg = waMessages.find(
      (m) =>
        (m.recipientPhone === '+33 6 55 44 33 22' || m.to === '+33 6 55 44 33 22') &&
        m.body &&
        m.body.includes('Camille Dupont'),
    );
    assert.ok(receiptMsg, 'WhatsApp receipt message for Camille Dupont must exist in OpenWa message queue');
    assert.strictEqual(receiptMsg.status, 'delivered');
    assert.ok(
      receiptMsg.body.includes('15 / 16') || receiptMsg.body.includes('15/16'),
      'Receipt body must include updated quota remaining (15 / 16)',
    );
    console.log(`✅ [WHATSAPP_RECEIPT] Automated receipt dispatched to parent Hélène Dupont (+33 6 55 44 33 22): Status=${receiptMsg.status}`);

    // -------------------------------------------------------------------------
    // STEP 8: IFRS 15 Daily Accrual Recognition & Double-Entry Journal Entry
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: IFRS 15 Daily Accrual Recognition & Double-Entry Journal Posting ---');
    // Simulate 5 days of elapsed conservatory training:
    // Rd = 480 / 30 = 16€/day. Recognized = 5 * 16 = 80€. Remaining Deferred = 400€.
    const elapsedDays = 5;
    const recognizedRevenue = elapsedDays * 16;
    const remainingLiability = 480 - recognizedRevenue;

    const journalRes = await fetch(`${BASE_URL}/accounting/journal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`,
      },
      body: JSON.stringify({
        memo: `IFRS 15 Daily Accrual (5 Days) - Camille Dupont (Sub 480€ / 30 Days)`,
        totalDebit: recognizedRevenue,
        totalCredit: recognizedRevenue,
        status: 'posted',
        postedBy: 'Director Elena Rostova',
        lines: [
          {
            accountCode: '2100',
            accountName: 'Deferred Tuition Liability (Contract Liability)',
            debit: recognizedRevenue,
            credit: 0,
            description: `Amortize 5 days of deferred subscription liability at 16€/day`,
          },
          {
            accountCode: '4010',
            accountName: 'Earned Conservatory Tuition Revenue',
            debit: 0,
            credit: recognizedRevenue,
            description: `Recognize 5 days earned tuition for Camille Dupont under IFRS 15`,
          },
        ],
      }),
    });

    const journalData = await journalRes.json();
    assert.strictEqual(journalRes.status, 201, `Failed to post journal entry: ${JSON.stringify(journalData)}`);
    assert.strictEqual(Number(journalData.totalDebit), 80);
    assert.strictEqual(Number(journalData.totalCredit), 80);
    assert.strictEqual(journalData.status, 'posted');
    journalId = journalData.id;
    console.log(`✅ [IFRS15_JOURNAL] Journal Voucher posted: Voucher=${journalData.voucherNumber}, Debit=80€, Credit=80€, Status=POSTED`);
    console.log(`   - Debit Account 2100 (Contract Liability Reduction): €${journalData.totalDebit}`);
    console.log(`   - Credit Account 4010 (Earned Tuition Revenue Recognition): €${journalData.totalCredit}`);
    console.log(`   - Remaining Contract Liability on Balance Sheet: €${remainingLiability}`);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n🩰 =========================================================================');
    console.log('🩰 END-TO-END LIFECYCLE AUDIT: 8/8 STEPS SUCCESSFULLY VERIFIED (100%)');
    console.log('🩰 =========================================================================\n');
    console.log('🎉 Full conservatory lifecycle from web inquiry to IFRS 15 revenue entry verified!');

  } finally {
    // -------------------------------------------------------------------------
    // STEP 9: Idempotent Database Teardown & Cleanup
    // -------------------------------------------------------------------------
    console.log('\n🧹 Performing test teardown and cleanup...');
    if (journalId) {
      await prisma.journalEntryLine.deleteMany({ where: { entryId: journalId } }).catch(() => {});
      await prisma.journalEntry.delete({ where: { id: journalId } }).catch(() => {});
    }
    if (studentBarcode) {
      await prisma.attendanceRecord.deleteMany({ where: { barcode: studentBarcode } }).catch(() => {});
      await prisma.openWaLog.deleteMany({ where: { recipientPhone: '+33 6 55 44 33 22' } }).catch(() => {});
    }
    if (studentId) {
      await prisma.studentSubscription.deleteMany({ where: { studentId } }).catch(() => {});
      await prisma.student.delete({ where: { id: studentId } }).catch(() => {});
    }
    if (familyId) {
      const familyStudentCount = await prisma.student.count({ where: { familyId } });
      if (familyStudentCount === 0) {
        await prisma.family.delete({ where: { id: familyId } }).catch(() => {});
      }
    }
    if (leadId) {
      await prisma.admissionLead.delete({ where: { id: leadId } }).catch(() => {});
    }
    await prisma.crmAuditEntry.deleteMany({ where: { actor: 'Hélène Dupont' } }).catch(() => {});
    await prisma.$disconnect();
    console.log('✅ Teardown complete: Database state restored cleanly.\n');
  }
}

runEndToEndLifecycle().catch((err) => {
  console.error('❌ End-to-End Lifecycle Audit Failed:', err);
  process.exit(1);
});
