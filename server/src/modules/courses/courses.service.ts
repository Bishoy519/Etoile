import { Injectable, NotFoundException, BadRequestException, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenWaService } from '../openwa/openwa.service';
import { PushService } from '../notifications/push.service';
import { parsePagination } from '../../common/pagination.util';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';

export interface CreateCourseDto {
  title: string;
  titleAr?: string;
  code?: string;
  description?: string;
  descriptionAr?: string;
  program: 'classical' | 'contemporary' | 'youth';
  level: string;
  capacity?: number;
  instructorId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  studioRoom?: string;
  branchCode?: string;
}

export interface CreateSessionDto {
  courseId: string;
  title: string;
  sessionDate: string | Date;
  startTime: string;
  endTime: string;
  studioRoom?: string;
  instructorId?: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateReminderConfigDto {
  enabled?: boolean;
  sendMinutesBefore?: number;
  studentTemplateEn?: string;
  studentTemplateAr?: string;
  instructorTemplateEn?: string;
  instructorTemplateAr?: string;
  autoCron?: boolean;
}

/**
 * The authenticated caller (if any) on public endpoints. Contact details
 * (phones, emails) are only served to signed-in viewers; anonymous callers
 * receive redacted payloads. Roster-level parent contacts additionally
 * require a staff role.
 */
export interface ScheduleViewer {
  role?: string;
  familyId?: string;
  studentId?: string;
}

const STAFF_ROLES = ['superadmin', 'owner', 'receptionist', 'instructor'];

function isStaffViewer(viewer?: ScheduleViewer | null): boolean {
  return !!viewer?.role && STAFF_ROLES.includes(viewer.role);
}

const PROGRAMS = ['classical', 'contemporary', 'youth'] as const;

function programOfKey(key?: string | null): (typeof PROGRAMS)[number] {
  return (PROGRAMS as readonly string[]).includes(key || '') ? (key as (typeof PROGRAMS)[number]) : 'classical';
}

/** Project a Group row onto the legacy Course shape all readers consume. */
function groupToCourse(g: any): any {
  return {
    id: g.id,
    code: g.code,
    title: g.title,
    titleAr: g.titleAr ?? null,
    description: g.description ?? null,
    descriptionAr: g.descriptionAr ?? null,
    program: programOfKey(g.category?.key || g.program),
    level: g.level || 'conservatory',
    capacity: g.capacity ?? 20,
    instructorId: g.instructorId ?? null,
    instructor: g.instructor ?? null,
    dayOfWeek: g.dayOfWeek ?? 'Monday, Wednesday',
    startTime: g.startTime ?? '16:00',
    endTime: g.endTime ?? '17:30',
    studioRoom: g.studioRoom ?? 'Studio Petipa',
    branchCode: g.branchCode ?? 'ZAM',
    active: g.active ?? true,
    groupId: g.id,
    category: g.category ?? null,
    enrollments: g.enrollments,
    sessions: g.sessions,
    _count: g._count,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

/** Sessions may outlive their shadow course — fall back to the group identity. */
function sessionCourseOf(s: any): any {
  if (s.course) return s.course;
  const g = s.group;
  if (!g) return null;
  return {
    id: g.id,
    code: g.code,
    title: g.title,
    titleAr: g.titleAr ?? null,
    program: programOfKey(g.category?.key),
    level: g.level || 'conservatory',
    branchCode: g.branchCode ?? 'ZAM',
    _count: g._count,
  };
}

@Injectable()
export class CoursesService implements OnModuleInit, OnModuleDestroy {
  private reminderInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openWaService: OpenWaService,
    @Optional() private readonly push?: PushService,
  ) {}

  onModuleInit() {
    // Start automatic reminder polling check every 60 seconds
    this.reminderInterval = setInterval(() => {
      this.checkAndSendAutomatedReminders().catch((err) => {
        console.error('Error during automated WhatsApp reminder cycle:', err);
      });
    }, 60000);
  }

  onModuleDestroy() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }
  }

  // --------------------------------------------------------------------------
  // COURSES CRUD
  // --------------------------------------------------------------------------
  /** Staff directory fields safe for anonymous catalog visitors. */
  private staffSelect(viewer?: ScheduleViewer | null) {
    const base = {
      id: true,
      name: true,
      nameAr: true,
      department: true,
      avatarUrl: true,
      role: true,
    };
    return isStaffViewer(viewer) ? { ...base, email: true, phone: true, cardCode: true } : base;
  }

  /** Dancer roster fields safe for the given viewer (parent contacts = staff only). */
  private sanitizeRosterStudent(student: any, viewer?: ScheduleViewer | null) {
    if (!student) return student;
    const { passwordHash, otpCode, otpExpiresAt, parentPhone, parentEmail, ...rest } = student;
    void passwordHash;
    void otpCode;
    void otpExpiresAt;
    return {
      ...rest,
      ...(isStaffViewer(viewer) ? { parentPhone, parentEmail } : {}),
    };
  }

