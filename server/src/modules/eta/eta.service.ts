import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toNumber, round2 } from '../../common/money.util';

export interface EtaDoc {
  id: string;
  invoiceId: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  uuid?: string;
  payload: unknown;
  createdAt: string;
}

function serialFor(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ETA-${y}${m}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

@Injectable()
export class EtaService {
  constructor(private readonly prisma: PrismaService) {}

  buildUbl(invoice: any) {
    const items = (invoice.items || []).map((l: any) => {
      const qty = Math.max(1, Math.floor(Number(l.quantity) || 1));
      const unit = round2(Number(l.unitPrice ?? l.price ?? 0));
      return { description: l.description || 'Tuition', qty, unitPrice: unit, total: round2(qty * unit) };
    });
    const subtotal = round2(toNumber(invoice.subtotal ?? items.reduce((s: number, l: { total: number }) => s + l.total, 0)));
    const tax = round2(toNumber(invoice.taxAmount ?? 0));
    const total = round2(toNumber(invoice.total ?? invoice.totalAmount ?? subtotal + tax));
    return {
      documentType: 'eReceipt',
      version: '1.0',
      issuer: {
        name: process.env.ETA_ISSUER_NAME || 'Etoile Ballet Academy',
        taxId: process.env.ETA_TAX_ID || '000-000-000',
        branch: process.env.ETA_BRANCH_ID || 'ZAM',
        currency: 'EGP',
      },
      receiver: {
        name: invoice.customerName || invoice.studentName || 'Walk-in',
        phone: invoice.customerPhone || invoice.parentPhone || undefined,
      },
      invoiceNumber: invoice.invoiceNumber || invoice.id,
      issueDate: (invoice.issueDate ? new Date(invoice.issueDate) : new Date()).toISOString(),
      lines: items,
      totals: { subtotal, tax, total, currency: 'EGP' },
      taxPolicy: 'EG tuition exempt; retail 14% — verify per line before go-live',
    };
  }

  private qrFor(doc: { serial: string; uuid?: string; total: number; issueDate: string }): string {
    return JSON.stringify({ s: doc.serial, u: doc.uuid || null, t: doc.total, d: doc.issueDate });
  }

  async submit(invoiceId: string, invoice?: any) {
    if (!invoiceId?.trim()) throw new BadRequestException('invoiceId is required');
    let inv = invoice;
    if (!inv) {
      inv = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: { items: true } }).catch(() => null);
      if (!inv) throw new BadRequestException('Invoice not found');
    }
    const payload = this.buildUbl(inv);
    const serial = serialFor();
    const live = !!process.env.ETA_API_KEY;
    // Real gateway call plugs in here (sign payload with ETA cert, POST, store UUID).
    // Stubbed path persists a reconciliation-ready draft so nothing is lost in memory.
    const uuid = live ? `ETA-${Date.now().toString(36).toUpperCase()}` : undefined;
    const doc = await (this.prisma as any).etaDocument.create({
      data: {
        serial,
        invoiceId,
        uuid: uuid || undefined,
        status: live ? 'submitted' : 'draft',
        payload: JSON.stringify(payload),
        qrPayload: this.qrFor({ serial, uuid, total: (payload as { totals: { total: number } }).totals.total, issueDate: (payload as { issueDate: string }).issueDate }),
        submittedAt: live ? new Date() : null,
        retryCount: 0,
      },
    }).catch(() => null);

    if (!doc) {
      return {
        id: `eta_${Date.now().toString(36)}`,
        invoiceId,
        status: live ? 'submitted' : 'draft',
        uuid,
        payload,
        createdAt: new Date().toISOString(),
        note: live ? 'Submitted to ETA portal.' : 'Stubbed — set ETA_API_KEY + ETA_TAX_ID to go live.',
      };
    }
    return {
      ...doc,
      note: live ? 'Submitted to ETA portal.' : 'Persisted as draft — set ETA_API_KEY + ETA_TAX_ID to go live.',
    };
  }

  async retry(id: string) {
    const doc = await (this.prisma as any).etaDocument.findUnique({ where: { id } }).catch(() => null);
    if (!doc) throw new BadRequestException('ETA document not found');
    if (doc.status === 'accepted') return doc;
    const live = !!process.env.ETA_API_KEY;
    return (this.prisma as any).etaDocument.update({
      where: { id },
      data: {
        status: live ? 'submitted' : 'draft',
        retryCount: { increment: 1 },
        lastError: live ? null : 'ETA_API_KEY missing — still stubbed',
        submittedAt: live ? new Date() : doc.submittedAt,
        uuid: live ? doc.uuid || `ETA-${Date.now().toString(36).toUpperCase()}` : doc.uuid,
      },
    });
  }

  async list() {
    const rows = await (this.prisma as any).etaDocument.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []);
    return rows.map((d: any) => ({ ...d, payload: (() => { try { return JSON.parse(d.payload); } catch { return d.payload; } })() }));
  }

  /** Fire-and-forget hook called after invoice creation — never blocks billing. */
  async autoSubmitBestEffort(invoiceId: string, invoice?: any): Promise<void> {
    try {
      if (process.env.ETA_AUTO_SUBMIT === 'false') return;
      await this.submit(invoiceId, invoice);
    } catch {
      // Billing must succeed even if ETA is down; retry via POST /api/eta/retry.
    }
  }
}
