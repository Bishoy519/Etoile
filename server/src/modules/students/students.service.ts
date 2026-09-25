import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  generateUniqueStudentId,
  generateUniqueBarcode,
  findOrCreateFamily,
} from '../../common/id-generator';
import { parsePagination } from '../../common/pagination.util';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { page?: string | number; limit?: string | number }) {
    const { skip, take } = parsePagination(query ?? {}, 200, 1000);
    const students = await this.prisma.student.findMany({
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        evaluations: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { id: 'asc' },
      skip,
      take,
    });

    // Format subscription property for compatibility with frontend type
    return students.map((s) => ({
      ...s,
      subscription: s.subscriptions[0]
        ? {
            ...s.subscriptions[0],
            startDate: s.subscriptions[0].startDate.toISOString().split('T')[0],
            endDate: s.subscriptions[0].endDate.toISOString().split('T')[0],
          }
        : {
            id: 'SUB-NONE',
            planName: 'No Active Subscription',
            planNameAr: 'لا يوجد اشتراك نشط',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            maxSessions: 0,
            usedSessions: 0,
            price: 0,
            dailyAccrualRate: 0,
            status: 'expired_quota' as const,
          },
    }));
  }

  async findById(idOrBarcode: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { id: idOrBarcode },
          { barcode: idOrBarcode },
        ],
      },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        evaluations: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with identifier ${idOrBarcode} not found`);
    }

    return {
      ...student,
      subscription: student.subscriptions[0]
        ? {
            ...student.subscriptions[0],
            startDate: student.subscriptions[0].startDate.toISOString().split('T')[0],
            endDate: student.subscriptions[0].endDate.toISOString().split('T')[0],
          }
        : {
            id: 'SUB-NONE',
            planName: 'No Active Subscription',
            planNameAr: 'لا يوجد اشتراك نشط',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            maxSessions: 0,
            usedSessions: 0,
            price: 0,
            dailyAccrualRate: 0,
            status: 'expired_quota' as const,
          },
    };
  }

  async registerStudent(data: {
    name: string;
    nameAr?: string;
    barcode?: string;
    age: number;
    birthDate?: string;
    program: string;
    level: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    photoUrl?: string;
    maxNegativeDebt?: number;
    initialPlan?: 'elite_16' | 'foundation_8' | 'intensive_20';
  }) {
    // Collision-free identifiers (never count-based) and shared families:
    // siblings registering later reuse the existing family row.
    const studentId = await generateUniqueStudentId(this.prisma);
    let barcode = data.barcode?.trim().toUpperCase();
    if (barcode) {
      const existingBarcode = await this.prisma.student.findUnique({ where: { barcode } });
      if (existingBarcode) {
        throw new BadRequestException(`Barcode ${barcode} is already assigned to another student`);
      }
    } else {
      barcode = await generateUniqueBarcode(this.prisma);
    }
    const family = await findOrCreateFamily(this.prisma, {
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
    });
    const familyId = family.id;

    let birthDate: Date | null = null;
    if (data.birthDate) {
      const parsed = new Date(data.birthDate);
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        throw new BadRequestException('birthDate must be a valid past date');
      }
      birthDate = parsed;
    }

    const student = await this.prisma.student.create({
      data: {
        id: studentId,
        name: data.name,
        nameAr: data.nameAr || data.name,
        barcode,
        photoUrl:
          data.photoUrl ||
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        familyId,
        age: data.age,
        birthDate,
        program: data.program,
        level: data.level,
        walletBalance: 0.0,
        maxNegativeDebt: data.maxNegativeDebt || 150.0,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
      },
    });

    const tier = data.initialPlan || 'elite_16';
    const maxSessions = tier === 'intensive_20' ? 20 : tier === 'foundation_8' ? 8 : 16;
    const price = tier === 'intensive_20' ? 520 : tier === 'foundation_8' ? 260 : 480;
    const planName =
      tier === 'intensive_20'
        ? 'Contemporary Intensive Pro (20 Sessions)'
        : tier === 'foundation_8'
        ? 'Youth Foundation Academy (8 Sessions)'
        : 'Conservatory Classical Elite (16 Sessions)';

    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.studentSubscription.create({
      data: {
        studentId: student.id,
        planName,
        planNameAr: planName,
        startDate,
        endDate,
        maxSessions,
        usedSessions: 0,
        price,
        dailyAccrualRate: price / 30,
        status: 'active',
      },
    });

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'Student Registered',
        actor: 'Station Operator',
        details: `Registered ${student.name} (${student.id}) into ${student.program}`,
        category: 'crm',
      },
    });

    return this.findById(student.id);
  }

  async updateStudent(id: string, data: any) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException(`Student ${id} not found`);

    if (data.barcode && data.barcode !== student.barcode) {
      const existingBarcode = await this.prisma.student.findUnique({ where: { barcode: data.barcode } });
      if (existingBarcode) throw new BadRequestException(`Barcode ${data.barcode} is already assigned to another student`);
    }

    const { subscription, notes, evaluations, ...updateFields } = data;
    if (updateFields.birthDate !== undefined && updateFields.birthDate !== null && updateFields.birthDate !== '') {
      const parsed = new Date(updateFields.birthDate);
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        throw new BadRequestException('birthDate must be a valid past date');
      }
      updateFields.birthDate = parsed;
    }
    if (updateFields.birthDate === '') delete (updateFields as Record<string, unknown>).birthDate;
    const updated = await this.prisma.student.update({
      where: { id },
      data: updateFields,
    });

    return this.findById(updated.id);
  }

  async deleteStudent(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException(`Student ${id} not found`);

    await this.prisma.student.delete({ where: { id } });
    return { success: true, message: `Student ${id} deleted` };
  }

  async adjustWallet(id: string, amount: number) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException(`Student ${id} not found`);

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        walletBalance: {
          increment: amount,
        },
      },
    });

    return updated;
  }

  async adjustQuota(id: string, deltaSessions: number) {
    const activeSub = await this.prisma.studentSubscription.findFirst({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSub) throw new NotFoundException(`No active subscription for student ${id}`);

    const newUsed = Math.max(0, activeSub.usedSessions + deltaSessions);
    const newStatus =
      newUsed >= activeSub.maxSessions
        ? 'expired_quota'
        : new Date() > activeSub.endDate
        ? 'expired_date'
        : 'active';

    await this.prisma.studentSubscription.update({
      where: { id: activeSub.id },
      data: {
        usedSessions: newUsed,
        status: newStatus,
      },
    });

    return this.findById(id);
  }

  async addNote(studentId: string, noteData: { text: string; category?: string; author?: string; authorRole?: string }, actor?: { id?: string; role?: string; name?: string }) {
    await this.findById(studentId);
    if (!noteData.text?.trim()) {
      throw new BadRequestException('Note text is required');
    }
    const allowedCategories = ['general', 'medical', 'tuition', 'performance'];
    if (noteData.category && !allowedCategories.includes(noteData.category)) {
      throw new BadRequestException(`Invalid category. Allowed: ${allowedCategories.join(', ')}`);
    }
    await this.assertInstructorAccess(actor, studentId);
    return this.prisma.studentNote.create({
      data: {
        studentId,
        text: noteData.text.trim().slice(0, 2000),
        category: noteData.category || 'general',
        author: noteData.author || actor?.name || 'Station Staff',
        authorRole: noteData.authorRole || (actor?.role === 'instructor' ? 'Instructor' : 'Receptionist'),
      },
    });
  }

  async addEvaluation(studentId: string, evalData: {
    evaluator: string;
    barre: number;
    center: number;
    allegro: number;
    musicality: number;
    notes?: string;
  }, actor?: { id?: string; role?: string }) {
    await this.findById(studentId);
    for (const axis of ['barre', 'center', 'allegro', 'musicality'] as const) {
      const v = Number((evalData as Record<string, unknown>)[axis]);
      if (!Number.isFinite(v) || v < 0 || v > 10) {
        throw new BadRequestException(`${axis} score must be between 0 and 10`);
      }
    }
    if (!evalData.evaluator?.trim()) throw new BadRequestException('Evaluator name is required');
    await this.assertInstructorAccess(actor, studentId);
    return this.prisma.skillEvaluation.create({
      data: {
        studentId,
        evaluator: evalData.evaluator.trim().slice(0, 120),
        barre: Number(evalData.barre),
        center: Number(evalData.center),
        allegro: Number(evalData.allegro),
        musicality: Number(evalData.musicality),
        notes: (evalData.notes || '').slice(0, 2000),
      },
    });
  }

  async deleteEvaluation(evalId: string) {
    const existing = await this.prisma.skillEvaluation.findUnique({ where: { id: evalId } });
    if (!existing) throw new NotFoundException(`Evaluation ${evalId} not found`);
    await this.prisma.skillEvaluation.delete({ where: { id: evalId } });
    return { success: true, id: evalId };
  }

  /**
   * Instructors may only touch dancers they teach (active enrollment in one of
   * their courses). Staff roles bypass. Called with the request actor; public
   * callers without an actor keep legacy behavior.
   */
  private async assertInstructorAccess(actor: { id?: string; role?: string } | undefined, studentId: string) {
    if (!actor || actor.role !== 'instructor' || !actor.id) return;
    const teaches = await this.prisma.courseEnrollment.findFirst({
      where: {
        studentId,
        status: 'active',
        course: { instructorId: actor.id },
      },
      select: { id: true },
    });
    if (!teaches) {
      throw new ForbiddenException('You may only grade dancers enrolled in your own courses');
    }
  }

  // --------------------------------------------------------------------------
  // CONSENT / MEDICAL DOCUMENT VAULT (base64 JSON, max 4MB, stored as Bytes)
  // --------------------------------------------------------------------------
  private static readonly DOC_KINDS = new Set(['consent', 'medical', 'other']);
  private static readonly DOC_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  private static readonly DOC_MAX_BYTES = 4 * 1024 * 1024;

  /** Families/students are household-scoped; staff are unrestricted. */
  private async assertDocumentAccess(
    actor: { id?: string; role?: string; familyId?: string; studentId?: string } | undefined,
    studentId: string,
  ) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { familyId: true } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    if (!actor) throw new ForbiddenException('Authentication required');
    if (['superadmin', 'owner', 'receptionist', 'instructor'].includes(actor.role || '')) return;
    if ((actor.role === 'family' && actor.familyId === student.familyId) ||
        (actor.role === 'student' && actor.studentId === studentId)) return;
    throw new ForbiddenException('You may only access your own family documents');
  }

  async listDocuments(studentId: string, actor?: { id?: string; role?: string; familyId?: string; studentId?: string }) {
    await this.assertDocumentAccess(actor, studentId);
    const docs = await this.prisma.studentDocument.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, studentId: true, kind: true, fileName: true, mimeType: true, size: true, uploadedBy: true, createdAt: true },
    });
    return docs;
  }

  async uploadDocument(
    studentId: string,
    data: { kind?: string; fileName?: string; mimeType?: string; base64?: string },
    actor?: { id?: string; role?: string; familyId?: string; studentId?: string; name?: string },
  ) {
    await this.assertDocumentAccess(actor, studentId);
    const kind = (data.kind || 'other').trim();
    if (!StudentsService.DOC_KINDS.has(kind)) {
      throw new BadRequestException(`Invalid kind. Allowed: consent, medical, other`);
    }
    if (!data.fileName?.trim()) throw new BadRequestException('fileName is required');
    if (!data.mimeType || !StudentsService.DOC_MIMES.has(data.mimeType)) {
      throw new BadRequestException('Only PDF, JPEG and PNG files are accepted');
    }
    if (!data.base64) throw new BadRequestException('File content is required');
    let buf: Buffer;
    try {
      buf = Buffer.from(data.base64, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 content');
    }
    if (buf.length === 0 || buf.length > StudentsService.DOC_MAX_BYTES) {
      throw new BadRequestException('File must be non-empty and under 4MB');
    }
    const created = await this.prisma.studentDocument.create({
      data: {
        studentId,
        kind,
        fileName: data.fileName.trim().slice(0, 160),
        mimeType: data.mimeType,
        size: buf.length,
        data: Uint8Array.from(buf),
        uploadedBy: actor?.name || actor?.role || 'family',
      },
      select: { id: true, studentId: true, kind: true, fileName: true, mimeType: true, size: true, uploadedBy: true, createdAt: true },
    });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Document Uploaded', actor: actor?.name || actor?.role || 'family', details: `${kind} ${created.fileName} for ${studentId}`, category: 'crm' },
    }).catch(() => null);
    return created;
  }

  async downloadDocument(docId: string, actor?: { id?: string; role?: string; familyId?: string; studentId?: string }) {
    const doc = await this.prisma.studentDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException(`Document ${docId} not found`);
    await this.assertDocumentAccess(actor, doc.studentId);
    return {
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      base64: Buffer.from(doc.data).toString('base64'),
    };
  }

  async deleteDocument(docId: string, actor?: { id?: string; role?: string; familyId?: string; studentId?: string }) {
    const doc = await this.prisma.studentDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException(`Document ${docId} not found`);
    await this.assertDocumentAccess(actor, doc.studentId);
    await this.prisma.studentDocument.delete({ where: { id: docId } });
    return { success: true };
  }

  /** Household-scoped birthdate update (staff unrestricted). */
  async setBirthDate(studentId: string, birthDate: string, actor?: { id?: string; role?: string; familyId?: string; studentId?: string }) {
    await this.assertDocumentAccess(actor, studentId);
    if (!birthDate?.trim()) throw new BadRequestException('birthDate is required');
    const parsed = new Date(birthDate.trim());
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
      throw new BadRequestException('birthDate must be a valid past date');
    }
    const years = (Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (years < 2 || years > 100) throw new BadRequestException('birthDate implies an unlikely age (2–100)');
    return this.prisma.student.update({
      where: { id: studentId },
      data: { birthDate: parsed, age: Math.max(3, Math.floor(years)) },
      select: { id: true, birthDate: true, age: true },
    });
  }

  // --------------------------------------------------------------------------
  // CERTIFICATES & BADGES (instructor-issued, family-visible)
  // --------------------------------------------------------------------------
  private static readonly CERT_KINDS = new Set(['attendance', 'evaluation', 'milestone', 'stage']);

  async listCertificates(studentId: string, actor?: { id?: string; role?: string; familyId?: string; studentId?: string }) {
    await this.assertDocumentAccess(actor, studentId);
    return this.prisma.certificate.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } });
  }

  async issueCertificate(
    studentId: string,
    data: { title?: string; titleAr?: string; kind?: string; meta?: string },
    actor?: { id?: string; role?: string; name?: string },
  ) {
    await this.findById(studentId);
    const kind = (data.kind || 'milestone').trim();
    if (!StudentsService.CERT_KINDS.has(kind)) {
      throw new BadRequestException('Invalid kind. Allowed: attendance, evaluation, milestone, stage');
    }
    if (!data.title?.trim()) throw new BadRequestException('Certificate title is required');
    await this.assertInstructorAccess(actor, studentId);
    const created = await this.prisma.certificate.create({
      data: {
        studentId,
        title: data.title.trim().slice(0, 120),
        titleAr: data.titleAr?.trim().slice(0, 120) || null,
        kind,
        meta: (data.meta || '').slice(0, 500),
        issuedBy: actor?.name || 'Academy',
      },
    });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Certificate Issued', actor: actor?.name || actor?.role || 'Staff', details: `${created.title} for ${studentId}`, category: 'crm' },
    }).catch(() => null);
    return created;
  }

  /**
   * Term progress report: attendance rate, evaluation history + axis trends,
   * certificates, latest instructor note, quota snapshot. One payload feeds
   * both the staff printable and the family portal view.
   */
  async getProgress(studentId: string, actor?: { id?: string; role?: string; familyId?: string; studentId?: string }) {
    await this.assertDocumentAccess(actor, studentId);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 3 },
        attendanceLogs: { orderBy: { timestamp: 'desc' }, take: 200 },
        evaluations: { orderBy: { date: 'asc' } },
        certificates: { orderBy: { createdAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    const logs = student.attendanceLogs;
    const present = logs.filter((l) => l.status === 'granted').length;
    const absent = logs.filter((l) => l.status === 'absent').length;
    const counted = present + absent;
    const num = (v: unknown) => Number((v as { toString?: () => string })?.toString?.() ?? v ?? 0) || 0;
    const evals = student.evaluations.map((e) => ({
      id: e.id,
      date: e.date,
      evaluator: e.evaluator,
      barre: num((e as unknown as { barre: unknown }).barre),
      center: num((e as unknown as { center: unknown }).center),
      allegro: num((e as unknown as { allegro: unknown }).allegro),
      musicality: num((e as unknown as { musicality: unknown }).musicality),
      notes: e.notes,
    }));
    const avg = (xs: number[]) => (xs.length > 0 ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
    const trend: Record<string, number | null> = {};
    for (const axis of ['barre', 'center', 'allegro', 'musicality'] as const) {
      trend[axis] = evals.length >= 2
        ? Math.round((evals[evals.length - 1][axis] - evals[0][axis]) * 10) / 10
        : null;
    }
    const latest = evals.length > 0 ? evals[evals.length - 1] : null;
    const sub = student.subscriptions[0];
    return {
      student: { id: student.id, name: student.name, nameAr: student.nameAr, level: student.level, program: student.program },
      generatedAt: new Date().toISOString(),
      attendance: {
        present,
        absent,
        rate: counted > 0 ? Math.round((present / counted) * 10) / 10 : null,
        lastClass: logs[0]?.timestamp || null,
      },
      evaluations: {
        count: evals.length,
        latest,
        history: evals.slice(-8),
        averages: {
          barre: avg(evals.map((e) => e.barre)),
          center: avg(evals.map((e) => e.center)),
          allegro: avg(evals.map((e) => e.allegro)),
          musicality: avg(evals.map((e) => e.musicality)),
        },
        trend,
      },
      certificates: student.certificates.map((c) => ({ id: c.id, title: c.title, titleAr: c.titleAr, kind: c.kind, createdAt: c.createdAt })),
      latestNote: student.notes[0] ? { text: student.notes[0].text, author: student.notes[0].author, date: student.notes[0].createdAt } : null,
      subscription: sub
        ? { planName: sub.planName, status: sub.status, used: sub.usedSessions, max: sub.maxSessions, endDate: sub.endDate }
        : null,
    };
  }
}
