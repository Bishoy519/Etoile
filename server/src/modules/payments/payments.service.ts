import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { postVoucher } from '../accounting/gl-posting.util';
import { PushService } from '../notifications/push.service';

const PROVIDERS = ['paymob', 'fawry', 'instapay'] as const;
export type PayProvider = (typeof PROVIDERS)[number];

const LINK_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function makeRef(provider: string): string {
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `${provider.toUpperCase()}-${suffix}`;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly push?: PushService,
  ) {}

  private portalBase(): string {
    // Optional PAYLINK_PORTAL_URL override, else the shared PUBLIC_APP_URL
    // (client portal in dev), else the production portal default.
    const base =
      process.env.PAYLINK_PORTAL_URL ||
      (process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}/pay` : null) ||
      'https://etoile.academy/pay';
    return base.replace(/\/$/, '');
  }

  /**
   * Create an online pay-link for an invoice or ad-hoc amount. This is the
   * provider-agnostic record layer: live gateway keys (Paymob/Fawry) plug into
   * `providerRef`/`url` later without changing callers. Links expire in 48h.
   */
  async createPayLink(data: {
    invoiceId?: string;
    studentId?: string;
    amount: number;
    provider: string;
    phone?: string;
  }) {
    const amount = Math.round(Number(data.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }
    if (!PROVIDERS.includes(data.provider as PayProvider)) {
      throw new BadRequestException(`Provider must be one of: ${PROVIDERS.join(', ')}`);
    }
    if (data.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice) throw new NotFoundException(`Invoice ${data.invoiceId} not found`);
    }
    if (data.studentId) {
      const student = await this.prisma.student.findUnique({ where: { id: data.studentId } });
      if (!student) throw new NotFoundException(`Student ${data.studentId} not found`);
    }

    const ref = makeRef(data.provider);
    const link = await this.prisma.paymentLink.create({
      data: {
        ref,
        provider: data.provider,
        amount,
        currency: 'EGP',
        invoiceId: data.invoiceId || null,
        studentId: data.studentId || null,
        phone: data.phone || null,
        status: 'pending',
        url: `${this.portalBase()}/${ref}`,
        expiresAt: new Date(Date.now() + LINK_TTL_MS),
      },
    });

    return {
      url: link.url,
      ref: link.ref,
      amount: link.amount,
      currency: link.currency,
      provider: link.provider,
      status: link.status,
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  async getPayLinkStatus(ref: string) {
    const link = await this.prisma.paymentLink.findUnique({ where: { ref: String(ref || '').trim() } });
    if (!link) throw new NotFoundException('Payment link not found');
    return {
      ref: link.ref,
      amount: link.amount,
      currency: link.currency,
      provider: link.provider,
      status: link.status,
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  /**
   * Family-scoped pay-link: parents create an online payment link for their
   * OWN unpaid invoice only. Amount is always the server-side remainingDue —
   * never client-supplied — so families cannot under/over-pay by tampering.
   */
  async createFamilyPayLink(familyId: string, data: { invoiceId: string; provider: string }) {
    if (!familyId?.trim()) throw new BadRequestException('Family session required');
    if (!PROVIDERS.includes(data.provider as PayProvider)) {
      throw new BadRequestException(`Provider must be one of: ${PROVIDERS.join(', ')}`);
    }
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { student: { select: { familyId: true } } },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${data.invoiceId} not found`);
    const ownerFamily = (invoice as { familyId?: string | null }).familyId || invoice.student?.familyId;
    if (ownerFamily !== familyId) throw new BadRequestException('You may only pay your own family invoices');
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      throw new BadRequestException('This invoice needs no payment');
    }
    const due = Math.round((Number((invoice as unknown as { total: unknown }).total) - Number((invoice as unknown as { amountPaid: unknown }).amountPaid)) * 100) / 100;
    if (due <= 0) throw new BadRequestException('This invoice needs no payment');
    const ref = makeRef(data.provider);
    const link = await this.prisma.paymentLink.create({
      data: {
        ref,
        provider: data.provider,
        amount: due,
        currency: 'EGP',
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        phone: null,
        status: 'pending',
        url: `${this.portalBase()}/${ref}`,
        expiresAt: new Date(Date.now() + LINK_TTL_MS),
      },
    });
    return {
      url: link.url,
      ref: link.ref,
      amount: link.amount,
      currency: link.currency,
      provider: link.provider,
      status: link.status,
      expiresAt: link.expiresAt.toISOString(),
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  /**
   * Provider callback (Paymob/Fawry synchronous notification). Authenticated
   * by the unguessable `ref` itself — no JWT. Idempotent: replaying a paid
   * notification returns the current state without side effects.
   * On `paid`, settles the linked invoice via PaymentTransaction in one DB txn.
   */
  async handleWebhook(data: { ref?: string; status?: string; providerRef?: string }) {
    const ref = String(data?.ref || '').trim();
    if (!ref) throw new BadRequestException('Webhook ref is required');
    const status = String(data?.status || '').trim().toLowerCase();
    if (!['paid', 'failed', 'expired', 'cancelled'].includes(status)) {
      throw new BadRequestException('Webhook status must be paid, failed, expired or cancelled');
    }

    const link = await this.prisma.paymentLink.findUnique({ where: { ref } });
    if (!link) throw new NotFoundException('Payment link not found');
    if (link.expiresAt < new Date() && link.status === 'pending') {
      await this.prisma.paymentLink.update({ where: { ref }, data: { status: 'expired' } }).catch(() => null);
    }
    if (link.status === 'paid') return this.getPayLinkStatus(ref);

    const updated = await this.prisma.paymentLink.update({
      where: { ref },
      data: {
        status,
        providerRef: data?.providerRef || link.providerRef,
        paidAt: status === 'paid' ? new Date() : link.paidAt,
      },
    });

    if (status === 'paid' && link.invoiceId) {
      const linkAmtOuter = Number((link as unknown as { amount: unknown }).amount);
      await this.prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({ where: { id: link.invoiceId! } });
        if (!invoice || invoice.status === 'paid' || invoice.status === 'cancelled') return;
        const paidSoFar = Number((invoice as unknown as { amountPaid: unknown }).amountPaid);
        const invTotal = Number((invoice as unknown as { total: unknown }).total);
        const linkAmt = Number((link as unknown as { amount: unknown }).amount);
        const newPaid = Math.round((paidSoFar + linkAmt) * 100) / 100;
        if (newPaid - invTotal > 0.01) return;
        const fullyPaid = Math.abs(newPaid - invTotal) < 0.01;
        await tx.paymentTransaction.create({
          data: {
            transactionNumber: `TXN-${Date.now().toString(36).toUpperCase()}`,
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            amount: linkAmt,
            method: link.provider === 'fawry' ? 'fawry' : link.provider === 'instapay' ? 'instapay' : 'card',
            receivedBy: `PayLink ${link.provider}`,
            notes: `PayLink ${ref}`,
          },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { amountPaid: newPaid, remainingDue: Math.max(0, Math.round((invTotal - newPaid) * 100) / 100), status: fullyPaid ? 'paid' : 'partially_paid' },
        });
        await postVoucher(tx as never, `PayLink ${ref} settle ${invoice.invoiceNumber}`, [
          { accountCode: '1020', accountName: 'Bank', debit: linkAmt },
          { accountCode: '1200', accountName: 'Accounts Receivable', credit: linkAmt },
        ]).catch(() => null);
      }).catch(() => null);
      if (this.push) {
        const famId =
          link.invoiceId &&
          (await this.prisma.invoice.findUnique({ where: { id: link.invoiceId }, include: { student: { select: { familyId: true } } } }).catch(() => null));
        const familyId = (famId as unknown as { familyId?: string | null })?.familyId || (famId as unknown as { student?: { familyId?: string } })?.student?.familyId;
        if (familyId) {
          this.push.notifyFamily(familyId, {
            title: `Online payment received — EGP ${linkAmtOuter}`,
            titleAr: `تم استلام دفعة أونلاين — ${linkAmtOuter} ج.م`,
            body: `${(famId as unknown as { invoiceNumber?: string })?.invoiceNumber || 'Invoice'} settled via ${link.provider}.`,
            url: '/',
            tag: `paylink-${ref}`,
          }).catch(() => null);
        }
      }
    }

    return {
      ref: updated.ref,
      status: updated.status,
      amount: updated.amount,
      currency: updated.currency,
      paidAt: updated.paidAt?.toISOString() || null,
    };
  }
}
