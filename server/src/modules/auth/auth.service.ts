import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenWaService } from '../openwa/openwa.service';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { generateTemporaryPassword, secureNumericCode } from '../../common/security.util';
import {
  accessTokenTtlSeconds,
  refreshTokenTtlSeconds,
  generateRefreshToken,
  hashRefreshToken,
} from '../../common/security.util';

/** OTP brute-force policy: lock the code for 15 minutes after 5 wrong attempts. */
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MINUTES = 15;

/** Login brute-force policy: lock the account for 15 minutes after 10 wrong passwords. */
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_LOCK_MINUTES = 15;

async function hashArgon2id(pass: string): Promise<string> {
  return argon2.hash(pass, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    raw: false,
  });
}

/** Verify OTP supporting new Argon2id hashes + legacy plaintext rows (migration). */
async function verifyOtpHash(stored: string, supplied: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith('$argon2')) {
    try {
      return await argon2.verify(stored, supplied);
    } catch {
      return false;
    }
  }
  return stored === supplied;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly openWaService: OpenWaService,
  ) {}


  async validateUser(identifier: string, pass: string) {
    const cleanId = identifier.trim().toLowerCase();
    
    // Find staff strictly by email, unique cardCode, or id
    const staff = await this.prisma.staffUser.findFirst({
      where: {
        OR: [
          { email: { equals: cleanId, mode: 'insensitive' } },
          { cardCode: { equals: cleanId, mode: 'insensitive' } },
          { id: { equals: cleanId, mode: 'insensitive' } },
        ],
      },
    });

    if (!staff) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertLoginNotLocked(staff);

    // Verify Argon2 password hash
    const isMatch = await argon2.verify(staff.passwordHash, pass);
    if (!isMatch) {
      await this.registerFailedLogin('staff', staff.id, staff.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (staff.failedLoginAttempts > 0 || staff.loginLockedUntil) {
      await this.clearLoginAttempts('staff', staff.id);
    }

    const { passwordHash, ...result } = staff;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.identifier, loginDto.password);
    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      ...(await this.issueSessionTokens(payload)),
      user,
    };
  }

  // --------------------------------------------------------------------------
  // SHORT-LIVED ACCESS + ROTATING REFRESH SESSIONS
  // --------------------------------------------------------------------------
  private subjectOf(payload: { sub: string; type?: string; familyId?: string; studentId?: string }) {
    if (payload.type === 'family' || payload.familyId) {
      return { subjectType: 'family', subjectId: payload.familyId || payload.sub };
    }
    if (payload.type === 'student' || payload.studentId) {
      return { subjectType: 'student', subjectId: payload.studentId || payload.sub };
    }
    return { subjectType: 'staff', subjectId: payload.sub };
  }

  /**
   * Mint an access/refresh pair. The access JWT is short-lived; the refresh
   * token is opaque and stored only as a SHA-256 hash (single-use).
   */
  async issueSessionTokens(payload: Record<string, unknown>) {
    const access_token = this.jwtService.sign(payload);
    const refresh_token = generateRefreshToken();
    const { subjectType, subjectId } = this.subjectOf(payload as any);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(refresh_token),
        subjectType,
        subjectId,
        expiresAt: new Date(Date.now() + refreshTokenTtlSeconds() * 1000),
      },
    });
    return { access_token, refresh_token, expires_in: accessTokenTtlSeconds() };
  }

  /** Rebuild a minimal, DB-verified access payload for a refresh subject. */
  private async buildSubjectPayload(subjectType: string, subjectId: string) {
    if (subjectType === 'family') {
      const family = await this.prisma.family.findUnique({ where: { id: subjectId } });
      if (!family) throw new UnauthorizedException('Session subject no longer exists');
      return { sub: family.id, type: 'family', familyId: family.id, parentName: family.parentName };
    }
    if (subjectType === 'student') {
      const student = await this.prisma.student.findUnique({ where: { id: subjectId } });
      if (!student) throw new UnauthorizedException('Session subject no longer exists');
      return {
        sub: student.id,
        type: 'student',
        cardCode: student.barcode,
        studentId: student.id,
        familyId: student.familyId,
        name: student.name,
      };
    }
    const staff = await this.prisma.staffUser.findUnique({ where: { id: subjectId } });
    if (!staff) throw new UnauthorizedException('Session subject no longer exists');
    return { sub: staff.id, email: staff.email, role: staff.role };
  }

  /**
   * Rotate a refresh token: the presented token is revoked and a fresh pair
   * is issued. Re-presenting an already-rotated token indicates theft, so the
   * subject's entire token family is revoked.
   */
  async refreshSession(refreshToken?: string) {
    if (!refreshToken || typeof refreshToken !== 'string' || !refreshToken.trim()) {
      throw new BadRequestException('Refresh token is required');
    }
    const now = new Date();
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken.trim()) },
    });

    if (!record || record.expiresAt <= now) {
      if (record && !record.revokedAt) {
        await this.prisma.refreshToken
          .update({ where: { id: record.id }, data: { revokedAt: now } })
          .catch(() => {});
      }
      throw new UnauthorizedException('Refresh token expired or unknown');
    }

    if (record.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { subjectType: record.subjectType, subjectId: record.subjectId, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException('Refresh token already used');
    }

    const payload = await this.buildSubjectPayload(record.subjectType, record.subjectId);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: now },
    });
    return this.issueSessionTokens(payload);
  }

  /** Revoke one refresh token (idempotent — always 200). */
  async logout(refreshToken?: string) {
    if (refreshToken && typeof refreshToken === 'string' && refreshToken.trim()) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(refreshToken.trim()), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  private sanitizeStaff(staff: any) {
    const { passwordHash, ...rest } = staff;
    return {
      ...rest,
      avatar: rest.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      shiftStatus: rest.shiftActive ? 'on_duty' : 'off_shift',
      studio: rest.department || 'Operations',
      specialization: rest.departmentAr || rest.department || 'Ballet Pedagogy',
      permissions: rest.role === 'superadmin' || rest.role === 'owner' ? ['all'] : [rest.role],
    };
  }

  async getStaffList() {
    const staff = await this.prisma.staffUser.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return staff.map((s) => this.sanitizeStaff(s));
  }

  async getDemoCards() {
    const students = await this.prisma.student.findMany({
      select: {
        id: true,
        name: true,
        nameAr: true,
        barcode: true,
        level: true,
        program: true,
        photoUrl: true,
      },
      take: 6,
    });

    const staff = await this.prisma.staffUser.findMany({
      where: { cardCode: { not: null } },
      select: {
        id: true,
        name: true,
        nameAr: true,
        role: true,
        cardCode: true,
        avatarUrl: true,
        department: true,
      },
      take: 4,
    });

    const studentCards = students.map((s) => ({
      id: s.id,
      name: s.name,
      nameAr: s.nameAr,
      cardCode: s.barcode,
      type: 'student',
      role: 'student',
      subtitle: s.level || s.program || 'Student',
      photoUrl: s.photoUrl,
    }));

    const staffCards = staff.map((st) => ({
      id: st.id,
      name: st.name,
      nameAr: st.nameAr,
      cardCode: st.cardCode,
      type: 'staff',
      role: st.role,
      subtitle: st.department || st.role.charAt(0).toUpperCase() + st.role.slice(1),
      photoUrl: st.avatarUrl,
    }));

    return [...studentCards, ...staffCards];
  }

  async toggleShift(id: string) {
    const staff = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);

    const updated = await this.prisma.staffUser.update({
      where: { id },
      data: { shiftActive: !staff.shiftActive },
    });

    return this.sanitizeStaff(updated);
  }

  async updateRole(id: string, role: string) {
    const allowed = ['superadmin', 'owner', 'receptionist', 'instructor'];
    if (!allowed.includes(role)) {
      throw new BadRequestException(`Invalid role. Allowed: ${allowed.join(', ')}`);
    }
    const updated = await this.prisma.staffUser.update({
      where: { id },
      data: { role },
    });
    return this.sanitizeStaff(updated);
  }

  async updateAvatar(id: string, avatarUrl?: string | null) {
    const staff = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);

    const clean = typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null;
    const updated = await this.prisma.staffUser.update({
      where: { id },
      data: { avatarUrl: clean },
    });
    return this.sanitizeStaff(updated);
  }

  async resetPassword(id: string, newPass: string) {
    if (!newPass || newPass.trim().length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    const staff = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);

    const passwordHash = await hashArgon2id(newPass.trim());
    const updated = await this.prisma.staffUser.update({
      where: { id },
      data: { passwordHash },
    });
    return this.sanitizeStaff(updated);
  }

  async deleteStaff(id: string, requestingUserId?: string) {
    const staff = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);

    if (staff.id === requestingUserId) {
      throw new BadRequestException('Cannot delete your own active session account');
    }

    if (staff.role === 'superadmin') {
      const superadminCount = await this.prisma.staffUser.count({ where: { role: 'superadmin' } });
      if (superadminCount <= 1) {
        throw new BadRequestException('Cannot delete the last remaining Superadmin account');
      }
    }

    await this.prisma.staffUser.delete({ where: { id } });
    return { success: true, message: `Staff user ${staff.name} deleted successfully.` };
  }

  async createStaff(data: {
    name: string;
    nameAr?: string;
    email: string;
    role: string;
    department?: string;
    departmentAr?: string;
    password?: string;
    avatarUrl?: string;
  }) {
    const allowed = ['superadmin', 'owner', 'receptionist', 'instructor'];
    if (data.role && !allowed.includes(data.role)) {
      throw new BadRequestException(`Invalid role. Allowed: ${allowed.join(', ')}`);
    }
    const existing = await this.prisma.staffUser.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (existing) throw new BadRequestException(`Email ${data.email} already registered`);

    const password = data.password || 'etoile2026';
    if (password.trim().length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    const passwordHash = await hashArgon2id(password);

    const created = await this.prisma.staffUser.create({
      data: {
        name: data.name.trim(),
        nameAr: data.nameAr?.trim(),
        email: data.email.trim().toLowerCase(),
        role: data.role || 'receptionist',
        department: data.department || 'Operations',
        departmentAr: data.departmentAr || 'العمليات',
        avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        passwordHash,
        shiftActive: true,
      },
    });

    return this.sanitizeStaff(created);
  }

  // --------------------------------------------------------------------------
  // FAMILY & STUDENT PORTAL DATA ACCESS
  // --------------------------------------------------------------------------
  async getFamilyProfile(familyId: string) {
    let family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        students: {
          include: {
            subscriptions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            attendanceLogs: {
              orderBy: { timestamp: 'desc' },
              take: 10,
            },
            evaluations: {
              orderBy: { date: 'desc' },
              take: 5,
            },
            courseEnrollments: {
              include: {
                course: {
                  include: {
                    instructor: true,
                    sessions: {
                      where: { sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                      orderBy: { sessionDate: 'asc' },
                      take: 5,
                      include: { instructor: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!family) {
      // Fallback: familyId might be a studentId
      const student = await this.prisma.student.findUnique({
        where: { id: familyId },
        select: { familyId: true },
      });
      if (student?.familyId) {
        family = await this.prisma.family.findUnique({
          where: { id: student.familyId },
          include: {
            students: {
              include: {
                subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
                attendanceLogs: { orderBy: { timestamp: 'desc' }, take: 10 },
                evaluations: { orderBy: { date: 'desc' }, take: 5 },
                courseEnrollments: {
                  include: {
                    course: {
                      include: {
                        instructor: true,
                        sessions: {
                          where: { sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                          orderBy: { sessionDate: 'asc' },
                          take: 5,
                          include: { instructor: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }
    }

    if (!family) {
      throw new NotFoundException(`Family profile ${familyId} not found`);
    }

    const formattedStudents = family.students.map((s) => ({
      ...s,
      subscription: s.subscriptions[0]
        ? {
            ...s.subscriptions[0],
            startDate: s.subscriptions[0].startDate.toISOString().split('T')[0],
            endDate: s.subscriptions[0].endDate.toISOString().split('T')[0],
          }
        : null,
      courses: s.courseEnrollments?.map((e) => e.course) || [],
    }));

    return {
      familyId: family.id,
      parentName: family.parentName,
      family: {
        id: family.id,
        parentName: family.parentName,
        parentPhone: family.parentPhone,
        parentEmail: family.parentEmail,
      },
      students: formattedStudents,
    };
  }

  /**
   * Household onboarding checklist — derived from live data.
   * Powers the portal "Getting started" card.
   */
  async getOnboarding(familyId: string) {
    let family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: { students: { select: { id: true, parentPhone: true } } },
    });
    if (!family) {
      const student = await this.prisma.student.findUnique({
        where: { id: familyId },
        select: { familyId: true },
      });
      if (student?.familyId) {
        family = await this.prisma.family.findUnique({
          where: { id: student.familyId },
          include: { students: { select: { id: true, parentPhone: true } } },
        });
      }
    }
    if (!family) throw new NotFoundException(`Family profile ${familyId} not found`);
    const studentIds = family.students.map((s) => s.id);
    const phones = new Set(
      [family.parentPhone, ...family.students.map((s) => s.parentPhone)].filter(Boolean).map((p) => p.slice(-8)),
    );
    const [payments, checkins, docs, trialLeads] = await Promise.all([
      studentIds.length > 0
        ? this.prisma.paymentTransaction.count({ where: { studentId: { in: studentIds } } }).catch(() => 0)
        : 0,
      studentIds.length > 0
        ? this.prisma.attendanceRecord.count({ where: { studentId: { in: studentIds }, status: 'granted' } }).catch(() => 0)
        : 0,
      studentIds.length > 0
        ? this.prisma.studentDocument.count({ where: { studentId: { in: studentIds } } }).catch(() => 0)
        : 0,
      phones.size > 0
        ? this.prisma.admissionLead.count({
            where: {
              OR: Array.from(phones).map((ending) => ({ parentPhone: { contains: ending } })),
              stage: { in: ['trial_scheduled', 'audition_scheduled', 'evaluated', 'audition_passed', 'enrolled'] },
            },
          }).catch(() => 0)
        : 0,
    ]);
    const steps = [
      { id: 'trial', done: trialLeads > 0 },
      { id: 'payment', done: payments > 0 },
      { id: 'checkin', done: checkins > 0 },
      { id: 'documents', done: docs > 0 },
    ];
    return { steps, done: steps.filter((s) => s.done).length, total: steps.length };
  }

  /**
   * GDPR-style data export: everything the academy holds about a household in
   * one JSON bundle. Secrets (hashes, OTPs) are stripped; document file bytes
   * are referenced by id (download individually) to keep the bundle portable.
   */
  async exportFamilyData(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        students: {
          include: {
            subscriptions: { orderBy: { createdAt: 'desc' } },
            attendanceLogs: { orderBy: { timestamp: 'desc' }, take: 500 },
            notes: { orderBy: { createdAt: 'desc' } },
            evaluations: { orderBy: { date: 'desc' } },
            certificates: { orderBy: { createdAt: 'desc' } },
            courseEnrollments: { include: { course: { select: { id: true, code: true, title: true } } } },
            payments: { orderBy: { date: 'desc' }, take: 200 },
          },
        },
        invoices: { include: { items: true, payments: true }, orderBy: { issueDate: 'desc' } },
      },
    });
    if (!family) throw new NotFoundException(`Family profile ${familyId} not found`);
    const stripSecrets = (s: Record<string, unknown>) => {
      const { passwordHash, otpCode, otpExpiresAt, otpAttempts, otpLockedUntil, failedLoginAttempts, loginLockedUntil, ...safe } = s;
      void passwordHash; void otpCode; void otpExpiresAt; void otpAttempts; void otpLockedUntil; void failedLoginAttempts; void loginLockedUntil;
      return safe;
    };
    const phones = [family.parentPhone, ...family.students.map((s) => s.parentPhone)];
    const [documents, referrals, leads] = await Promise.all([
      this.prisma.studentDocument.findMany({
        where: { studentId: { in: family.students.map((s) => s.id) } },
        select: { id: true, studentId: true, kind: true, fileName: true, mimeType: true, size: true, uploadedBy: true, createdAt: true },
      }).catch(() => []),
      this.prisma.referral.findMany({ where: { referrerFamilyId: familyId }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      this.prisma.admissionLead.findMany({
        where: { OR: phones.filter(Boolean).map((p) => ({ parentPhone: { contains: p.slice(-8) } })) },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);
    const { pinHash, ...safeFamily } = family as unknown as Record<string, unknown> & { pinHash?: string };
    void pinHash;
    return {
      exportedAt: new Date().toISOString(),
      family: safeFamily,
      students: family.students.map((s) => stripSecrets(s as unknown as Record<string, unknown>)),
      invoices: family.invoices,
      documents,
      referrals,
      admissionLeads: leads,
      notice: 'Document file bytes are excluded — download each file from Documents. Secrets and OTPs are never exported.',
    };
  }

  // --------------------------------------------------------------------------
  // RIGHT TO ERASURE (request → 7-day grace → anonymized purge)
  // Financial ledger rows are NEVER deleted (bookkeeping duty); all PII on
  // them is scrubbed instead. Everything else personal is hard-deleted.
  // --------------------------------------------------------------------------

  async requestDeletion(familyId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException(`Family profile ${familyId} not found`);
    const existing = await this.prisma.deletionRequest.findUnique({ where: { familyId } }).catch(() => null);
    if (existing && existing.status === 'pending') return existing;
    const req = await this.prisma.deletionRequest.upsert({
      where: { familyId },
      update: { status: 'pending', requestedAt: new Date(), scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), doneAt: null },
      create: { familyId, status: 'pending', scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    await this.prisma.crmAuditEntry.create({
      data: { action: 'Deletion Requested', actor: familyId, details: `Erasure scheduled for ${req.scheduledAt.toISOString()}`, category: 'auth' },
    }).catch(() => null);
    return req;
  }

  async cancelDeletion(familyId: string) {
    const existing = await this.prisma.deletionRequest.findUnique({ where: { familyId } }).catch(() => null);
    if (!existing || existing.status !== 'pending') throw new BadRequestException('No pending deletion request');
    return this.prisma.deletionRequest.update({ where: { familyId }, data: { status: 'cancelled' } });
  }

  async deletionStatus(familyId: string) {
    const existing = await this.prisma.deletionRequest.findUnique({ where: { familyId } }).catch(() => null);
    return existing || { status: 'none' };
  }

  async purgeDueDeletions(): Promise<{ purged: number }> {
    const due = await this.prisma.deletionRequest.findMany({
      where: { status: 'pending', scheduledAt: { lte: new Date() } },
      take: 20,
    }).catch(() => []);
    let purged = 0;
    for (const req of due) {
      try {
        const family = await this.prisma.family.findUnique({
          where: { id: req.familyId },
          include: { students: { select: { id: true, parentPhone: true } } },
        }).catch(() => null);
        if (!family) {
          await this.prisma.deletionRequest.update({ where: { id: req.id }, data: { status: 'done', doneAt: new Date() } });
          purged += 1;
          continue;
        }
        const studentIds = family.students.map((s) => s.id);
        const phones = [family.parentPhone, ...family.students.map((s) => s.parentPhone)].filter(Boolean);
        await this.prisma.$transaction(async (tx) => {
          // Scrub household identity (ledger rows keep anonymized amounts).
          await tx.family.update({
            where: { id: family.id },
            data: { parentName: 'Deleted family', parentPhone: 'deleted', parentEmail: 'deleted@erased.local', pinHash: null },
          });
          if (studentIds.length > 0) {
            await tx.student.updateMany({
              where: { id: { in: studentIds } },
              data: {
                name: 'Former dancer', nameAr: 'راقص سابق',
                parentName: 'Deleted family', parentPhone: 'deleted', parentEmail: 'deleted@erased.local',
                photoUrl: '', passwordHash: null, isFirstLogin: true,
                otpCode: null, otpExpiresAt: null, walletBalance: 0,
              },
            });
            await tx.attendanceRecord.updateMany({ where: { studentId: { in: studentIds } }, data: { studentName: 'Former dancer' } });
            // Hard-delete personal content.
            await tx.studentNote.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.skillEvaluation.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.studentDocument.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.certificate.deleteMany({ where: { studentId: { in: studentIds } } });
          }
          await tx.pushSubscription.deleteMany({ where: { familyId: family.id } });
          await tx.refreshToken.deleteMany({ where: { subjectType: 'family', subjectId: family.id } });
          await tx.referral.deleteMany({ where: { referrerFamilyId: family.id } });
          if (phones.length > 0) {
            await tx.admissionLead.deleteMany({ where: { OR: phones.map((p) => ({ parentPhone: { contains: p.slice(-8) } })) } });
          }
          await tx.deletionRequest.update({ where: { id: req.id }, data: { status: 'done', doneAt: new Date() } });
        });
        await this.prisma.crmAuditEntry.create({
          data: { action: 'Erasure Completed', actor: 'system', details: `Household ${family.id} anonymized`, category: 'auth' },
        }).catch(() => null);
        purged += 1;
      } catch {
        // leave pending for the next cycle
      }
    }
    return { purged };
  }





  // --------------------------------------------------------------------------
  // CARD CODE AUTHENTICATION & WHATSAPP PASSWORD FLOWS
  // --------------------------------------------------------------------------
  private maskPhone(phone: string): string {
    if (!phone) return '••••••';
    const clean = phone.trim();
    if (clean.length <= 6) return clean;
    const start = clean.slice(0, clean.startsWith('+') ? 5 : 3);
    const end = clean.slice(-4);
    return `${start} •••• ${end}`;
  }

  async findUserByCardCode(cardCode: string) {
    const cleanCode = cardCode.trim();
    const digitsOnly = cleanCode.replace(/\D/g, '');

    // Check Student first (by barcode, student id, parentEmail, or parentPhone)
    let student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { barcode: { equals: cleanCode, mode: 'insensitive' } },
          { id: { equals: cleanCode, mode: 'insensitive' } },
          { parentEmail: { equals: cleanCode, mode: 'insensitive' } },
          { parentPhone: { equals: cleanCode, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ id: 'asc' }],
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
                instructor: true,
                sessions: {
                  where: { sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                  orderBy: { sessionDate: 'asc' },
                  take: 5,
                },
              },
            },
          },
        },
      },
    });

    // If not found by direct match and input contains a full phone number (>= 8 digits), match normalized phone
    if (!student && digitsOnly.length >= 8) {
      const candidates = await this.prisma.student.findMany({
        where: {
          parentPhone: { contains: digitsOnly.slice(-8) },
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
                  instructor: true,
                  sessions: {
                    where: { sessionDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                    orderBy: { sessionDate: 'asc' },
                    take: 5,
                  },
                },
              },
            },
          },
        },
        take: 10,
      });

      student =
        candidates.find((c) => {
          const cDigits = c.parentPhone.replace(/\D/g, '');
          return (
            cDigits === digitsOnly ||
            cDigits.endsWith(digitsOnly) ||
            digitsOnly.endsWith(cDigits)
          );
        }) || null;
    }

    if (student) {
      return { type: 'student' as const, user: student };
    }

    // Check Instructor / Staff (by cardCode, email, or id)
    const staff = await this.prisma.staffUser.findFirst({
      where: {
        OR: [
          { cardCode: { equals: cleanCode, mode: 'insensitive' } },
          { email: { equals: cleanCode, mode: 'insensitive' } },
          { id: { equals: cleanCode, mode: 'insensitive' } },
        ],
      },
    });

    if (staff) {
      return { type: 'instructor' as const, user: staff };
    }

    return null;
  }

  async loginWithCardCode(cardCode: string, pass?: string) {
    if (!cardCode || !cardCode.trim()) {
      throw new BadRequestException('Physical card code is required');
    }

    const found = await this.findUserByCardCode(cardCode);
    if (!found) {
      throw new UnauthorizedException(
        `Card code "${cardCode}" was not found. Please verify the code on your physical academy card.`,
      );
    }

    // 1. STUDENT LOGIN
    if (found.type === 'student') {
      const student = found.user as any;

      if (!student.passwordHash) {
        throw new UnauthorizedException(
          'Your academy card is registered, but your portal password has not been activated yet. Please click "First Time Logging In?" below to receive your initial password on WhatsApp.',
        );
      }

      if (!pass || !pass.trim()) {
        throw new BadRequestException('Password is required');
      }

      this.assertLoginNotLocked(student);

      const isMatch = await argon2.verify(student.passwordHash, pass.trim());
      if (!isMatch) {
        await this.registerFailedLogin('student', student.id, student.failedLoginAttempts);
        throw new UnauthorizedException('Invalid card code or password.');
      }

      if (student.failedLoginAttempts > 0 || student.loginLockedUntil) {
        await this.clearLoginAttempts('student', student.id);
      }

      // If marked as first login, require immediate new password creation
      if (student.isFirstLogin) {
        const tempToken = this.jwtService.sign(
          { sub: student.id, type: 'student', mustChangePassword: true },
          { expiresIn: '1h' },
        );
        return {
          mustChangePassword: true,
          userType: 'student',
          token: tempToken,
          cardCode: student.barcode || student.id,
          name: student.name,
          maskedPhone: this.maskPhone(student.parentPhone),
          message: 'First time login detected. Please establish your new personal password to continue.',
        };
      }

      // Normal login
      const payload = {
        sub: student.id,
        type: 'student',
        cardCode: student.barcode,
        studentId: student.id,
        familyId: student.familyId,
        name: student.name,
      };

      const session = await this.issueSessionTokens(payload);
      const activeSub = student.subscriptions?.[0] || null;

      return {
        ...session,
        mustChangePassword: false,
        userType: 'student',
        cardCode: student.barcode || student.id,
        familyId: student.familyId,
        student: {
          id: student.id,
          name: student.name,
          nameAr: student.nameAr,
          barcode: student.barcode,
          level: student.level,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail,
          avatarUrl: student.photoUrl,
          familyId: student.familyId,
        },
        family: student.family,
        subscription: activeSub
          ? {
              id: activeSub.id,
              planName: activeSub.planName,
              planNameAr: activeSub.planNameAr,
              totalSessions: activeSub.maxSessions,
              remainingSessions: Math.max(0, activeSub.maxSessions - activeSub.usedSessions),
              startDate: activeSub.startDate.toISOString().split('T')[0],
              endDate: activeSub.endDate.toISOString().split('T')[0],
              status: activeSub.status,
            }
          : null,
        courses: student.courseEnrollments?.map((e: any) => e.course) || [],
      };

    }

    // 2. INSTRUCTOR / STAFF LOGIN
    if (found.type === 'instructor') {
      const staff = found.user as any;

      if (!staff.passwordHash) {
        throw new UnauthorizedException(
          'Staff card registered but password not yet initialized. Please request your temporary password via WhatsApp.',
        );
      }

      if (!pass || !pass.trim()) {
        throw new BadRequestException('Password is required');
      }

      this.assertLoginNotLocked(staff);

      const isMatch = await argon2.verify(staff.passwordHash, pass.trim());
      if (!isMatch) {
        await this.registerFailedLogin('staff', staff.id, staff.failedLoginAttempts);
        throw new UnauthorizedException('Invalid card code or password.');
      }

      if (staff.failedLoginAttempts > 0 || staff.loginLockedUntil) {
        await this.clearLoginAttempts('staff', staff.id);
      }

      if (staff.isFirstLogin) {
        const tempToken = this.jwtService.sign(
          { sub: staff.id, type: 'instructor', role: staff.role, mustChangePassword: true },
          { expiresIn: '1h' },
        );
        return {
          mustChangePassword: true,
          userType: 'instructor',
          token: tempToken,
          cardCode: staff.cardCode || staff.id,
          name: staff.name,
          maskedPhone: this.maskPhone(staff.phone || ''),
          message: 'First time login detected. Please establish your personal password to continue.',
        };
      }

      const payload = {
        sub: staff.id,
        type: 'instructor',
        cardCode: staff.cardCode,
        role: staff.role,
        name: staff.name,
        email: staff.email,
      };

      const session = await this.issueSessionTokens(payload);

      return {
        ...session,
        mustChangePassword: false,
        userType: 'instructor',
        cardCode: staff.cardCode || staff.id,
        user: this.sanitizeStaff(staff),
      };
    }

    throw new UnauthorizedException('Authentication failed.');
  }

  async requestInitialPassword(cardCode: string) {
    if (!cardCode || !cardCode.trim()) {
      throw new BadRequestException('Card code is required');
    }

    const found = await this.findUserByCardCode(cardCode);
    if (!found) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Cryptographically random 6-digit temporary password (900k space).
    // Matches the ETOILE-\d+ delivery format consumed by clients/tests.
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await hashArgon2id(tempPassword);

    if (found.type === 'student') {
      const student = found.user as any;
      await this.prisma.student.update({
        where: { id: student.id },
        data: {
          passwordHash,
          isFirstLogin: true,
        },
      });

      const recipientPhone = student.parentPhone;
      if (!recipientPhone) {
        throw new BadRequestException('No WhatsApp phone number registered on this student account. Please contact reception.');
      }
      const msgBody =
        `🩰 *Étoile Ballet Academy Paris*\n\n` +
        `Bonjour ${student.name}!\n` +
        `Welcome to the Étoile Academy Portal. Here is your temporary first-time login password for Academy Card [${student.barcode}]:\n\n` +
        `🔐 Temporary Password: *${tempPassword}*\n\n` +
        `Please visit the academy portal, enter this temporary password, and create your new private password.`;

      await this.openWaService.dispatchMessage({
        recipientPhone,
        recipientName: `${student.name} (${student.parentName})`,
        triggerEvent: 'announcement',
        language: 'en',
        customBody: msgBody,
      });

      return {
        success: true,
        userType: 'student',
        cardCode: student.barcode || student.id,
        recipientName: student.name,
        maskedPhone: this.maskPhone(recipientPhone),
        message: `Your temporary first-time password has been sent to WhatsApp number: ${this.maskPhone(recipientPhone)}`,
      };
    }

    if (found.type === 'instructor') {
      const staff = found.user as any;
      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: {
          passwordHash,
          isFirstLogin: true,
        },
      });

      const recipientPhone = staff.phone;
      if (!recipientPhone) {
        throw new BadRequestException('No WhatsApp phone number registered on this instructor account. Please contact reception.');
      }
      const msgBody =
        `🩰 *Étoile Ballet Academy Faculty Portal*\n\n` +
        `Bonjour Maestro ${staff.name}!\n` +
        `Here is your temporary first-time login password for Instructor Card [${staff.cardCode || cardCode}]:\n\n` +
        `🔐 Temporary Password: *${tempPassword}*\n\n` +
        `Please visit the portal, enter this temporary password, and create your new secure personal password.`;

      await this.openWaService.dispatchMessage({
        recipientPhone,
        recipientName: staff.name,
        triggerEvent: 'announcement',
        language: 'en',
        customBody: msgBody,
      });

      return {
        success: true,
        userType: 'instructor',
        cardCode: staff.cardCode || staff.id,
        recipientName: staff.name,
        maskedPhone: this.maskPhone(recipientPhone),
        message: `Your temporary first-time password has been sent to WhatsApp number: ${this.maskPhone(recipientPhone)}`,
      };
    }
  }

  async completeFirstTimeSetup(cardCode: string, tempPass: string, newPass: string) {
    if (!cardCode || !cardCode.trim()) {
      throw new BadRequestException('Card code is required');
    }
    if (!tempPass || !tempPass.trim()) {
      throw new BadRequestException('Temporary password is required');
    }
    if (!newPass || newPass.trim().length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    const found = await this.findUserByCardCode(cardCode);
    if (!found) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const newHash = await hashArgon2id(newPass.trim());

    if (found.type === 'student') {
      const student = found.user as any;
      if (!student.passwordHash) {
        throw new BadRequestException('No password set. Please request a temporary password first.');
      }

      const isMatch = await argon2.verify(student.passwordHash, tempPass.trim());
      if (!isMatch) {
        throw new UnauthorizedException('Incorrect temporary password. Please re-check WhatsApp.');
      }

      const updated: any = await this.prisma.student.update({
        where: { id: student.id },
        data: {
          passwordHash: newHash,
          isFirstLogin: false,
        },
        include: {
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
          courseEnrollments: { include: { course: true } },
        },
      });

      const session = await this.issueSessionTokens({
        sub: updated.id,
        type: 'student',
        cardCode: updated.barcode,
        studentId: updated.id,
        familyId: updated.familyId,
        name: updated.name,
      });

      const activeSub = updated.subscriptions?.[0] || null;

      return {
        success: true,
        ...session,
        mustChangePassword: false,
        userType: 'student',
        cardCode: updated.barcode,
        student: {
          id: updated.id,
          name: updated.name,
          nameAr: updated.nameAr,
          barcode: updated.barcode,
          level: updated.level,
          parentName: updated.parentName,
          parentPhone: updated.parentPhone,
          avatarUrl: updated.photoUrl,
        },
        subscription: activeSub
          ? {
              id: activeSub.id,
              planName: activeSub.planName,
              planNameAr: activeSub.planNameAr,
              totalSessions: activeSub.maxSessions,
              remainingSessions: Math.max(0, activeSub.maxSessions - activeSub.usedSessions),
              startDate: activeSub.startDate.toISOString().split('T')[0],
              endDate: activeSub.endDate.toISOString().split('T')[0],
              status: activeSub.status,
            }
          : null,
        courses: updated.courseEnrollments?.map((e: any) => e.course) || [],

        message: 'Permanent password established successfully! Welcome to your Étoile Student Portal.',
      };
    }

    if (found.type === 'instructor') {
      const staff = found.user as any;
      if (!staff.passwordHash) {
        throw new BadRequestException('No password set. Please request a temporary password first.');
      }

      const isMatch = await argon2.verify(staff.passwordHash, tempPass.trim());
      if (!isMatch) {
        throw new UnauthorizedException('Incorrect temporary password. Please re-check WhatsApp.');
      }

      const updated = await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: {
          passwordHash: newHash,
          isFirstLogin: false,
        },
      });

      const session = await this.issueSessionTokens({
        sub: updated.id,
        type: 'instructor',
        cardCode: updated.cardCode,
        role: updated.role,
        name: updated.name,
        email: updated.email,
      });

      return {
        success: true,
        ...session,
        mustChangePassword: false,
        userType: 'instructor',
        cardCode: updated.cardCode || updated.id,
        user: this.sanitizeStaff(updated),
        message: 'Permanent password established successfully! Welcome to your Étoile Faculty Portal.',
      };
    }
  }

  // --------------------------------------------------------------------------
  // LOGIN BRUTE-FORCE PROTECTION (per account, survives IP rotation)
  // --------------------------------------------------------------------------
  private assertLoginNotLocked(user: { loginLockedUntil?: Date | null }) {
    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((user.loginLockedUntil.getTime() - Date.now()) / 60000),
      );
      throw new HttpException(
        `Account temporarily locked after repeated failed logins. Try again in ~${minutesLeft} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async registerFailedLogin(kind: 'staff' | 'student', id: string, attemptsSoFar: number) {
    const attempts = (attemptsSoFar || 0) + 1;
    const locked = attempts >= LOGIN_MAX_ATTEMPTS;
    const data: any = {
      failedLoginAttempts: attempts,
      ...(locked ? { loginLockedUntil: new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000) } : {}),
    };
    if (kind === 'student') {
      await this.prisma.student.update({ where: { id }, data });
    } else {
      await this.prisma.staffUser.update({ where: { id }, data });
    }
  }

  private async clearLoginAttempts(kind: 'staff' | 'student', id: string) {
    const data = { failedLoginAttempts: 0, loginLockedUntil: null };
    if (kind === 'student') {
      await this.prisma.student.update({ where: { id }, data });
    } else {
      await this.prisma.staffUser.update({ where: { id }, data });
    }
  }



  private async verifyOtp(stored: string, supplied: string): Promise<boolean> {
    return verifyOtpHash(stored, supplied);
  }

  // --------------------------------------------------------------------------
  // OTP BRUTE-FORCE PROTECTION
  // --------------------------------------------------------------------------
  private assertOtpNotLocked(user: { otpLockedUntil?: Date | null }) {
    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((user.otpLockedUntil.getTime() - Date.now()) / 60000),
      );
      throw new BadRequestException(
        `Too many incorrect attempts. Please request a new code or try again in ~${minutesLeft} minute(s).`,
      );
    }
  }

  private async registerFailedOtpAttempt(kind: 'student' | 'instructor', id: string, attemptsSoFar: number) {
    const attempts = (attemptsSoFar || 0) + 1;
    const locked = attempts >= OTP_MAX_ATTEMPTS;
    const data: any = {
      otpAttempts: attempts,
      ...(locked ? { otpLockedUntil: new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000) } : {}),
    };
    if (kind === 'student') {
      await this.prisma.student.update({ where: { id }, data });
    } else {
      await this.prisma.staffUser.update({ where: { id }, data });
    }
  }

  async requestPasswordResetOtp(cardCode: string) {
    if (!cardCode || !cardCode.trim()) {
      throw new BadRequestException('Card code is required');
    }

    const found = await this.findUserByCardCode(cardCode);
    if (!found) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Cryptographically secure 6-digit OTP (valid 10 minutes). Stored as Argon2id hash.
    const otp = secureNumericCode(6);
    const otpHash = await hashArgon2id(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (found.type === 'student') {
      const student = found.user as any;
      await this.prisma.student.update({
        where: { id: student.id },
        data: {
          otpCode: otpHash,
          otpExpiresAt,
          otpAttempts: 0,
          otpLockedUntil: null,
        },
      });

      const recipientPhone = student.parentPhone;
      if (!recipientPhone) {
        throw new BadRequestException('No WhatsApp phone number registered on this student account. Please contact reception.');
      }
      const msgBody =
        `🩰 *Étoile Ballet Academy Security*\n\n` +
        `Bonjour ${student.name}!\n` +
        `Your password reset security OTP code is:\n\n` +
        `🔑 *${otp}*\n\n` +
        `This code is valid for 10 minutes. Enter it on the portal to reset your password. Do not share this code with anyone.`;

      await this.openWaService.dispatchMessage({
        recipientPhone,
        recipientName: student.name,
        triggerEvent: 'announcement',
        language: 'en',
        customBody: msgBody,
      });

      return {
        success: true,
        userType: 'student',
        cardCode: student.barcode || student.id,
        maskedPhone: this.maskPhone(recipientPhone),
        message: `Security OTP sent to your WhatsApp number: ${this.maskPhone(recipientPhone)}. Valid for 10 minutes.`,
      };
    }

    if (found.type === 'instructor') {
      const staff = found.user as any;
      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: {
          otpCode: otpHash,
          otpExpiresAt,
          otpAttempts: 0,
          otpLockedUntil: null,
        },
      });

      const recipientPhone = staff.phone;
      if (!recipientPhone) {
        throw new BadRequestException('No WhatsApp phone number registered on this instructor account. Please contact reception.');
      }
      const msgBody =
        `🩰 *Étoile Ballet Academy Security*\n\n` +
        `Bonjour Maestro ${staff.name}!\n` +
        `Your password reset security OTP code is:\n\n` +
        `🔑 *${otp}*\n\n` +
        `This code is valid for 10 minutes. Enter it on the portal to reset your password. Do not share this code with anyone.`;

      await this.openWaService.dispatchMessage({
        recipientPhone,
        recipientName: staff.name,
        triggerEvent: 'announcement',
        language: 'en',
        customBody: msgBody,
      });

      return {
        success: true,
        userType: 'instructor',
        cardCode: staff.cardCode || staff.id,
        maskedPhone: this.maskPhone(recipientPhone),
        message: `Security OTP sent to your WhatsApp number: ${this.maskPhone(recipientPhone)}. Valid for 10 minutes.`,
      };
    }
  }

  async resetPasswordWithOtp(cardCode: string, otp: string, newPass: string) {
    if (!cardCode || !cardCode.trim()) {
      throw new BadRequestException('Card code is required');
    }
    if (!otp || !otp.trim()) {
      throw new BadRequestException('OTP code is required');
    }
    if (!newPass || newPass.trim().length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    const found = await this.findUserByCardCode(cardCode);
    if (!found) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const newHash = await hashArgon2id(newPass.trim());
    const now = new Date();

    if (found.type === 'student') {
      const student = found.user as any;
      this.assertOtpNotLocked(student);
      const otpValid = student.otpCode ? await this.verifyOtp(student.otpCode, otp.trim()) : false;
      if (!student.otpCode || !otpValid) {
        await this.registerFailedOtpAttempt('student', student.id, student.otpAttempts);
        throw new BadRequestException('Invalid OTP code. Please check your WhatsApp and try again.');
      }
      if (!student.otpExpiresAt || student.otpExpiresAt < now) {
        throw new BadRequestException('OTP code has expired. Please request a new code.');
      }

      await this.prisma.student.update({
        where: { id: student.id },
        data: {
          passwordHash: newHash,
          isFirstLogin: false,
          otpCode: null,
          otpExpiresAt: null,
          otpAttempts: 0,
          otpLockedUntil: null,
        },
      });

      return {
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.',
      };
    }

    if (found.type === 'instructor') {
      const staff = found.user as any;
      this.assertOtpNotLocked(staff);
      const otpValid = staff.otpCode ? await this.verifyOtp(staff.otpCode, otp.trim()) : false;
      if (!staff.otpCode || !otpValid) {
        await this.registerFailedOtpAttempt('instructor', staff.id, staff.otpAttempts);
        throw new BadRequestException('Invalid OTP code. Please check your WhatsApp and try again.');
      }
      if (!staff.otpExpiresAt || staff.otpExpiresAt < now) {
        throw new BadRequestException('OTP code has expired. Please request a new code.');
      }

      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: {
          passwordHash: newHash,
          isFirstLogin: false,
          otpCode: null,
          otpExpiresAt: null,
          otpAttempts: 0,
          otpLockedUntil: null,
        },
      });

      return {
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.',
      };
    }
  }
}


