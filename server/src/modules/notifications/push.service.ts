import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as webPush from 'web-push';

export interface PushPayload {
  title: string;
  titleAr?: string;
  body: string;
  url?: string;
  tag?: string;
}

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webPush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@etoile.academy', pub, priv);
    vapidConfigured = true;
    return true;
  } catch {
    return false;
  }
}

/** Web-Push bridge: native lock-screen receipts alongside WhatsApp. */
@Injectable()
export class PushService {
  private readonly log = new Logger('Push');
  constructor(private readonly prisma: PrismaService) {}

  vapidKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || null, configured: ensureVapid() };
  }

  async subscribe(
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    owner: { familyId?: string; staffId?: string },
  ) {
    if (!sub?.endpoint?.startsWith('https://')) throw new BadRequestException('Push endpoint must be https');
    if (!sub.keys?.p256dh || !sub.keys?.auth) throw new BadRequestException('Push keys are required');
    if (!owner.familyId && !owner.staffId) throw new BadRequestException('Subscription owner required');
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, familyId: owner.familyId || null, staffId: owner.staffId || null },
      create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, familyId: owner.familyId || null, staffId: owner.staffId || null },
    });
  }

  async unsubscribe(endpoint: string) {
    if (!endpoint) return { success: true };
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } }).catch(() => null);
    return { success: true };
  }

  private async fanOut(
    where: { familyId?: string; staffId?: string },
    payload: PushPayload,
  ): Promise<{ sent: number; dropped: number }> {
    if (!ensureVapid()) return { sent: 0, dropped: 0 };
    const subs = await this.prisma.pushSubscription.findMany({ where }).catch(() => []);
    let sent = 0;
    let dropped = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webPush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ ...payload, url: payload.url || '/' }),
            { TTL: 24 * 60 * 60 },
          );
          sent += 1;
        } catch (e: any) {
          // 404/410 = uninstalled; prune so the table never rots.
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => null);
          }
          dropped += 1;
        }
      }),
    );
    return { sent, dropped };
  }

  notifyFamily(familyId: string, payload: PushPayload) {
    if (!familyId) return Promise.resolve({ sent: 0, dropped: 0 });
    return this.fanOut({ familyId }, payload).catch((e) => {
      this.log.warn(`push to family failed: ${(e as Error).message}`);
      return { sent: 0, dropped: 0 };
    });
  }
}
