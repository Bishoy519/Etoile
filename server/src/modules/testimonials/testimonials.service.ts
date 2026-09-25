import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED = new Set(['draft', 'published', 'archived']);

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  async published() {
    return this.prisma.testimonial.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
  }

  async list(status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    return this.prisma.testimonial.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async create(data: { authorName: string; authorRole?: string; text: string; textAr?: string; rating?: number }) {
    if (!data.authorName?.trim()) throw new BadRequestException('Author name is required');
    if (!data.text?.trim() || data.text.trim().length < 10) {
      throw new BadRequestException('Testimonial text must be at least 10 characters');
    }
    const rating = Math.round(Number(data.rating ?? 5));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new BadRequestException('Rating must be 1–5');
    return this.prisma.testimonial.create({
      data: {
        authorName: data.authorName.trim().slice(0, 120),
        authorRole: (data.authorRole || 'Parent').slice(0, 120),
        text: data.text.trim().slice(0, 2000),
        textAr: data.textAr?.trim().slice(0, 2000) || null,
        rating,
        status: 'draft',
      },
    });
  }

  async update(id: string, data: Partial<{ authorName: string; authorRole: string; text: string; textAr: string; rating: number; status: string }>) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');
    const patch: Record<string, unknown> = {};
    if (data.authorName !== undefined) patch.authorName = String(data.authorName).slice(0, 120);
    if (data.authorRole !== undefined) patch.authorRole = String(data.authorRole).slice(0, 120);
    if (data.text !== undefined) {
      if (String(data.text).trim().length < 10) throw new BadRequestException('Text must be at least 10 characters');
      patch.text = String(data.text).slice(0, 2000);
    }
    if (data.textAr !== undefined) patch.textAr = String(data.textAr).slice(0, 2000) || null;
    if (data.rating !== undefined) {
      const r = Math.round(Number(data.rating));
      if (!Number.isFinite(r) || r < 1 || r > 5) throw new BadRequestException('Rating must be 1–5');
      patch.rating = r;
    }
    if (data.status !== undefined) {
      if (!ALLOWED.has(data.status)) throw new BadRequestException('Invalid status');
      patch.status = data.status;
    }
    return this.prisma.testimonial.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');
    await this.prisma.testimonial.delete({ where: { id } });
    return { success: true };
  }
}