  async getAllCourses(
    program?: string,
    instructorId?: string,
    viewer?: ScheduleViewer | null,
    query?: { page?: string | number; limit?: string | number; branchCode?: string },
  ) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);

    // Group-first: project groups onto the legacy Course shape. Legacy
    // courses without a group (pre-cutover orphans) are appended, never
    // shadowing a group (shadows carry groupId and are hidden here).
    const groupWhere: any = {};
    if (program) groupWhere.category = { key: program };
    if (instructorId) groupWhere.instructorId = instructorId;
    if (query?.branchCode) groupWhere.branchCode = query.branchCode;

    const courseWhere: any = { groupId: null };
    if (program) courseWhere.program = program;
    if (instructorId) courseWhere.instructorId = instructorId;
    if (query?.branchCode) courseWhere.branchCode = query.branchCode;

    const [groups, legacy] = await Promise.all([
      this.prisma.group.findMany({
        where: groupWhere,
        include: {
          category: true,
          instructor: { select: this.staffSelect(viewer) },
          _count: { select: { enrollments: true, sessions: true } },
          sessions: {
            where: { sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            orderBy: { sessionDate: 'asc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.course.findMany({
        where: courseWhere,
        include: {
          instructor: { select: this.staffSelect(viewer) },
          _count: { select: { enrollments: true, sessions: true } },
          sessions: {
            where: { sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            orderBy: { sessionDate: 'asc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    const merged = [...groups.map(groupToCourse), ...legacy];
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged.slice(0, take || merged.length);
  }

  /** Validate an optional branch code, defaulting to the flagship studio. */
  private async resolveBranchCode(code?: string): Promise<string> {
    const clean = (code || 'ZAM').trim().toUpperCase();
    const branch = await (this.prisma as any).branch?.findUnique({ where: { code: clean } }).catch(() => null);
    if (!branch) throw new BadRequestException(`Unknown branchCode ${clean}`);
    return clean;
  }

  async getCourseById(id: string, viewer?: ScheduleViewer | null) {
    // Group-first: resolve the id as a group, else fall back to legacy course.
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        category: true,
        instructor: { select: this.staffSelect(viewer) },
        enrollments: {
          include: {
            student: {
              include: {
                subscriptions: { take: 1, orderBy: { createdAt: 'desc' } },
              },
            },
          },
        },
        sessions: {
          orderBy: { sessionDate: 'asc' },
          include: { instructor: { select: this.staffSelect(viewer) } },
        },
        _count: { select: { enrollments: true, sessions: true } },
      },
    }).catch(() => null);

    if (group) {
      const projected = groupToCourse(group);
      return {
        ...projected,
        enrollments: (group.enrollments || []).map((e: any) => ({
          ...e,
          courseId: group.id,
          course: projected,
          student: this.sanitizeRosterStudent(e.student, viewer),
        })),
        sessions: group.sessions || [],
      };
    }

    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: this.staffSelect(viewer),
        },
        enrollments: {
          include: {
            student: {
              include: {
                subscriptions: {
                  take: 1,
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
        sessions: {
          orderBy: { sessionDate: 'asc' },
          include: {
            instructor: {
              select: this.staffSelect(viewer),
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course ${id} not found`);
    }

    // Never leak credential/secret columns (passwordHash, OTP) or household
    // contacts to non-staff viewers through the public course endpoint.
    return {
      ...course,
      enrollments: course.enrollments.map((e: any) => ({
        ...e,
        student: this.sanitizeRosterStudent(e.student, viewer),
      })),
    };
  }

  async createCourse(dto: CreateCourseDto) {
    const code =
      dto.code ||
      `BAL-${dto.program.substring(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const existing = await this.prisma.course.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException(`Course code ${code} already exists`);
    }

    const course = await this.prisma.course.create({
      data: {
        code,
        title: dto.title,
        titleAr: dto.titleAr,
        description: dto.description,
        descriptionAr: dto.descriptionAr,
        program: dto.program,
        level: dto.level,
        capacity: dto.capacity || 20,
        instructorId: dto.instructorId || null,
        dayOfWeek: dto.dayOfWeek || 'Monday, Wednesday',
        startTime: dto.startTime || '16:00',
        endTime: dto.endTime || '17:30',
        studioRoom: dto.studioRoom || 'Grand Studio Petipa',
        branchCode: await this.resolveBranchCode(dto.branchCode),
      },
      include: {
        instructor: true,
      },
    });

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'Course Created',
        actor: 'Academic Director',
        details: `Created course ${course.title} (${course.code}) with capacity ${course.capacity}`,
        category: 'crm',
      },
    });

    return course;
  }
  async updateCourse(id: string, dto: Partial<CreateCourseDto>) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException(`Course ${id} not found`);

    // Drop undefined keys so partial PATCH bodies never produce a Prisma
    // "no data provided" error — and reject fully-empty bodies explicitly.
    const data: any = Object.fromEntries(Object.entries(dto || {}).filter(([, v]) => v !== undefined));
    if (data.branchCode !== undefined) {
      data.branchCode = await this.resolveBranchCode(data.branchCode as string);
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nothing to update: request body is empty');
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data,
      include: {
        instructor: {
          select: this.staffSelect({ role: 'superadmin' }),
        },
        _count: { select: { enrollments: true, sessions: true } },
      },
    });

    return updated;
  }

  async deleteCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException(`Course ${id} not found`);

    await this.prisma.course.delete({ where: { id } });
    return { success: true, message: `Course ${course.title} deleted successfully.` };
  }

  // --------------------------------------------------------------------------
  // COURSE ENROLLMENTS
  // --------------------------------------------------------------------------
  async enrollStudent(courseId: string, studentId: string) {
    // Legacy course ids and projected group ids both land here.
    const group = await this.prisma.group.findUnique({
      where: { id: courseId },
      include: { _count: { select: { enrollments: true } } },
    }).catch(() => null);
    if (group) {
      if (!group.active) throw new BadRequestException('Group is archived');
      if (group._count.enrollments >= group.capacity) {
        throw new BadRequestException(`Group is full (${group.capacity}). Join the waitlist instead.`);
      }
      const student = await this.prisma.student.findUnique({ where: { id: studentId } });
      if (!student) throw new NotFoundException(`Student ${studentId} not found`);
      return this.prisma.groupEnrollment.upsert({
        where: { groupId_studentId: { groupId: courseId, studentId } },
        update: { status: 'active' },
        create: { groupId: courseId, studentId, status: 'active' },
        include: { student: true },
      });
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    if (course._count.enrollments >= course.capacity) {
      throw new BadRequestException(`Course capacity of ${course.capacity} dancers has been reached.`);
    }

    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: {
        courseId_studentId: { courseId, studentId },
      },
      update: { status: 'active' },
      create: {
        courseId,
        studentId,
        status: 'active',
      },
      include: {
        student: true,
        course: true,
      },
    });

    // Reverse dual-write: legacy course enrollments mirror onto the group.
    if (course.groupId) {
      await this.prisma.groupEnrollment.upsert({
        where: { groupId_studentId: { groupId: course.groupId, studentId } },
        update: { status: 'active' },
        create: { groupId: course.groupId, studentId, status: 'active' },
      }).catch(() => null);
    }

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'Student Enrolled',
        actor: 'Registrar',
        details: `Enrolled ${student.name} into ${course.title}`,
        category: 'crm',
      },
    });

    return enrollment;
  }

  async unenrollStudent(courseId: string, studentId: string) {
    // Group ids route to group enrollments; legacy courses clear both sides.
    const group = await this.prisma.group.findUnique({ where: { id: courseId } }).catch(() => null);
    if (group) {
      await this.prisma.groupEnrollment.deleteMany({ where: { groupId: courseId, studentId } });
      await this.promoteGroupEntry(courseId).catch(() => null);
      return { success: true, message: 'Student removed from group.' };
    }
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { groupId: true } }).catch(() => null);
    await this.prisma.courseEnrollment.deleteMany({
      where: { courseId, studentId },
    });
    if (course?.groupId) {
      await this.prisma.groupEnrollment.deleteMany({ where: { groupId: course.groupId, studentId } });
      await this.promoteGroupEntry(course.groupId).catch(() => null);
    }
    return { success: true, message: 'Student removed from course.' };
  }

  /** Oldest-pending group waitlist promotion (shared by group + legacy paths). */
  private async promoteGroupEntry(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { enrollments: true } } },
    }).catch(() => null);
    if (!group || group._count.enrollments >= group.capacity) return;
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { groupId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: { student: true },
    }).catch(() => null);
    if (!entry) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.groupEnrollment.upsert({
        where: { groupId_studentId: { groupId, studentId: entry.studentId } },
        update: { status: 'active' },
        create: { groupId, studentId: entry.studentId, status: 'active' },
      });
      await tx.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'promoted' } });
    });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Waitlist Promoted', actor: 'Auto-promote', details: `${entry.student.name} → ${group.title}`, category: 'crm' },
    }).catch(() => null);
    if (this.push && entry.student.familyId) {
      this.push.notifyFamily(entry.student.familyId, {
        title: `Seat available — ${group.title}`,
        body: `${entry.student.name} was promoted from the waitlist.`,
        url: '/',
        tag: `gwaitlist-${entry.id}`,
      }).catch(() => null);
    }
  }

  // --------------------------------------------------------------------------
  // WAITLIST (course + session queues with capacity-guarded promotion)
  // --------------------------------------------------------------------------

  async joinWaitlist(
    courseId: string,
    studentId: string,
    sessionId?: string,
    actor?: { role?: string; familyId?: string; studentId?: string },
  ) {
    // Projected group ids land here from the new UI — route to group entries.
    const groupHit = await this.prisma.group.findUnique({ where: { id: courseId } }).catch(() => null);
    if (groupHit) {
      if (!groupHit.active) throw new BadRequestException('Group is archived');
      const student = await this.prisma.student.findUnique({ where: { id: studentId } });
      if (!student) throw new NotFoundException(`Student ${studentId} not found`);
      if (actor?.role === 'family' && student.familyId !== actor.familyId) {
        throw new BadRequestException('You may only waitlist your own dancers');
      }
      if (actor?.role === 'student' && student.id !== actor.studentId) {
        throw new BadRequestException('You may only waitlist yourself');
      }
      const enrolled = await this.prisma.groupEnrollment.findUnique({
        where: { groupId_studentId: { groupId: courseId, studentId } },
      }).catch(() => null);
      if (enrolled?.status === 'active') throw new BadRequestException('Dancer is already enrolled');
      const dup = await this.prisma.waitlistEntry.findFirst({ where: { groupId: courseId, studentId, status: 'pending' } });
      if (dup) throw new BadRequestException('Already on the waitlist');
      const entry = await this.prisma.waitlistEntry.create({ data: { groupId: courseId, studentId, status: 'pending' } });
      const position = await this.prisma.waitlistEntry.count({
        where: { groupId: courseId, status: 'pending', createdAt: { lte: entry.createdAt } },
      });
      return { ...entry, position };
    }
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    if (actor?.role === 'family' && student.familyId !== actor.familyId) {
      throw new BadRequestException('You may only waitlist your own dancers');
    }
    if (actor?.role === 'student' && student.id !== actor.studentId) {
      throw new BadRequestException('You may only waitlist yourself');
    }
    if (sessionId) {
      const session = await this.prisma.courseSession.findUnique({ where: { id: sessionId } });
      if (!session || session.courseId !== courseId) throw new BadRequestException('Session does not belong to this course');
    }
    const alreadyEnrolled = await this.prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    }).catch(() => null);
    if (alreadyEnrolled?.status === 'active') throw new BadRequestException('Dancer is already enrolled');
    const dup = await this.prisma.waitlistEntry.findFirst({
      where: { courseId, sessionId: sessionId || null, studentId, status: 'pending' },
    });
    if (dup) throw new BadRequestException('Already on the waitlist');
    const entry = await this.prisma.waitlistEntry.create({
      data: { courseId, sessionId: sessionId || null, studentId, status: 'pending' },
      include: { student: { select: { id: true, name: true } } },
    });
    const position = await this.prisma.waitlistEntry.count({
      where: { courseId, sessionId: sessionId || null, status: 'pending', createdAt: { lte: entry.createdAt } },
    });
    return { ...entry, position };
  }

  async listWaitlist(courseId?: string, status = 'pending') {
    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;
    if (status !== 'all') where.status = status;
    return this.prisma.waitlistEntry.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, barcode: true, level: true } },
        course: { select: { id: true, code: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async cancelWaitlist(entryId: string) {
    const entry = await this.prisma.waitlistEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    if (entry.status !== 'pending') throw new BadRequestException(`Entry is ${entry.status}`);
    return this.prisma.waitlistEntry.update({ where: { id: entryId }, data: { status: 'cancelled' } });
  }

  /**
   * Promote the oldest pending entry to a real enrollment. Respects the course
   * capacity hard gate — returns skipped:true when the room is still full.
   */
  async promoteNext(courseId: string, entryId?: string, actorName = 'Registrar') {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);
    if (course._count.enrollments >= course.capacity) {
      return { promoted: false as const, skipped: true as const, reason: 'Course still at capacity' };
    }
    const entry = entryId
      ? await this.prisma.waitlistEntry.findUnique({ where: { id: entryId }, include: { student: true } })
      : await this.prisma.waitlistEntry.findFirst({
          where: { courseId, status: 'pending' },
          orderBy: { createdAt: 'asc' },
          include: { student: true },
        });
    if (!entry || entry.status !== 'pending') throw new NotFoundException('No pending waitlist entry');
    await this.prisma.courseEnrollment.upsert({
      where: { courseId_studentId: { courseId, studentId: entry.studentId } },
      update: { status: 'active' },
      create: { courseId, studentId: entry.studentId, status: 'active' },
    });
    const updated = await this.prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'promoted' } });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Waitlist Promoted', actor: actorName, details: `${entry.student.name} → ${course.title}`, category: 'crm' },
    }).catch(() => null);
    if (this.push && entry.student.familyId) {
      this.push.notifyFamily(entry.student.familyId, {
        title: `Seat available — ${course.title}`,
        titleAr: `مقعد متاح — ${course.title}`,
        body: `${entry.student.name} was promoted from the waitlist. See you at the barre!`,
        url: '/',
        tag: `waitlist-${entry.id}`,
      }).catch(() => null);
    }
    return { promoted: true as const, skipped: false as const, entry: updated };
  }

  // --------------------------------------------------------------------------
  // SESSIONS SCHEDULING
  // --------------------------------------------------------------------------
  async getSessions(
    courseId?: string,
    instructorId?: string,
    viewer?: ScheduleViewer | null,
    query?: { page?: string | number; limit?: string | number; branchCode?: string },
  ) {
    const and: any[] = [];
    // Callers pass projected ids (groups) or legacy course ids — match both.
    if (courseId) and.push({ OR: [{ courseId }, { groupId: courseId }] });
    if (instructorId) and.push({ instructorId });
    if (query?.branchCode) {
      and.push({ OR: [{ course: { branchCode: query.branchCode } }, { group: { branchCode: query.branchCode } }] });
    }
    const where: any = and.length > 0 ? { AND: and } : {};
    const { skip, take } = parsePagination(query ?? {}, 100, 500);

    const sessions = await this.prisma.courseSession.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            titleAr: true,
            program: true,
            level: true,
            _count: { select: { enrollments: true } },
          },
        },
        group: {
          select: {
            id: true,
            code: true,
            title: true,
            titleAr: true,
            level: true,
            branchCode: true,
            category: { select: { key: true } },
            _count: { select: { enrollments: true } },
          },
        },
        instructor: {
          select: this.staffSelect(viewer),
        },
      },
      orderBy: { sessionDate: 'asc' },
      skip,
      take,
    });
    return sessions.map((s: any) => ({ ...s, course: sessionCourseOf(s) }));
  }

  async createSession(dto: CreateSessionDto) {
    // Accept a group id in courseId clothing (projected ids from the new UI).
    const group = await this.prisma.group.findUnique({ where: { id: dto.courseId } }).catch(() => null);
    if (group) {
      if (!group.active) throw new BadRequestException('Group is archived');
      return this.prisma.courseSession.create({
        data: {
          courseId: null,
          groupId: group.id,
          title: dto.title,
          sessionDate: new Date(dto.sessionDate),
          startTime: dto.startTime,
          endTime: dto.endTime,
          studioRoom: dto.studioRoom || 'Grand Studio Petipa',
          instructorId: dto.instructorId || group.instructorId,
          notes: dto.notes,
          status: 'scheduled',
        },
        include: { course: true, instructor: true },
      });
    }
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException(`Course ${dto.courseId} not found`);

    const session = await this.prisma.courseSession.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        sessionDate: new Date(dto.sessionDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        studioRoom: dto.studioRoom || course.studioRoom || 'Grand Studio Petipa',
        instructorId: dto.instructorId || course.instructorId,
        capacity: dto.capacity && dto.capacity > 0 ? Math.floor(dto.capacity) : null,
        notes: dto.notes,
        status: 'scheduled',
      },
      include: {
        course: true,
        instructor: true,
      },
    });

    return session;
  }

  async updateSession(sessionId: string, data: any) {
    const session = await this.prisma.courseSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (data.capacity !== undefined && data.capacity !== null) {
      const cap = Math.floor(Number(data.capacity));
      if (!Number.isFinite(cap) || cap < 1) throw new BadRequestException('capacity must be a positive integer');
      data.capacity = cap;
    }

    return this.prisma.courseSession.update({
      where: { id: sessionId },
      data: {
        ...data,
        sessionDate: data.sessionDate ? new Date(data.sessionDate) : undefined,
      },
      include: {
        course: true,
        instructor: true,
      },
    });
  }

  async deleteSession(sessionId: string) {
    const session = await this.prisma.courseSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    await this.prisma.courseSession.delete({ where: { id: sessionId } });
    return { success: true, message: 'Session deleted successfully.' };
  }

  // --------------------------------------------------------------------------
  // SELF CHECK-IN QR (instructor displays, family scans + confirms)
  // --------------------------------------------------------------------------

  /** Staff QR payload: returns existing live token or mints one (valid to session end +2h). */
  async getSessionCheckinQr(sessionId: string, actor?: { id?: string; role?: string }) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        course: { select: { code: true, title: true } },
        group: { select: { code: true, title: true, instructorId: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (actor?.role === 'instructor') {
      const leads = session.instructorId === actor.id || (session.group as { instructorId?: string } | null)?.instructorId === actor.id;
      if (!leads) throw new BadRequestException('You may only share check-in for sessions you lead');
    }
    const now = new Date();
    if (session.checkinToken && session.checkinTokenExpiresAt && session.checkinTokenExpiresAt > now) {
      return this.checkinQrPayload(session, session.checkinToken, session.checkinTokenExpiresAt);
    }
    const end = new Date(session.sessionDate);
    const m = (session.endTime || '').match(/^(\d{1,2}):(\d{2})/);
    if (m) end.setHours(Number(m[1]), Number(m[2]), 0, 0);
    else end.setHours(23, 59, 59, 999);
    const expiresAt = new Date(end.getTime() + 2 * 60 * 60 * 1000);
    const token = randomBytes(24).toString('hex');
    const updated = await this.prisma.courseSession.update({
      where: { id: sessionId },
      data: { checkinToken: token, checkinTokenExpiresAt: expiresAt },
    });
    return this.checkinQrPayload(updated, token, expiresAt);
  }

  private async checkinQrPayload(session: { id: string; course?: { code?: string; title?: string } | null; group?: { code?: string; title?: string } | null }, token: string, expiresAt: Date) {
    const base =
      process.env.PAYLINK_PORTAL_URL ||
      (process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}` : null) ||
      'http://localhost:5173';
    const url = `${base.replace(/\/$/, '')}/?checkin=${token}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 360, margin: 1 });
    return {
      token,
      url,
      qrDataUrl,
      expiresAt: expiresAt.toISOString(),
      label: `${(session as any).course?.code || (session as any).group?.code || ''} ${(session as any).course?.title || (session as any).group?.title || ''}`.trim(),
    };
  }

  /** Public resolve: what the scanner sees before signing in. No PII. */
  async resolveCheckinToken(token: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { checkinToken: (token || '').trim() },
      include: {
        course: { select: { code: true, title: true, titleAr: true } },
        group: { select: { code: true, title: true, titleAr: true } },
        instructor: { select: { name: true } },
      },
    });
    if (!session || !session.checkinTokenExpiresAt || session.checkinTokenExpiresAt < new Date()) {
      throw new NotFoundException('Check-in link expired or invalid');
    }
    if (session.status === 'cancelled') throw new BadRequestException('Session was cancelled');
    return {
      valid: true,
      title: session.group?.title || session.course?.title || session.title,
      code: session.group?.code || session.course?.code || null,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      studioRoom: session.studioRoom,
      instructorName: session.instructor?.name || null,
      expiresAt: session.checkinTokenExpiresAt,
    };
  }

  // --------------------------------------------------------------------------
  // DYNAMIC REMINDER SETTINGS & DISPATCH
  // --------------------------------------------------------------------------
  async getReminderConfig() {
    let config = await this.prisma.whatsAppReminderConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await this.prisma.whatsAppReminderConfig.create({
        data: {
          id: 'default',
          enabled: true,
          sendMinutesBefore: 60,
          studentTemplateEn:
            'Bonjour {studentName}! Reminder for your upcoming {courseTitle} ballet class today at {time} in {studio} with {instructorName}. Please arrive 10 mins early.',
          studentTemplateAr:
            'مرحباً {studentName}! نذكركم بموعد حصة {courseTitle} اليوم الساعة {time} في قاعة {studio} مع المدرب/ة {instructorName}. يرجى الحضور قبل الموعد بـ 10 دقائق.',
          instructorTemplateEn:
            'Bonjour {instructorName}! You have a scheduled {courseTitle} session today at {time} in {studio}. Enrolled dancers: {enrolledCount}.',
          instructorTemplateAr:
            'تحية طيبة {instructorName}! نذكركم بجدول حصتكم التدريبية {courseTitle} اليوم الساعة {time} في قاعة {studio}. عدد الطلاب المسجلين: {enrolledCount}.',
          autoCron: true,
        },
      });
    }

    return config;
  }

  async updateReminderConfig(dto: UpdateReminderConfigDto) {
    return this.prisma.whatsAppReminderConfig.upsert({
      where: { id: 'default' },
      update: dto,
      create: {
        id: 'default',
        ...dto,
      },
    });
  }

  async sendSessionReminders(sessionId: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        course: {
          include: {
            enrollments: {
              include: {
                student: true,
              },
            },
          },
        },
        group: {
          include: {
            category: { select: { key: true } },
            instructor: true,
            enrollments: { where: { status: 'active' }, include: { student: true } },
          },
        },
        instructor: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const roster = session.groupId
      ? (session.group?.enrollments || []).map((e: any) => e.student)
      : (session.course?.enrollments || []).map((e: any) => e.student);
    const courseTitle = session.group?.title || session.course?.title || session.title;
    const instructorName =
      session.instructor?.name || session.group?.instructor?.name || 'Faculty Director';
    const config = await this.getReminderConfig();
    const timeStr = `${session.startTime} - ${session.endTime}`;
    const studioStr = session.studioRoom;
    let dispatchedCount = 0;

    // 1. Dispatch to all enrolled students / parents
    for (const student of roster) {
      const bodyEn = config.studentTemplateEn
        .replace('{studentName}', student.name)
        .replace('{parentName}', student.parentName)
        .replace('{courseTitle}', courseTitle)
        .replace('{instructorName}', instructorName)
        .replace('{time}', timeStr)
        .replace('{studio}', studioStr)
        .replace('{minutes}', String(config.sendMinutesBefore));

      await this.openWaService.dispatchMessage({
        recipientPhone: student.parentPhone,
        recipientName: `${student.name} (${student.parentName})`,
        triggerEvent: 'class_reminder',
        language: 'en',
        customBody: bodyEn,
      });
      dispatchedCount++;
      // Native lock-screen twin of the WhatsApp reminder (best-effort).
      if (this.push && student.familyId) {
        this.push.notifyFamily(student.familyId, {
          title: `${courseTitle} at ${timeStr}`,
          titleAr: `${courseTitle} الساعة ${timeStr}`,
          body: `${student.name} · ${studioStr} with ${instructorName}. Arrive 10 mins early.`,
          url: '/',
          tag: `reminder-${sessionId}`,
        }).catch(() => null);
      }
    }

    // 2. Dispatch to assigned instructor
    const instructorPhone = (session.instructor as any)?.phone;
    if (session.instructor && instructorPhone) {
      const instructorBody = config.instructorTemplateEn
        .replace('{instructorName}', session.instructor.name)
        .replace('{courseTitle}', courseTitle)
        .replace('{time}', timeStr)
        .replace('{studio}', studioStr)
        .replace('{enrolledCount}', String(roster.length))
        .replace('{minutes}', String(config.sendMinutesBefore));

      await this.openWaService.dispatchMessage({
        recipientPhone: instructorPhone,
        recipientName: session.instructor.name,
        triggerEvent: 'class_reminder',
        language: 'en',
        customBody: instructorBody,
      });
      dispatchedCount++;
    }

    // Mark session as reminder sent
    await this.prisma.courseSession.update({
      where: { id: sessionId },
      data: { reminderSent: true },
    });

    return {
      success: true,
      sessionId,
      messagesDispatched: dispatchedCount,
      dispatchedCount,
    };
  }

  async broadcastCourseMessage(courseId: string, message: string) {
    if (!message || !message.trim()) {
      throw new BadRequestException('Announcement message cannot be empty');
    }

    // Resolve a legacy course id or a projected group id alike.
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          include: {
            student: true,
          },
        },
      },
    });

    let title = course?.title;
    let roster: any[] = (course?.enrollments || []).map((e: any) => e.student);
    if (!course) {
      const group = await this.prisma.group.findUnique({
        where: { id: courseId },
        include: { enrollments: { where: { status: 'active' }, include: { student: true } } },
      });
      if (!group) throw new NotFoundException(`Course ${courseId} not found`);
      title = group.title;
      roster = group.enrollments.map((e) => e.student);
    }

    let dispatchedCount = 0;
    const dispatched: string[] = [];

    for (const student of roster) {
      if (student && student.parentPhone) {
        await this.openWaService.dispatchMessage({
          recipientPhone: student.parentPhone,
          recipientName: `${student.name} (${student.parentName})`,
          triggerEvent: 'class_reminder',
          language: 'en',
          customBody: message.trim(),
        });
        dispatchedCount++;
        dispatched.push(student.name);
        if (this.push && student.familyId) {
          this.push.notifyFamily(student.familyId, {
            title: title || 'Academy announcement',
            body: message.trim().slice(0, 160),
            url: '/',
            tag: `broadcast-${courseId}`,
          }).catch(() => null);
        }
      }
    }

    return {
      success: true,
      courseId,
      courseTitle: title,
      messagesDispatched: dispatchedCount,
      dispatched,
    };
  }


  /**
   * Combine a session's calendar date with its HH:MM start time.
   * Falls back to start-of-day when no start time is stored.
   */
  private sessionStartAt(session: { sessionDate: Date; startTime?: string | null }): Date {
    const at = new Date(session.sessionDate);
    const match = (session.startTime || '').match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      at.setHours(Number(match[1]), Number(match[2]), 0, 0);
    } else {
      at.setHours(0, 0, 0, 0);
    }
    return at;
  }

  async checkAndSendAutomatedReminders() {
    const config = await this.getReminderConfig();
    if (!config.enabled || !config.autoCron) return;

    const now = new Date();
    const windowMin = new Date(now.getTime() - 15 * 60000);
    const windowMax = new Date(now.getTime() + (config.sendMinutesBefore + 15) * 60000);

    // Candidate pool is intentionally date-wide; the precise due check below
    // uses the session's real start datetime (date + startTime), because
    // sessionDate alone is stored at day granularity.
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const candidates = await this.prisma.courseSession.findMany({
      where: {
        reminderSent: false,
        status: 'scheduled',
        sessionDate: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true, sessionDate: true, startTime: true },
    });

    for (const session of candidates) {
      const startsAt = this.sessionStartAt(session);
      if (startsAt < windowMin || startsAt > windowMax) continue;

      // Transactional claim: exactly one scheduler instance (or manual run)
      // wins the send. Manual POST /send-reminder always sends on purpose.
      const claimed = await this.prisma.courseSession.updateMany({
        where: { id: session.id, reminderSent: false },
        data: { reminderSent: true },
      });
      if (claimed.count === 0) continue;

      try {
        await this.sendSessionReminders(session.id);
      } catch (err) {
        // Release the claim so a later cycle retries instead of dropping it.
        await this.prisma.courseSession.update({
          where: { id: session.id },
          data: { reminderSent: false },
        });
        throw err;
      }
    }
  }

  // --------------------------------------------------------------------------
  // PERSONALIZED SCHEDULES (STUDENTS & INSTRUCTORS)
  // --------------------------------------------------------------------------
  async getStudentSchedule(studentIdentifier: string, viewer?: ScheduleViewer | null) {
    const cleanId = studentIdentifier.trim();

    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { id: { equals: cleanId, mode: 'insensitive' } },
          { barcode: { equals: cleanId, mode: 'insensitive' } },
        ],
      },
      include: {
        family: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        courseEnrollments: {
          include: {
            course: {
              include: {
                instructor: {
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    department: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        groupEnrollments: {
          where: { status: 'active' },
          include: {
            group: {
              include: {
                category: true,
                instructor: {
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    department: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student ${studentIdentifier} not found.`);
    }

    const enrolledCourses = student.courseEnrollments.map((e) => e.course);
    const groupCourses = (student as any).groupEnrollments.map((e: any) => groupToCourse({
      ...e.group,
      enrollments: undefined,
      sessions: undefined,
    }));
    const allEnrolled = [...groupCourses, ...enrolledCourses];
    const enrolledCourseIds = enrolledCourses.map((c) => c.id);
    const enrolledGroupIds = (student as any).groupEnrollments.map((e: any) => e.groupId);

    // Fetch upcoming sessions for only the courses/groups this student is in.
    const sessionOr: any[] = [
      ...(enrolledCourseIds.length > 0 ? [{ courseId: { in: enrolledCourseIds } }] : []),
      ...(enrolledGroupIds.length > 0 ? [{ groupId: { in: enrolledGroupIds } }] : []),
    ];
    const upcomingSessions = sessionOr.length === 0 ? [] : await this.prisma.courseSession.findMany({
      where: {
        OR: sessionOr,
        sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            code: true,
            level: true,
            program: true,
            studioRoom: true,
          },
        },
        group: {
          select: {
            id: true,
            code: true,
            title: true,
            titleAr: true,
            level: true,
            branchCode: true,
            category: { select: { key: true } },
          },
        },
        instructor: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            avatarUrl: true,
            department: true,
          },
        },
      },
      orderBy: { sessionDate: 'asc' },
    });

    const activeSub = student.subscriptions[0] || null;

    return {
      student: {
        id: student.id,
        name: student.name,
        nameAr: student.nameAr,
        barcode: student.barcode,
        level: student.level,
        parentName: student.parentName,
        // Household contact is only served to signed-in viewers — anonymous
        // schedule lookups (barcode in URL) must not be a phone directory.
        ...(viewer ? { parentPhone: student.parentPhone } : {}),
        avatarUrl: student.photoUrl,
      },
      subscription: activeSub
        ? {
            id: activeSub.id,
            planName: activeSub.planName,
            planNameAr: activeSub.planNameAr,
            totalSessions: activeSub.maxSessions,
            remainingSessions: Math.max(0, activeSub.maxSessions - activeSub.usedSessions),
            usedSessions: activeSub.usedSessions,
            startDate: activeSub.startDate.toISOString().split('T')[0],
            endDate: activeSub.endDate.toISOString().split('T')[0],
            status: activeSub.status,
            daysRemaining: Math.max(
              0,
              Math.ceil(
                (new Date(activeSub.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
              ),
            ),
          }
        : null,
      enrolledCourses: allEnrolled,
      upcomingSessions: upcomingSessions.map((s: any) => ({ ...s, course: sessionCourseOf(s) })),
    };
  }

  async getInstructorSchedule(instructorIdentifier: string, viewer?: ScheduleViewer | null) {
    const cleanId = instructorIdentifier.trim();

    const staff = await this.prisma.staffUser.findFirst({
      where: {
        OR: [
          { id: { equals: cleanId, mode: 'insensitive' } },
          { cardCode: { equals: cleanId, mode: 'insensitive' } },
          { email: { equals: cleanId, mode: 'insensitive' } },
        ],
      },
    });

    if (!staff) {
      throw new NotFoundException(`Instructor ${instructorIdentifier} not found.`);
    }

    // Courses taught by this instructor: led groups (projected) + legacy
    // courses without a group. Shadow rows carry groupId and are excluded to
    // avoid double-listing what the group projection already covers.
    const staffOnly = isStaffViewer(viewer);
    const ledGroups = await this.prisma.group.findMany({
      where: { instructorId: staff.id },
      include: {
        category: true,
        instructor: { select: { id: true, name: true, nameAr: true, department: true, avatarUrl: true, role: true } },
        enrollments: {
          where: { status: 'active' },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                barcode: true,
                level: true,
                ...(staffOnly ? { parentPhone: true } : {}),
                photoUrl: true,
              },
            },
          },
        },
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const assignedCourses = [
      ...ledGroups.map((g) => ({
        ...groupToCourse(g),
        enrollments: (g.enrollments || []).map((e: any) => ({ ...e, courseId: g.id })),
      })),
      ...(await this.prisma.course.findMany({
        where: { instructorId: staff.id, groupId: null },
      include: {
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                barcode: true,
                level: true,
                // Dancer household phones are staff-only even inside rosters.
                ...(staffOnly ? { parentPhone: true } : {}),
                photoUrl: true,
              },
            },
          },
        },
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }))];

    // Scheduled sessions for this instructor (ids cover groups + legacy courses)
    const assignedIds = assignedCourses.map((c) => c.id);
    const rosterSelect = {
      id: true,
      name: true,
      barcode: true,
      level: true,
      ...(staffOnly ? { parentPhone: true } : {}),
      photoUrl: true,
    };
    const weeklySessions = await this.prisma.courseSession.findMany({
      where: {
        OR: [
          { instructorId: staff.id },
          { courseId: { in: assignedIds } },
          { groupId: { in: assignedIds } },
        ],
        sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        course: {
          include: {
            enrollments: { include: { student: { select: rosterSelect } } },
          },
        },
        group: {
          select: {
            id: true,
            code: true,
            title: true,
            titleAr: true,
            level: true,
            branchCode: true,
            category: { select: { key: true } },
          },
        },
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: true,
          },
        },
      },
      orderBy: { sessionDate: 'asc' },
    });

    // Roster: group enrollments when the session belongs to a group.
    const sessionsWithRoster = await Promise.all(
      weeklySessions.map(async (s: any) => {
        const course = sessionCourseOf(s);
        if (s.course?.enrollments?.length) return { ...s, course };
        if (s.groupId) {
          const ge = await this.prisma.groupEnrollment.findMany({
            where: { groupId: s.groupId, status: 'active' },
            include: { student: { select: rosterSelect } },
          });
          return {
            ...s,
            course: { ...course, enrollments: ge.map((e: any) => ({ ...e, courseId: s.groupId })) },
          };
        }
        return { ...s, course };
      }),
    );

    const totalStudentsSet = new Set<string>();
    (assignedCourses as any[]).forEach((c) => {
      c.enrollments?.forEach((e: any) => totalStudentsSet.add(e.studentId));
    });


    return {
      instructor: {
        id: staff.id,
        name: staff.name,
        nameAr: staff.nameAr,
        cardCode: staff.cardCode,
        role: staff.role,
        department: staff.department,
        // Direct contact details only for signed-in viewers.
        ...(viewer ? { email: staff.email, phone: staff.phone } : {}),
        avatarUrl: staff.avatarUrl,
      },
      assignedCourses,
      weeklySessions: sessionsWithRoster,
      totalStudentsCount: totalStudentsSet.size,
    };
  }
}

