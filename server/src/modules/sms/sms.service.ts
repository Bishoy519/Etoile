import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SmsResult {
  attempted: boolean;
  sent: boolean;
  provider?: string;
  segments?: number;
  error?: string;
}

function normalizePhone(raw: string): string | null {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return raw.trim().startsWith('+') ? `+${digits}` : digits;
}

function smsBody(body: string): { text: string; segments: number } {
  const text = body
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/\s+\n/g, '\n')
    .trim()
    .slice(0, 1000);
  return { text, segments: Math.max(1, Math.ceil(text.length / 160)) };
}

/**
 * Guardian SMS fallback: when a WhatsApp dispatch fails, critical receipts
 * still reach the parent as plain text. Drivers: twilio | webhook | none.
 * Configure via SMS_PROVIDER + credentials; unconfigured = inert stub.
 */
@Injectable()
export class SmsService {
  private readonly log = new Logger('Sms');
  constructor(private readonly prisma: PrismaService) {}

  status() {
    const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase();
    if (provider === 'twilio') {
      const configured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
      return { provider, configured, from: process.env.TWILIO_FROM || null };
    }
    if (provider === 'webhook') {
      return { provider, configured: !!process.env.SMS_WEBHOOK_URL, url: process.env.SMS_WEBHOOK_URL || null };
    }
    return { provider: 'none', configured: false };
  }

  async send(to: string, body: string, meta?: { triggerEvent?: string; recipientName?: string }): Promise<SmsResult> {
    const phone = normalizePhone(to);
    if (!phone) return { attempted: false, sent: false, error: 'Invalid phone' };
    const st = this.status();
    if (!st.configured) return { attempted: false, sent: false, provider: st.provider, error: 'SMS provider not configured' };
    const { text, segments } = smsBody(body);
    try {
      if (st.provider === 'twilio') {
        const sid = process.env.TWILIO_ACCOUNT_SID!;
        const creds = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const form = new URLSearchParams({
          To: phone.startsWith('+') ? phone : `+${phone}`,
          From: process.env.TWILIO_FROM!,
          Body: text,
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            signal: controller.signal,
            headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
          });
          if (!res.ok) throw new Error(`Twilio HTTP ${res.status}`);
        } finally {
          clearTimeout(timeout);
        }
      } else {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(process.env.SMS_WEBHOOK_URL!, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.SMS_WEBHOOK_KEY ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_KEY}` } : {}),
            },
            body: JSON.stringify({ to: phone, message: text }),
          });
          if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
        } finally {
          clearTimeout(timeout);
        }
      }
      await this.prisma.openWaLog.create({
        data: {
          recipientPhone: phone,
          recipientName: (meta?.recipientName || 'Guardian').slice(0, 120),
          triggerEvent: meta?.triggerEvent || 'announcement',
          language: 'en',
          body: text.slice(0, 500),
          status: 'delivered',
          channel: 'sms',
        },
      }).catch(() => null);
      return { attempted: true, sent: true, provider: st.provider, segments };
    } catch (e: any) {
      this.log.warn(`sms send failed: ${(e as Error).message}`);
      return { attempted: true, sent: false, provider: st.provider, error: (e as Error).message?.slice(0, 160) };
    }
  }
}
