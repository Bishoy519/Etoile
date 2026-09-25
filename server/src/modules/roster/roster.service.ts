import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RosterActor {
  id?: string;
  role?: string;
  name?: string;
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function dayBounds(dateStr: string): { day: Date; label: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('date must be YYYY-MM-DD');
  return { day: d, label: dateStr };
}

/** Staff roster: weekly shifts + leave requests with owner approval. */
@Injectable()
export class RosterService {
  constructor(private readonly prisma: PrismaService) {}

  private isManager(role?: string) {
    return role === 'superadmin' || role === 'owner';
  }

  private scopeMessage() {
    return 'You may only view your own roster';
  }

  async listShifts(query: { from?: string; to?: string; staffId?: string; mine?: string }, actor?: RosterActor) {
    const where: Record<string, unknown> = {};
    const staffId = query.mine === 'true' || query.mine === '1' ? actor?.id : query.staffId;
    if (staffId) {
      if (!this.isManager(actor?.role) && staffId !== actor?.id) throw new ForbiddenException(this.scopeMessage());
      where.staffId = staffId;
    } else if (!this.isManager(actor?.role) && !['receptionist', 'instructor'].includes(actor?.role || '')) {
      throw new ForbiddenException(this.scopeMessage());
    }
    if (query.from || query.to) {
      const range: Record<string, unknown> = {};
      if (query.from) range.gte = new Date(`${query.from}T00:00:00`);
      if (query.to) range.lte = new Date(`${query.to}T23:59:59`);
      where.date = range;
    }
    return this.prisma.staffShift.findMany({
      where,
      include: { staff: { select: { id: true, name: true, role: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 500,
    });
  }

  async createShift(
    data: { staffId: string; date: string; startTime?: string; endTime?: string; duty?: string; notes?: string },
    actor?: RosterActor,
  ) {
    if (!this.isManager(actor?.role)) throw new ForbiddenException('Only directors and owners schedule shifts');
    if (!data.staffId) throw new BadRequestException('staffId is required');
    const staff = await this.prisma.staffUser.findUnique({ where: { id: data.staffId } });
    if (!staff) throw new NotFoundException('Staff member not found');
    const { day } = dayBounds(data.date);
    const startTime = data.startTime || '09:00';
    const endTime = data.endTime || '17:00';
    if (!TIME.test(startTime) || !TIME.test(endTime)) throw new BadRequestException('Times must be HH:mm');
    if (endTime <= startTime) throw new BadRequestException('endTime must be after startTime');
    // Overlap guard: same staffer, same day, intersecting hours (scheduled only).
    const existing = await this.prisma.staffShift.findMany({
      where: { staffId: data.staffId, date: day, status: 'scheduled' },
    });
    for (const s of existing) {
      // HH:mm zero-padded strings compare lexicographically.
      if (s.startTime < endTime && startTime < s.endTime) {
        throw new BadRequestException(`Overlaps existing shift ${s.startTime}–${s.endTime}`);
      }
    }
    return this.prisma.staffShift.create({
      data: {
        staffId: data.staffId,
        date: day,
        startTime,
        endTime,
        duty: (data.duty || 'Front desk').slice(0, 120),
        notes: (data.notes || '').slice(0, 500),
        status: 'scheduled',
      },
      include: { staff: { select: { id: true, name: true, role: true } } },
    });
  }

  async setShiftStatus(id: string, status: string, actor?: RosterActor) {
    if (!this.isManager(actor?.role)) throw new ForbiddenException('Only directors and owners update shifts');
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) throw new BadRequestException('Invalid status');
    const existing = await this.prisma.staffShift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');
    return this.prisma.staffShift.update({ where: { id }, data: { status } });
  }

  async deleteShift(id: string, actor?: RosterActor) {
    if (!this.isManager(actor?.role)) throw new ForbiddenException('Only directors and owners delete shifts');
    const existing = await this.prisma.staffShift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');
    await this.prisma.staffShift.delete({ where: { id } });
    return { success: true };
  }

  async listLeaves(query: { status?: string; mine?: string; staffId?: string }, actor?: RosterActor) {
    const where: Record<string, unknown> = {};
    const staffId = query.mine === 'true' || query.mine === '1' ? actor?.id : query.staffId;
    if (staffId) {
      if (!this.isManager(actor?.role) && staffId !== actor?.id) throw new ForbiddenException(this.scopeMessage());
      where.staffId = staffId;
    } else if (!this.isManager(actor?.role)) {
      where.staffId = actor?.id;
    }
    if (query.status) where.status = query.status;
    return this.prisma.staffLeave.findMany({
      where,
      include: { staff: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async requestLeave(
    data: { from: string; to: string; reason?: string; staffId?: string },
    actor?: RosterActor,
  ) {
    // Staff request for themselves; managers may file for anyone.
    const staffId = this.isManager(actor?.role) && data.staffId ? data.staffId : actor?.id;
    if (!staffId) throw new BadRequestException('Staff session required');
    if (!['receptionist', 'instructor', 'superadmin', 'owner'].includes(actor?.role || '')) {
      throw new ForbiddenException('Only staff may request leave');
    }
    const from = new Date(data.from);
    const to = new Date(data.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new BadRequestException('from/to must be valid dates');
    if (to < from) throw new BadRequestException('Leave end must not precede start');
    if (from.getTime() < Date.now() - 24 * 60 * 60 * 1000) throw new BadRequestException('Backdated leave is not allowed');
    const staff = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff member not found');
    return this.prisma.staffLeave.create({
      data: { staffId, from, to, reason: (data.reason || '').slice(0, 500), status: 'pending' },
      include: { staff: { select: { id: true, name: true, role: true } } },
    });
  }

  async decideLeave(id: string, approve: boolean, actor?: RosterActor) {
    if (!this.isManager(actor?.role)) throw new ForbiddenException('Only directors and owners decide leave');
    const existing = await this.prisma.staffLeave.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'pending') throw new BadRequestException('Request already decided');
    return this.prisma.staffLeave.update({
      where: { id },
      data: { status: approve ? 'approved' : 'rejected', decidedBy: actor?.name || actor?.role || 'Staff' },
    });
  }
}
