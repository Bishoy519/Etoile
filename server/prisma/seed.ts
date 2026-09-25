import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🩰 Seeding Étoile Ballet Academy PostgreSQL database...');

  // 1. Seed Staff Users with secure Argon2id password hashes
  const passwordHash = await argon2.hash('etoile2026', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
  }); // Standard initial password

  const staffMembers = [
    {
      id: 'STAFF-01',
      name: 'Madame Elena Rostova',
      nameAr: 'مدام إيلينا روستوفا',
      email: 'director@etoile.fr',
      cardCode: 'DIR-01',
      phone: '+33 6 42 19 88 00',
      role: 'superadmin',
      department: 'Artistic Direction',
      departmentAr: 'الإدارة الفنية العليا',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      passwordHash,
      isFirstLogin: false,
      shiftActive: true,
    },
    {
      id: 'STAFF-02',
      name: 'Julian Moreau',
      nameAr: 'جوليان مورو',
      email: 'julian@etoile.fr',
      cardCode: 'OWN-01',
      phone: '+33 6 42 19 88 02',
      role: 'owner',
      department: 'Executive Board',
      departmentAr: 'مجلس الإدارة التنفيذي',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      passwordHash,
      isFirstLogin: false,
      shiftActive: true,
    },
    {
      id: 'STAFF-03',
      name: 'Chloé Laurent',
      nameAr: 'كلوي لوران',
      email: 'reception@etoile.fr',
      cardCode: 'REC-01',
      phone: '+33 6 42 19 88 03',
      role: 'receptionist',
      department: 'Front-Desk & Admissions',
      departmentAr: 'الاستقبال وشؤون القبول',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      passwordHash,
      isFirstLogin: false,
      shiftActive: true,
    },
    {
      id: 'STAFF-04',
      name: 'Lucas Marchand',
      nameAr: 'لوكاس مارشان',
      email: 'lucas@etoile.fr',
      cardCode: 'INS-01',
      phone: '+33 6 42 19 88 04',
      role: 'instructor',
      department: 'Contemporary Pedagogy',
      departmentAr: 'هيئة تدريس الرقص المعاصر',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      passwordHash,
      isFirstLogin: false,
      shiftActive: false,
    },
  ];

  for (const staff of staffMembers) {
    await prisma.staffUser.upsert({
      where: { email: staff.email },
      update: staff,
      create: staff,
    });
  }
  console.log('✅ Staff users seeded');

  // 2. Subscription Plans
  const plans = [
    {
      id: 'PLAN-PRE-PRO',
      name: 'Conservatory Classical Elite (16 Classes)',
      nameAr: 'كونسرفتوار الباليه الكلاسيكي النخبة (16 حصة)',
      program: 'classical',
      maxSessions: 16,
      durationDays: 30,
      price: 480.0,
      description: '16 conservatory level pointe & classical sessions per 30-day cycle.',
    },
    {
      id: 'PLAN-CONTEMP',
      name: 'Contemporary Intensive Pro (20 Classes)',
      nameAr: 'الرقص المعاصر المكثف للمحترفين (20 حصة)',
      program: 'contemporary',
      maxSessions: 20,
      durationDays: 30,
      price: 520.0,
      description: '20 contemporary choreography & floorwork classes.',
    },
    {
      id: 'PLAN-YOUTH',
      name: 'Youth Foundation Academy (8 Classes)',
      nameAr: 'أكاديمية تأسيس الناشئين (8 حصص)',
      program: 'youth',
      maxSessions: 8,
      durationDays: 30,
      price: 260.0,
      description: '8 youth development sessions for beginner ballerinas.',
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }
  console.log('✅ Subscription plans seeded');

  // 3. Families & Students
  const families = [
    {
      id: 'FAM-01',
      parentName: 'Éléonore Moreau',
      parentPhone: '+33 6 42 19 88 01',
      parentEmail: 'eleonore.moreau@artparis.fr',
    },
    {
      id: 'FAM-02',
      parentName: 'Harrison Vance',
      parentPhone: '+1 (555) 432-8819',
      parentEmail: 'harrison@vance-holdings.com',
    },
    {
      id: 'FAM-03',
      parentName: 'Tariq Al-Mansoor',
      parentPhone: '+971 50 123 4567',
      parentEmail: 'tariq@almansoor.ae',
    },
  ];

  for (const f of families) {
    await prisma.family.upsert({
      where: { id: f.id },
      update: f,
      create: f,
    });
  }
  console.log('✅ Families seeded');

  const students = [
    {
      id: 'STU-001',
      name: 'Maya Moreau',
      nameAr: 'مايا مورو',
      barcode: 'ETOILE-892101',
      photoUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=400&q=80',
      familyId: 'FAM-01',
      age: 16,
      program: 'classical',
      level: 'Pre-Professional Level IV',
      walletBalance: 45.0,
      maxNegativeDebt: 150.0,
      parentName: 'Éléonore Moreau',
      parentPhone: '+33 6 42 19 88 01',
      parentEmail: 'eleonore.moreau@artparis.fr',
      subscription: {
        planId: 'PLAN-PRE-PRO',
        planName: 'Conservatory Classical Elite (16 Sessions)',
        planNameAr: 'كونسرفتوار الباليه الكلاسيكي النخبة (16 حصة)',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-10-15'),
        maxSessions: 16,
        usedSessions: 14,
        price: 480.0,
        dailyAccrualRate: 16.0,
        status: 'active',
      },
    },
    {
      id: 'STU-002',
      name: 'Leo Moreau',
      nameAr: 'ليو مورو',
      barcode: 'ETOILE-892102',
      photoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=400&q=80',
      familyId: 'FAM-01',
      age: 9,
      program: 'youth',
      level: 'Youth Division Level II',
      walletBalance: -65.0,
      maxNegativeDebt: 120.0,
      parentName: 'Éléonore Moreau',
      parentPhone: '+33 6 42 19 88 01',
      parentEmail: 'eleonore.moreau@artparis.fr',
      subscription: {
        planId: 'PLAN-YOUTH',
        planName: 'Youth Foundation Academy (8 Sessions)',
        planNameAr: 'أكاديمية تأسيس الناشئين (8 حصص)',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-10-15'),
        maxSessions: 8,
        usedSessions: 4,
        price: 260.0,
        dailyAccrualRate: 8.66,
        status: 'active',
      },
    },
    {
      id: 'STU-003',
      name: 'Clara Vance',
      nameAr: 'كلارا فانس',
      barcode: 'ETOILE-774109',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      familyId: 'FAM-02',
      age: 18,
      program: 'contemporary',
      level: 'Contemporary Company Soloist',
      walletBalance: 120.0,
      maxNegativeDebt: 200.0,
      parentName: 'Harrison Vance',
      parentPhone: '+1 (555) 432-8819',
      parentEmail: 'harrison@vance-holdings.com',
      subscription: {
        planId: 'PLAN-CONTEMP',
        planName: 'Contemporary Intensive Pro (20 Sessions)',
        planNameAr: 'الرقص المعاصر المكثف للمحترفين (20 حصة)',
        startDate: new Date('2026-07-25'),
        endDate: new Date('2026-08-24'),
        maxSessions: 20,
        usedSessions: 18,
        price: 520.0,
        dailyAccrualRate: 17.33,
        status: 'expired_date',
      },
    },
    {
      id: 'STU-004',
      name: 'Amira Al-Mansoor',
      nameAr: 'أميرة المنصور',
      barcode: 'ETOILE-653281',
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      familyId: 'FAM-03',
      age: 14,
      program: 'classical',
      level: 'Junior Conservatory Level III',
      walletBalance: -110.0,
      maxNegativeDebt: 150.0,
      parentName: 'Tariq Al-Mansoor',
      parentPhone: '+971 50 123 4567',
      parentEmail: 'tariq@almansoor.ae',
      subscription: {
        planId: 'PLAN-PRE-PRO',
        planName: 'Junior Classical Mastery (12 Sessions)',
        planNameAr: 'إتقان الباليه للناشئين (12 حصة)',
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-09-09'),
        maxSessions: 12,
        usedSessions: 12,
        price: 360.0,
        dailyAccrualRate: 12.0,
        status: 'expired_quota',
      },
    },
  ];

  for (const s of students) {
    const { subscription, ...studentData } = s;
    const studentWithAuth = {
      ...studentData,
      passwordHash: passwordHash,
      isFirstLogin: studentData.id === 'STU-002',
    };
    // Seed birthdays spread through the year (one ~10 days out for upcoming celebrations).
    const offsets: Record<string, number> = { 'STU-001': 10, 'STU-002': 80, 'STU-003': 200, 'STU-004': 300 };
    if (offsets[studentData.id] !== undefined && !(studentData as Record<string, unknown>).birthDate) {
      const d = new Date();
      d.setDate(d.getDate() + offsets[studentData.id]);
      d.setFullYear(d.getFullYear() - (studentData as { age: number }).age);
      (studentWithAuth as Record<string, unknown>).birthDate = d;
    }
    await prisma.student.upsert({
      where: { id: studentData.id },
      update: studentWithAuth,
      create: studentWithAuth,
    });

    // Seed subscription
    await prisma.studentSubscription.deleteMany({
      where: { studentId: studentData.id },
    });
    await prisma.studentSubscription.create({
      data: {
        studentId: studentData.id,
        ...subscription,
      },
    });
  }
  console.log('✅ Students & subscriptions seeded');

  // 4. Seed Attendance Records
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceRecord.createMany({
    data: [
      {
        studentId: 'STU-001',
        studentName: 'Maya Moreau',
        barcode: 'ETOILE-892101',
        timestamp: new Date(),
        classTitle: 'Conservatory Pointe & Variations',
        verifiedMethod: 'hid_barcode',
        premiseVerified: true,
        wifiBssid: 'Etoile-Secure-5G [F4:92:BF:11:80:A2]',
        status: 'granted',
        quotaRemaining: 2,
      },
      {
        studentId: 'STU-002',
        studentName: 'Leo Moreau',
        barcode: 'ETOILE-892102',
        timestamp: new Date(Date.now() - 3600000),
        classTitle: 'Youth Division Allegro',
        verifiedMethod: 'qr_camera',
        premiseVerified: true,
        wifiBssid: 'Etoile-Secure-5G [F4:92:BF:11:80:A2]',
        status: 'granted',
        quotaRemaining: 4,
      },
    ],
  });
  console.log('✅ Attendance records seeded');

  // 5. Seed Boutique Products & Sized Variants
  const products = [
    {
      id: 'PROD-01',
      title: 'Grishko 2007 Pro Pointe Shoes',
      titleAr: 'حذاء باليه غريشكو 2007 الاحترافي بوانت',
      category: 'pointe_shoes',
      price: 115.0,
      sku: 'GRISH-2007-PRO',
      imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80',
      variants: [
        { size: '36 XXX', stock: 12 },
        { size: '37 XXX', stock: 8 },
        { size: '38 XXX', stock: 15 },
        { size: '39 XXX', stock: 5 },
      ],
    },
    {
      id: 'PROD-02',
      title: 'Étoile Stage Gold Velvet Leotard',
      titleAr: 'مايوه مخملي مذهب خاص بأكاديمية إيتوال',
      category: 'leotards',
      price: 68.0,
      sku: 'ETO-LEO-GOLD',
      imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=500&q=80',
      variants: [
        { size: 'XS', stock: 6 },
        { size: 'S', stock: 14 },
        { size: 'M', stock: 18 },
        { size: 'L', stock: 9 },
      ],
    },
    {
      id: 'PROD-03',
      title: 'Capezio Ultra-Soft Convertible Tights',
      titleAr: 'كولون كابيزيو الفاخر القابل للتحويل',
      category: 'tights',
      price: 24.0,
      sku: 'CAP-TIGHTS-BP',
      imageUrl: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=500&q=80',
      variants: [
        { size: 'Child M', stock: 25 },
        { size: 'Adult S/M', stock: 40 },
        { size: 'Adult L/XL', stock: 30 },
      ],
    },
    {
      id: 'PROD-04',
      title: 'Bloch Warm-Up Booties (Gold Edition)',
      titleAr: 'حذاء إحماء بلوتش الشتوي المذهب',
      category: 'accessories',
      price: 52.0,
      sku: 'BLOCH-BOOT-GD',
      imageUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=500&q=80',
      variants: [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 14 },
        { size: 'L', stock: 7 },
      ],
    },
  ];

  for (const prod of products) {
    const { variants, ...prodData } = prod;
    await prisma.product.upsert({
      where: { id: prodData.id },
      update: prodData,
      create: prodData,
    });

    await prisma.productVariant.deleteMany({
      where: { productId: prodData.id },
    });
    for (const v of variants) {
      await prisma.productVariant.create({
        data: {
          productId: prodData.id,
          size: v.size,
          stock: v.stock,
        },
      });
    }
  }
  console.log('✅ Products & variants seeded');

  // 6. Seed Admission Leads
  const leads = [
    {
      id: 'LEAD-001',
      dancerName: 'Camille Duprès',
      age: 12,
      parentName: 'Marie Duprès',
      parentPhone: '+33 6 12 34 56 78',
      parentEmail: 'marie.dupres@paris.fr',
      program: 'classical',
      division: 'junior',
      experience: '4 years Vaganova training in Lyon',
      stage: 'audition_scheduled',
      notes: 'Audition booked for Saturday 10:00 AM Studio Opéra',
    },
    {
      id: 'LEAD-002',
      dancerName: 'Zainab Al-Fassi',
      age: 15,
      parentName: 'Nasser Al-Fassi',
      parentPhone: '+971 52 987 6543',
      parentEmail: 'nasser@alfassi.ae',
      program: 'contemporary',
      division: 'pre-pro',
      experience: 'Gaga intensive workshops in Berlin',
      stage: 'new_inquiry',
      notes: 'Submitted via academy website landing page',
    },
  ];

  for (const lead of leads) {
    await prisma.admissionLead.upsert({
      where: { id: lead.id },
      update: lead,
      create: lead,
    });
  }
  console.log('✅ Admission leads seeded');

  // 7. Seed Student Notes & Evaluations
  await prisma.studentNote.deleteMany();
  await prisma.studentNote.createMany({
    data: [
      {
        studentId: 'STU-001',
        author: 'Elena Rostova',
        authorRole: 'Artistic Director',
        text: 'Exceptional en pointe elevation. Selected for Odette variations audition in Spring season.',
        category: 'performance',
      },
      {
        studentId: 'STU-002',
        author: 'Lucas Marchand',
        authorRole: 'Instructor',
        text: 'Needs calf stretch conditioning before allegro classes. Good musical awareness.',
        category: 'medical',
      },
    ],
  });

  await prisma.skillEvaluation.deleteMany();
  await prisma.skillEvaluation.createMany({
    data: [
      {
        studentId: 'STU-001',
        evaluator: 'Elena Rostova',
        barre: 9.6,
        center: 9.3,
        allegro: 9.0,
        musicality: 9.8,
        notes: 'Stage-ready poise. Ready for solo variations.',
      },
    ],
  });
  console.log('✅ Notes and evaluations seeded');

  // 8. Seed Portal Content Store
  const portalContentFilePath = path.resolve(__dirname, '../data/portal-content.json');
  let portalJson = '{}';
  if (fs.existsSync(portalContentFilePath)) {
    portalJson = fs.readFileSync(portalContentFilePath, 'utf8');
  }

  await prisma.portalContentStore.upsert({
    where: { id: 'portal-root' },
    update: { contentJson: portalJson },
    create: { id: 'portal-root', contentJson: portalJson },
  });
  console.log('✅ Portal CMS content seeded');

  // 9. Seed Courses & Schedules
  const course1 = await prisma.course.upsert({
    where: { code: 'BAL-CL-101' },
    update: {},
    create: {
      id: 'CRS-CLASS-01',
      code: 'BAL-CL-101',
      title: 'Conservatory Classical Pointe & Variations',
      titleAr: 'كونسرفتوار الباليه الكلاسيكي والبوانت',
      description: 'Mastery of classical pointe technique, partnering, and Petipa grand variations.',
      descriptionAr: 'تدريب احترافي متقدم على تكنيك البوانت والرقص الثنائي وتأدية أدوار سولو كلاسيكية.',
      program: 'classical',
      level: 'pre-pro',
      capacity: 15,
      instructorId: 'STAFF-01', // Elena Rostova
      dayOfWeek: 'Monday, Wednesday, Friday',
      startTime: '16:00',
      endTime: '17:30',
      studioRoom: 'Grand Studio Petipa',
      active: true,
    },
  });

  const course2 = await prisma.course.upsert({
    where: { code: 'BAL-CT-201' },
    update: {},
    create: {
      id: 'CRS-CONTEMP-02',
      code: 'BAL-CT-201',
      title: 'Contemporary Gaga & Architectural Floorwork',
      titleAr: 'الحركة المعاصرة وتقنيات الأرض وأسلوب غاغا',
      description: 'Fluid neoclassical floorwork, creative improvisation, and Gaga movement vocabulary.',
      descriptionAr: 'تطوير الانسيابية والارتجال الحركي المعاصر واستكشاف المرونة العضوية للجسد.',
      program: 'contemporary',
      level: 'conservatory',
      capacity: 18,
      instructorId: 'STAFF-04', // Lucas Marchand
      dayOfWeek: 'Tuesday, Thursday',
      startTime: '17:00',
      endTime: '18:30',
      studioRoom: 'Studio Pavlova',
      active: true,
    },
  });

  const course3 = await prisma.course.upsert({
    where: { code: 'BAL-YT-001' },
    update: {},
    create: {
      id: 'CRS-YOUTH-03',
      code: 'BAL-YT-001',
      title: 'Youth Allegro & Classical Foundations',
      titleAr: 'تأسيس باليه الناشئين والإيقاع المسرحي',
      description: 'Safe anatomical turnout, creative musicality, and foundational allegro steps for young dancers.',
      descriptionAr: 'غرس أسس الرشاقة والانضباط والتوافق العضلي السليم للراقصين الصغار بروح مرحة.',
      program: 'youth',
      level: 'beginner',
      capacity: 12,
      instructorId: 'STAFF-01', // Elena Rostova
      dayOfWeek: 'Saturday, Sunday',
      startTime: '10:00',
      endTime: '11:30',
      studioRoom: 'Studio Nijinsky',
      active: true,
    },
  });
  console.log('✅ Courses seeded');

  // 10. Enrollments
  await prisma.courseEnrollment.deleteMany({});
  await prisma.courseEnrollment.createMany({
    data: [
      { courseId: course1.id, studentId: 'STU-001' }, // Maya Moreau
      { courseId: course1.id, studentId: 'STU-002' }, // Clara Vance
      { courseId: course2.id, studentId: 'STU-002' }, // Clara Vance
      { courseId: course3.id, studentId: 'STU-003' }, // Amira Al-Mansoor
    ],
  });
  console.log('✅ Course enrollments seeded');

  // 11. Scheduled Sessions (for current week)
  await prisma.courseSession.deleteMany({});
  const now = new Date();
  
  // Session today in 2 hours
  const sessionToday = new Date(now);
  sessionToday.setHours(now.getHours() + 2, 0, 0, 0);

  // Tomorrow
  const sessionTomorrow = new Date(now);
  sessionTomorrow.setDate(now.getDate() + 1);
  sessionTomorrow.setHours(17, 0, 0, 0);

  // In 3 days
  const sessionDay3 = new Date(now);
  sessionDay3.setDate(now.getDate() + 3);
  sessionDay3.setHours(10, 0, 0, 0);

  // In 5 days
  const sessionDay5 = new Date(now);
  sessionDay5.setDate(now.getDate() + 5);
  sessionDay5.setHours(16, 0, 0, 0);

  await prisma.courseSession.createMany({
    data: [
      {
        courseId: course1.id,
        title: 'Swan Lake Act II Grand Adagio Repertoire',
        sessionDate: sessionToday,
        startTime: '16:00',
        endTime: '17:30',
        studioRoom: 'Grand Studio Petipa',
        instructorId: 'STAFF-01',
        status: 'scheduled',
        reminderSent: false,
        notes: 'Bring pointe shoes and tutu practice skirt.',
      },
      {
        courseId: course2.id,
        title: 'Contemporary Kinetic Floor Transition & Gaga',
        sessionDate: sessionTomorrow,
        startTime: '17:00',
        endTime: '18:30',
        studioRoom: 'Studio Pavlova',
        instructorId: 'STAFF-04',
        status: 'scheduled',
        reminderSent: false,
        notes: 'Barefoot contemporary work.',
      },
      {
        courseId: course3.id,
        title: 'Nutcracker Suite March & Little Swans',
        sessionDate: sessionDay3,
        startTime: '10:00',
        endTime: '11:30',
        studioRoom: 'Studio Nijinsky',
        instructorId: 'STAFF-01',
        status: 'scheduled',
        reminderSent: false,
        notes: 'Pink leotard and hair in high classical bun.',
      },
      {
        courseId: course1.id,
        title: 'Classical Pointe Center & Pirouette Conditioning',
        sessionDate: sessionDay5,
        startTime: '16:00',
        endTime: '17:30',
        studioRoom: 'Grand Studio Petipa',
        instructorId: 'STAFF-01',
        status: 'scheduled',
        reminderSent: false,
      },
    ],
  });
  console.log('✅ Course sessions seeded');

  // 12. WhatsApp Reminder & Gateway Config
  await prisma.whatsAppReminderConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      enabled: true,
      sendMinutesBefore: 60,
      studentTemplateEn: 'Bonjour {studentName}! Reminder for your upcoming {courseTitle} ballet class today at {time} in {studio} with {instructorName}. Please arrive 10 mins early.',
      studentTemplateAr: 'مرحباً {studentName}! نذكركم بموعد حصة {courseTitle} اليوم الساعة {time} في قاعة {studio} مع المدرب/ة {instructorName}. يرجى الحضور قبل الموعد بـ 10 دقائق.',
      instructorTemplateEn: 'Bonjour {instructorName}! You have a scheduled {courseTitle} session today at {time} in {studio}. Enrolled dancers: {enrolledCount}.',
      instructorTemplateAr: 'تحية طيبة {instructorName}! نذكركم بجدول حصتكم التدريبية {courseTitle} اليوم الساعة {time} في قاعة {studio}. عدد الطلاب المسجلين: {enrolledCount}.',
      autoCron: true,
    },
  });

  await prisma.whatsAppGatewayConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      mode: 'builtin_qr',
      gatewayUrl: 'http://localhost:21465',
      apiKey: 'etoile_secret_wa_token',
      sessionName: 'etoile_session',
      status: 'connected',
      phoneNumber: '+33 6 89 20 44 11',
      pushName: 'Étoile Ballet Academy Official',
      lastActive: new Date(),
    },
  });
  console.log('✅ WhatsApp reminder & gateway configuration seeded');

  // 13. Branches + Academic years (multi-site foundation, additive — safe to re-run)
  try {
    const branch = (prisma as unknown as { branch?: { upsert: (a: unknown) => Promise<unknown> } }).branch;
    if (branch) {
      await branch.upsert({
        where: { code: 'ZAM' },
        update: {},
        create: { code: 'ZAM', name: 'Zamalek — Studio Opéra', nameAr: 'الزمالك', city: 'Cairo', timezone: 'Africa/Cairo', active: true },
      } as never);
      await branch.upsert({
        where: { code: 'NCAIRO' },
        update: {},
        create: { code: 'NCAIRO', name: 'New Cairo — Studio Pavlova', nameAr: 'التجمع', city: 'Cairo', timezone: 'Africa/Cairo', active: true },
      } as never);
      console.log('✅ Branches seeded');
    }
    const ay = (prisma as unknown as { academicYear?: { upsert: (a: unknown) => Promise<unknown> } }).academicYear;
    if (ay) {
      const y = new Date().getFullYear();
      await ay.upsert({
        where: { label: `${y}-${y + 1}` },
        update: { current: true },
        create: { label: `${y}-${y + 1}`, startDate: new Date(`${y}-09-01`), endDate: new Date(`${y + 1}-08-31`), current: true },
      } as never);
      console.log('✅ Academic year seeded');
    }
  } catch (e) {
    console.log('ℹ️ Branches/academic-year skipped (run prisma generate + db push first):', (e as Error).message?.slice(0, 120));
  }

  // 14. Blog seed (additive, idempotent via slug upsert)
  try {
    const blog = (prisma as unknown as { blogPost?: { upsert: (a: unknown) => Promise<unknown> } }).blogPost;
    if (blog) {
      const seeds = [
        {
          slug: 'pointe-shoe-fitting-guide',
          title: 'Masterclass: Pointe Shoe Fitting & Foot Articulation',
          titleAr: 'ماستركلاس: قياس حذاء البوانت والتحكم بمشط القدم',
          excerpt: 'Essential fitting principles, shank flexibility analysis, and pre-pointe foot articulation drills with Étoile principal coach.',
          excerptAr: 'المبادئ الأساسية لقياس حذاء البوانت، واختبار مرونة النعل، وتمارين مشط القدم المتقدمة مع كبار مدربي إتوال.',
          content: '## The Architecture of Pointe Shoes\n\nFitting a pointe shoe is both an anatomical science and an art form. At the Étoile Conservatory, every dancer undergoes an individual biomechanical assessment before stepping onto pointe.\n\n### 1. The Anatomy of the Box & Shank\nThe box must support the metatarsals without pinching the hallux. A shank that is too stiff forces the dancer back off the platform, while a shank that is too pliable can cause hyperextension and tendinopathy.\n\n### 2. Daily Maintenance & Longevity\n- **Air Dry Thoroughly**: Never store satin shoes in plastic bags. Moisture breaks down traditional paste.\n- **Rotation**: Dancers training more than 10 hours weekly must rotate at least two pairs.\n- **Darning & Ribbon Placement**: Ensure ribbon tension is balanced to protect the Achilles tendon.\n\nWatch our complete video masterclass below to see foot strengthening drills and proper ribbon sewing techniques.',
          contentAr: '## هندسة حذاء البوانت وقواعد القياس السليم\n\nقياس حذاء البوانت هو مزيج دقيق بين علم التشريح وفن الباليه الكلاسيكي. في أكاديمية إتوال، تخضع كل راقصة لفحص بيوميكانيكي شامل قبل الوقوف على رؤوس الأصابع.\n\n### 1. أجزاء الحذاء وصندوق التوازن\nيجب أن يوفر صندوق الحذاء دعماً مثالياً لمشط القدم بدون الضغط الزائد على الأصابع. النعل شديد الصلابة يعيق الوصول إلى قمة المنصة، بينما النعل الرخو قد يسبب إجهاداً لأوتار الكاحل.\n\n### 2. العناية اليومية بالحذاء\n- **التهوية الكاملة**: تجنبي وضع أحذية الستان في أكياس مغلقة. الرطوبة تضعف الغراء التقليدي.\n- **التبديل المستمر**: يُنصح بالتبديل بين زوجين من الأحذية عند التدريب المكثف.\n- **تثبيت الأشرطة**: ضبط شد الأشرطة بدقة لحماية وتر العرقوب.\n\nشاهدي الماستركلاس المصور المرفق لمتابعة تمارين التقوية وطرق ربط الأشرطة الاحترافية.',
          coverImageUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=80',
          videoUrl: 'https://www.youtube.com/watch?v=GMcMLenO_Fw',
          videoEmbedCode: '<iframe src="https://www.youtube-nocookie.com/embed/GMcMLenO_Fw" title="How to Get Pointe Shoes Fitted" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
          galleryImages: [
            'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1516475429286-465d815a0df7?auto=format&fit=crop&w=900&q=80',
          ],
          authorName: 'Mme. Giselle Fontaine',
          authorNameAr: 'أ. جيزيل فونتين',
          category: 'training',
          tags: ['pointe', 'masterclass', 'technique', 'training'],
          featured: true,
          readingMinutes: 6,
        },
        {
          slug: 'audition-prep-checklist',
          title: 'Audition Masterclass: Artistry, Musicality & Placement',
          titleAr: 'ماستركلاس اختبارات القبول: النقاء الحركي والإحساس الموسيقي',
          excerpt: 'What international jury evaluators look for during conservatory audition rounds and barre assessment.',
          excerptAr: 'أهم معايير لجان التقييم الدولية في اختبارات القبول وتدريبات البار الكلاسيكية.',
          content: '## Excelling at Conservatory Auditions\n\nAn audition is not merely a test of technique; it is a manifestation of artistry, posture, and poise. Evaluators observe how a dancer breathes, transitions between positions, and absorbs musical phrasing.\n\n### What Evaluators Score:\n1. **Epaulement & Head Alignment**: The harmonious angle of the neck and shoulders.\n2. **Clean Footwork at the Barre**: Precision of tendus, jetés, and ronds de jambe.\n3. **Musicality & Dynamic Nuance**: Interpreting tempo changes rather than mechanically counting.\n\nReview the photo gallery and demonstration video for barre posture guidelines.',
          contentAr: '## التميز في اختبارات القبول بالأكاديمية\n\nاختبار القبول ليس مجرد قياس للقدرات الفنية، بل هو تعبير عن الحضور المسرحي والنقاء الحركي. يراقب الحكام طريقة تنفس الراقصة وانسيابية الانتقال بين الأوضاع والتفاعل مع النغمات الموسيقية.\n\n### بنود التقييم الرئيسية:\n1. **استقامة الرقبة والأكتاف (Epaulement)**: التناغم الحركي بين الرأس والكتفين.\n2. **دقة حركات البار**: النقاء في التاندو والجيته والدوران.\n3. **الإحساس الموسيقي**: التعبير عن اللحن بدلاً من العد الحركي المجرد.\n\nاطلعي على معرض الصور والفيديو التوضيحي المرفق للاستعداد الأمثل.',
          coverImageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
          videoUrl: 'https://www.youtube.com/watch?v=CotioxyuN0A',
          videoEmbedCode: '<iframe src="https://www.youtube-nocookie.com/embed/CotioxyuN0A" title="Audition & Barre Technique" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
          galleryImages: [
            'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80',
          ],
          authorName: 'Maître Alexandre Moreau',
          authorNameAr: 'أ. ألكسندر مورو',
          category: 'journal',
          tags: ['audition', 'conservatory', 'preparation'],
          featured: false,
          readingMinutes: 4,
        },
        {
          slug: 'nutcracker-behind-scenes',
          title: 'Behind the Scenes: Stagecraft, Lighting & Grand Pas Rehearsals',
          titleAr: 'كواليس العرض المسرحي: إضاءة المسرح وتدريبات البا دو دو',
          excerpt: 'An exclusive look inside the 4-week production cycle for the academy annual gala performance.',
          excerptAr: 'نظرة حصرية على كواليس إنتاج العرض السنوي الكبير وتدريبات المسرح لأكثر من 60 راقصة.',
          content: '## The Grand Stage Experience\n\nProducing a full-scale classical production requires immense dedication from dancers, stage directors, and costumiers. From bespoke tulle tutus to stage lighting calibration, every detail matters.\n\n### Rehearsal Highlights\nOver 60 conservatory dancers, 120 hand-sewn costumes, and 80 hours of orchestra rehearsal culminate in this breathtaking annual showcase. Watch the rehearsal video and browse exclusive stage photography below.',
          contentAr: '## تجربة المسرح الكبير والأداء الحي\n\nيتطلب إنتاج عرض باليه كلاسيكي كامل تفانياً هائلاً من الراقصات ومصممي الأزياء ومهندسي الإضاءة. من خياطة فساتين التوتو اليدوية وحتى ضبط مسارات الإضاءة، كل تفصيلة تصنع الفارق.\n\n### أرقام من الكواليس\nأكثر من 60 راقصة و120 زياً مسرحياً مصنوعاً يدوياً و80 ساعة تدريب أوركسترالي تثمر عن هذا العرض السنوي الساحر. شاهدي مقطع التدريبات المباشر وتصفحي معرض الصور الحصري.',
          coverImageUrl: 'https://images.unsplash.com/photo-1516475429286-465d815a0df7?auto=format&fit=crop&w=1200&q=80',
          videoUrl: 'https://www.youtube.com/watch?v=ayrrYQAA1BQ',
          videoEmbedCode: '<iframe src="https://www.youtube-nocookie.com/embed/ayrrYQAA1BQ" title="Nutcracker Rehearsal & Stagecraft" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
          galleryImages: [
            'https://images.unsplash.com/photo-1516475429286-465d815a0df7?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80',
          ],
          authorName: 'Étoile Stage Production',
          authorNameAr: 'فريق إنتاج إتوال',
          category: 'performances',
          tags: ['performances', 'stage', 'backstage', 'nutcracker'],
          featured: false,
          readingMinutes: 5,
        },
      ];
      for (const s of seeds) {
        await blog.upsert({
          where: { slug: s.slug },
          update: {
            title: s.title,
            titleAr: s.titleAr,
            excerpt: s.excerpt,
            excerptAr: s.excerptAr,
            content: s.content,
            contentAr: s.contentAr,
            coverImageUrl: s.coverImageUrl,
            videoUrl: s.videoUrl,
            videoEmbedCode: s.videoEmbedCode,
            galleryImages: s.galleryImages,
            authorName: s.authorName,
            authorNameAr: s.authorNameAr,
            category: s.category,
            tags: s.tags,
            featured: s.featured,
            readingMinutes: s.readingMinutes,
          },
          create: { ...s, status: 'published', views: 142, publishedAt: new Date() },
        } as never);
      }
      console.log('✅ Blog posts seeded with video & gallery');
    }
  } catch (e) {
    console.log('ℹ️ Blog seed skipped:', (e as Error).message?.slice(0, 120));
  }

  // 15. Testimonials seed (additive — only when the table is empty)
  try {
    const t = (prisma as unknown as { testimonial?: { count: () => Promise<number>; create: (a: unknown) => Promise<unknown> } }).testimonial;
    if (t && (await t.count()) === 0) {
      const items = [
        { authorName: 'Eleonore Moreau', authorRole: 'Parent — Pre-Pro IV', text: 'Maya transformed within a single term. The faculty notices every detail, and the WhatsApp updates keep us close to her progress.', textAr: 'تغيرت مايا تماماً خلال فصل واحد. الهيئة تلاحظ كل التفاصيل وتحديثات واتساب تبقينا قريبين من تقدمها.', rating: 5, status: 'published' },
        { authorName: 'Harrison Vance', authorRole: 'Parent — Contemporary', text: 'Impeccable studios, serious training, honest billing. The trial class alone convinced us.', textAr: 'استوديوهات راقية وتدريب جاد وفوترة واضحة. الحصة التجريبية وحدها أقنعتنا.', rating: 5, status: 'published' },
        { authorName: 'Tariq Al-Mansoor', authorRole: 'Parent — Junior Conservatory', text: 'Amira looks forward to every session. The portal, the reminders, the care — everything works.', textAr: 'أميرة تنتظر كل حصة بشوق. البوابة والتذكيرات والاهتمام — كل شيء يعمل.', rating: 5, status: 'published' },
      ];
      for (const item of items) await t.create({ data: item } as never);
      console.log('✅ Testimonials seeded');
    }
  } catch (e) {
    console.log('ℹ️ Testimonials seed skipped:', (e as Error).message?.slice(0, 120));
  }

  // 16. FX rates seed (indicative EGP rates — finance updates monthly)
  try {
    const fx = (prisma as unknown as { fxRate?: { upsert: (a: unknown) => Promise<unknown> } }).fxRate;
    if (fx) {
      const rates: Array<[string, number]> = [['USD', 48.5], ['EUR', 52.5], ['GBP', 61.0], ['AED', 13.2], ['SAR', 12.9]];
      for (const [currency, rateToEgp] of rates) {
        await fx.upsert({ where: { currency }, update: {}, create: { currency, rateToEgp, updatedBy: 'seed' } } as never);
      }
      console.log('✅ FX rates seeded');
    }
  } catch (e) {
    console.log('ℹ️ FX seed skipped:', (e as Error).message?.slice(0, 120));
  }

  // 17. Academy hierarchy backfill: categories + 1:1 groups per course + session links
  try {
    const db = prisma as unknown as {
      category: { count: () => Promise<number>; create: (a: unknown) => Promise<{ id: string }>; findMany: () => Promise<Array<{ id: string; key: string }>> };
      group: { findFirst: (a: unknown) => Promise<{ id: string } | null>; create: (a: unknown) => Promise<{ id: string }> };
      course: { findMany: (a?: unknown) => Promise<Array<{ id: string; code: string; title: string; titleAr: string | null; program: string; level: string; capacity: number; instructorId: string | null; branchCode: string | null }>>; update: (a: unknown) => Promise<unknown> };
      courseSession: { updateMany: (a: unknown) => Promise<unknown> };
    };
    if ((await db.category.count()) === 0) {
      const cats: Array<[string, string, string, string]> = [
        ['classical', 'Classical Ballet', 'الباليه الكلاسيكي', '#caa868'],
        ['contemporary', 'Contemporary Dance', 'الرقص المعاصر', '#8b5cf6'],
        ['youth', 'Youth Program', 'برنامج الناشئين', '#34d399'],
      ];
      for (const [key, title, titleAr, color] of cats) {
        await db.category.create({ data: { key, title, titleAr, color, sortOrder: cats.findIndex((c) => c[0] === key) } } as never);
      }
      console.log('✅ Categories seeded');
    }
    const catByKey = new Map((await db.category.findMany()).map((c) => [c.key, c.id]));
    const courses = await db.course.findMany().catch(() => []);
    let linked = 0;
    for (const c of courses) {
      const existing = await db.group.findFirst({ where: { code: c.code } }).catch(() => null);
      let groupId = existing?.id;
      if (!groupId) {
        const categoryId = catByKey.get(c.program) || Array.from(catByKey.values())[0];
        if (!categoryId) continue;
        const created = await db.group.create({
          data: {
            code: c.code,
            title: c.title,
            titleAr: c.titleAr,
            categoryId,
            instructorId: c.instructorId,
            capacity: c.capacity,
            branchCode: c.branchCode,
            level: c.level,
            active: true,
          },
        } as never).catch(() => null);
        groupId = (created as { id: string } | null)?.id;
      }
      if (groupId) {
        await db.course.update({ where: { id: c.id }, data: { groupId } }).catch(() => null);
        await db.courseSession.updateMany({ where: { courseId: c.id }, data: { groupId } }).catch(() => null);
        linked += 1;
      }
    }
    console.log(`✅ Academy backfill linked ${linked} courses`);
  } catch (e) {
    console.log('ℹ️ Academy backfill skipped:', (e as Error).message?.slice(0, 120));
  }

  // 18. Group enrollment backfill: mirror active course enrollments onto groups
  try {
    const db2 = prisma as unknown as {
      courseEnrollment: { findMany: (a: unknown) => Promise<Array<{ courseId: string; studentId: string; status: string }>> };
      course: { findUnique: (a: unknown) => Promise<{ groupId: string | null } | null> };
      groupEnrollment: { findUnique: (a: unknown) => Promise<unknown>; create: (a: unknown) => Promise<unknown> };
    };
    const rows = await db2.courseEnrollment.findMany({ where: { status: 'active' } }).catch(() => []);
    let mirrored = 0;
    for (const r of rows) {
      const course = await db2.course.findUnique({ where: { id: r.courseId } }).catch(() => null);
      if (!course?.groupId) continue;
      const exists = await db2.groupEnrollment.findUnique({
        where: { groupId_studentId: { groupId: course.groupId, studentId: r.studentId } },
      }).catch(() => null);
      if (!exists) {
        await db2.groupEnrollment.create({ data: { groupId: course.groupId, studentId: r.studentId, status: 'active' } }).catch(() => null);
        mirrored += 1;
      }
    }
    console.log(`✅ Group enrollments mirrored: ${mirrored}`);
  } catch (e) {
    console.log('ℹ️ Enrollment backfill skipped:', (e as Error).message?.slice(0, 120));
  }

  console.log('✨ All Étoile Ballet Academy data seeded successfully into PostgreSQL!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
