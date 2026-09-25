import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateTrialDto } from './dto/create-trial.dto';
import { ReferralsService } from '../referrals/referrals.service';

/** Optional ISO birthdate → Date, validated as a past date. Null when absent. */
function parseBirthDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
    throw new BadRequestException('birthDate must be a valid past date');
  }
  return parsed;
}
import {
  generateUniqueStudentId,
  generateUniqueBarcode,
  findOrCreateFamily,
} from '../../common/id-generator';
import { parsePagination } from '../../common/pagination.util';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referrals: ReferralsService,
  ) {}

  async createLead(dto: CreateLeadDto) {
    const lead = await this.prisma.admissionLead.create({
      data: {
        dancerName: dto.dancerName,
        age: dto.age,
        birthDate: parseBirthDate(dto.birthDate),
        parentName: dto.parentName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        program: dto.program || 'classical',
        division: dto.division || 'pre-pro',
        experience: dto.experience || '',
        stage: 'new_inquiry',
        notes: dto.notes || 'Inquiry received via academy web landing portal',
      },
    });

    // Also record audit log
    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'Lead Inquired',
        actor: dto.parentName,
        details: `New admission inquiry for ${dto.dancerName} (${dto.program || 'classical'})`,
        category: 'crm',
      },
    });

    const referral = await this.referrals.attachToLead(dto.referralCode, lead.id, dto.dancerName);

    return {
      success: true,
      lead,
      referralAccepted: !!referral,
      message: 'Admission application received and registered into academy admissions pipeline.',
    };
  }

  async getAllLeads(query?: { page?: string | number; limit?: string | number }) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.admissionLead.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /** Fixed studio trial hours (Africa/Cairo) offered for the next 14 days. */
  getTrialSlots() {
    const TIMES = ['10:00', '12:00', '16:00', '18:00'];
    const days: { date: string; label: string; times: string[] }[] = [];
    const now = new Date();
    for (let i = 1; i <= 14; i += 1) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      // Friday (day 5) is the weekly rest day — no trials.
      if (d.getDay() === 5) continue;
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      days.push({ date: iso, label, times: TIMES });
      if (days.length >= 12) break;
    }
    return { timezone: 'Africa/Cairo', days };
  }

  /** Public trial-class booking: validates slot, dedupes, enters pipeline as trial_scheduled. */
  async createTrialLead(dto: CreateTrialDto) {
    const slot = new Date(dto.preferredSlot);
    if (Number.isNaN(slot.getTime())) throw new BadRequestException('preferredSlot must be a valid ISO date');
    if (slot.getTime() < Date.now() + 60 * 60 * 1000) {
      throw new BadRequestException('Trial slot must be at least 1 hour in the future');
    }
    if (slot.getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Trial slot must be within the next 30 days');
    }
    const program = ['classical', 'contemporary', 'youth'].includes(dto.program || '') ? dto.program! : 'classical';

    // Dedupe: same dancer + phone with an open lead in the last 7 days → return it.
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existing = await this.prisma.admissionLead.findFirst({
      where: {
        dancerName: { equals: dto.dancerName.trim(), mode: 'insensitive' },
        parentPhone: { contains: dto.parentPhone.trim().slice(-8) },
        stage: { in: ['new_inquiry', 'trial_scheduled', 'audition_scheduled', 'evaluated'] },
        createdAt: { gte: weekAgo },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return {
        success: true,
        lead: existing,
        deduped: true,
        message: 'You already have an open application — we kept your original slot request.',
      };
    }

    const lead = await this.prisma.admissionLead.create({
      data: {
        dancerName: dto.dancerName.trim(),
        age: dto.age,
        birthDate: parseBirthDate(dto.birthDate),
        parentName: dto.parentName.trim(),
        parentPhone: dto.parentPhone.trim(),
        parentEmail: dto.parentEmail.trim(),
        program,
        division: dto.division || 'pre-pro',
        experience: dto.experience || '',
        stage: 'trial_scheduled',
        preferredSlot: slot,
        source: 'web_trial',
        notes: `Trial class booked for ${slot.toISOString()} (${program}). Experience: ${(dto.experience || '').trim() || 'None provided'}`,
      },
    });

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'Trial Booked',
        actor: dto.parentName.trim(),
        details: `Trial for ${dto.dancerName.trim()} at ${slot.toISOString()} (${program})`,
        category: 'crm',
      },
    }).catch(() => null);

    const referral = await this.referrals.attachToLead(dto.referralCode, lead.id, dto.dancerName);

    return {
      success: true,
      lead,
      referralAccepted: !!referral,
      message: 'Trial class booked — admissions will confirm on WhatsApp within 24 hours.',
    };
  }

  private static readonly ALLOWED_STAGES = new Set([
    'new_inquiry', 'trial_scheduled', 'audition_scheduled', 'evaluated', 'audition_passed', 'enrolled', 'waitlist', 'rejected',
  ]);

  async updateLeadStage(id: string, stage: string) {
    if (!LeadsService.ALLOWED_STAGES.has(stage)) {
      throw new BadRequestException(`Invalid stage. Allowed: ${Array.from(LeadsService.ALLOWED_STAGES).join(', ')}`);
    }
    const lead = await this.prisma.admissionLead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);

    const updated = await this.prisma.admissionLead.update({
      where: { id },
      data: { stage },
    });

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'Lead Stage Advanced',
        actor: 'Staff Operator',
        details: `Lead for ${lead.dancerName} moved to ${stage}`,
        category: 'crm',
      },
    });

    return updated;
  }

  async convertLeadToStudent(leadId: string, planTier: string = 'elite_16') {
    const lead = await this.prisma.admissionLead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    // Collision-free identifiers (never count-based). Siblings converting
    // later reuse the same family row matched by parent contact.
    const studentId = await generateUniqueStudentId(this.prisma);
    const barcode = await generateUniqueBarcode(this.prisma);
    const family = await findOrCreateFamily(this.prisma, {
      parentName: lead.parentName,
      parentPhone: lead.parentPhone,
      parentEmail: lead.parentEmail,
    });
    const familyId = family.id;

    // Create student
    const student = await this.prisma.student.create({
      data: {
        id: studentId,
        name: lead.dancerName,
        nameAr: lead.dancerName,
        barcode,
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        familyId,
        age: lead.age,
        birthDate: (lead as unknown as { birthDate?: Date | null }).birthDate || null,
        program: lead.program,
        level: lead.division === 'pre-pro' ? 'Pre-Professional Level I' : 'Conservatory Apprentice',
        walletBalance: 0.0,
        maxNegativeDebt: 150.0,
        parentName: lead.parentName,
        parentPhone: lead.parentPhone,
        parentEmail: lead.parentEmail,
      },
    });

    // Create subscription
    const maxSessions = planTier === 'intensive_20' ? 20 : planTier === 'foundation_8' ? 8 : 16;
    const price = planTier === 'intensive_20' ? 520 : planTier === 'foundation_8' ? 260 : 480;
    const planName =
      planTier === 'intensive_20'
        ? 'Contemporary Intensive Pro (20 Sessions)'
        : planTier === 'foundation_8'
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

    // Mark lead as enrolled
    await this.prisma.admissionLead.update({
      where: { id: leadId },
      data: {
        stage: 'enrolled',
        convertedStudentId: student.id,
      },
    });

    // Referral loop: pending referrals on this lead become converted.
    await this.referrals.markConverted(leadId, student.id);

    return student;
  }

  async deleteLead(id: string) {
    const lead = await this.prisma.admissionLead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    await this.prisma.admissionLead.delete({ where: { id } });
    await this.prisma.crmAuditEntry
      .create({
        data: { action: 'Lead Removed', actor: 'Staff', details: `Deleted admissions lead ${lead.dancerName}`, category: 'crm' },
      })
      .catch(() => null);
    return { success: true, id };
  }
}
