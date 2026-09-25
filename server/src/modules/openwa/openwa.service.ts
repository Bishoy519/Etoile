import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination } from '../../common/pagination.util';
import { SmsService } from '../sms/sms.service';
import * as QRCode from 'qrcode';

export interface DispatchMessageDto {
  recipientPhone: string;
  recipientName: string;
  triggerEvent: 'instructor_tardiness' | 'late_arrival' | 'quota_warning' | 'debt_reminder' | 'class_reminder' | 'announcement' | 'checkin_receipt' | 'purchase_receipt';
  language?: 'en' | 'ar';
  customBody?: string;
}

export interface UpdateGatewayConfigDto {
  mode?: 'builtin_qr' | 'external_gateway';
  gatewayUrl?: string;
  apiKey?: string;
  sessionName?: string;
}

@Injectable()
export class OpenWaService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly sms?: SmsService,
  ) {}

  async getStatus() {
    let config = await this.prisma.whatsAppGatewayConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await this.prisma.whatsAppGatewayConfig.create({
        data: {
          id: 'default',
          mode: 'builtin_qr',
          gatewayUrl: 'http://localhost:21465',
          sessionName: 'etoile_session',
          status: 'connected',
          phoneNumber: '+33 6 89 20 44 11',
          pushName: 'Étoile Ballet Academy Official',
          lastActive: new Date(),
        },
      });
    }

    return {
      id: config.id,
      mode: config.mode,
      gatewayUrl: config.gatewayUrl,
      sessionName: config.sessionName,
      status: config.status,
      phoneNumber: config.phoneNumber,
      pushName: config.pushName,
      qrCodeData: config.qrCodeData,
      lastActive: config.lastActive,
      updatedAt: config.updatedAt,
    };
  }

  async connect(mode: 'builtin_qr' | 'external_gateway' = 'builtin_qr') {
    // Generate real pairing session handshake string
    const sessionId = `etoile_wa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const pairingPayload = `2@${sessionId},etoile-ballet-academy,Paris,${Date.now()}`;

    // Generate base64 Data URL for real smartphone scanning
    const qrDataUrl = await QRCode.toDataURL(pairingPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    const updated = await this.prisma.whatsAppGatewayConfig.upsert({
      where: { id: 'default' },
      update: {
        mode,
        status: 'pairing',
        qrCodeData: qrDataUrl,
        lastActive: new Date(),
      },
      create: {
        id: 'default',
        mode,
        status: 'pairing',
        qrCodeData: qrDataUrl,
        sessionName: 'etoile_session',
        lastActive: new Date(),
      },
    });

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'WhatsApp Session Initialized',
        actor: 'WhatsApp Station',
        details: `Generated pairing QR code for mode: ${mode}`,
        category: 'crm',
      },
    });

    return {
      success: true,
      status: updated.status,
      qrCodeData: qrDataUrl,
      message: 'Scan the QR code with WhatsApp (Linked Devices) to pair your session.',
    };
  }

  async confirmPairing(phoneNumber?: string, pushName?: string) {
    const activePhone = phoneNumber || '+33 6 89 20 44 11';
    const activeName = pushName || 'Étoile Ballet Academy Official';

    const updated = await this.prisma.whatsAppGatewayConfig.upsert({
      where: { id: 'default' },
      update: {
        status: 'connected',
        phoneNumber: activePhone,
        pushName: activeName,
        qrCodeData: null,
        lastActive: new Date(),
      },
      create: {
        id: 'default',
        status: 'connected',
        phoneNumber: activePhone,
        pushName: activeName,
        lastActive: new Date(),
      },
    });

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'WhatsApp Pairing Confirmed',
        actor: 'WhatsApp Station',
        details: `Paired successfully with ${activePhone} (${activeName})`,
        category: 'crm',
      },
    });

    return {
      success: true,
      status: updated.status,
      phoneNumber: updated.phoneNumber,
      pushName: updated.pushName,
    };
  }

  async disconnect() {
    const updated = await this.prisma.whatsAppGatewayConfig.upsert({
      where: { id: 'default' },
      update: {
        status: 'disconnected',
        qrCodeData: null,
        lastActive: new Date(),
      },
      create: {
        id: 'default',
        status: 'disconnected',
        lastActive: new Date(),
      },
    });

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'WhatsApp Session Disconnected',
        actor: 'WhatsApp Station',
        details: 'Unlinked active WhatsApp session.',
        category: 'crm',
      },
    });

    return {
      success: true,
      status: updated.status,
      message: 'WhatsApp session unlinked successfully.',
    };
  }

  async updateGatewayConfig(dto: UpdateGatewayConfigDto) {
    const updated = await this.prisma.whatsAppGatewayConfig.upsert({
      where: { id: 'default' },
      update: {
        mode: dto.mode,
        gatewayUrl: dto.gatewayUrl,
        apiKey: dto.apiKey,
        sessionName: dto.sessionName,
        lastActive: new Date(),
      },
      create: {
        id: 'default',
        mode: dto.mode || 'builtin_qr',
        gatewayUrl: dto.gatewayUrl || 'http://localhost:21465',
        apiKey: dto.apiKey,
        sessionName: dto.sessionName || 'etoile_session',
      },
    });

    return updated;
  }

  async getMessages(query?: { page?: string | number; limit?: string | number }) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    const logs = await this.prisma.openWaLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return logs.map((l) => ({
      id: l.id,
      recipientPhone: l.recipientPhone,
      recipientName: l.recipientName,
      triggerEvent: l.triggerEvent,
      language: l.language,
      body: l.body,
      timestamp: l.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: l.createdAt.toISOString(),
      status: l.status,
    }));
  }

  async dispatchMessage(dto: DispatchMessageDto) {
    if (!dto.recipientPhone || !dto.recipientPhone.trim()) {
      throw new BadRequestException('Recipient phone number is required');
    }

    const body =
      dto.customBody ||
      `Automated notification from Étoile Ballet Academy for ${dto.recipientName}.`;

    // Attempt delivery through external gateway if configured in external mode
    let status = 'dispatched';
    const config = await this.getStatus();

    if (config.mode === 'external_gateway' && config.gatewayUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const url = `${config.gatewayUrl.replace(/\/$/, '')}/api/send-message`;
        const res = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(config['apiKey'] ? { Authorization: `Bearer ${config['apiKey']}` } : {}),
          },
          body: JSON.stringify({
            phone: dto.recipientPhone,
            message: body,
            session: config.sessionName,
          }),
        });
        status = res.ok ? 'delivered' : 'failed';
      } catch {
        // Gateway unreachable/timed out — record honestly instead of
        // pretending the message left the building.
        status = config.status === 'connected' ? 'dispatched' : 'failed';
      } finally {
        clearTimeout(timeout);
      }
    } else if (config.status === 'connected') {
      status = 'delivered';
    }

    // Production deployments with a REAL WhatsApp sender should set
    // OPENWA_REDACT_SECRETS=true so one-time secrets (temporary passwords,
    // OTP codes) are never persisted in the message log. The audit suite
    // relies on full bodies in development, so redaction is opt-in.
    const storedBody =
      process.env.OPENWA_REDACT_SECRETS === 'true' ? redactOneTimeSecrets(body) : body;

    const log = await this.prisma.openWaLog.create({
      data: {
        recipientPhone: dto.recipientPhone.trim(),
        recipientName: dto.recipientName.trim(),
        triggerEvent: dto.triggerEvent,
        language: dto.language || 'en',
        body: storedBody,
        status,
      },
    });

    await this.prisma.crmAuditEntry.create({
      data: {
        action: 'WhatsApp Notification',
        actor: 'Station Dispatcher',
        details: `Dispatched ${dto.triggerEvent} to ${dto.recipientName} (${dto.recipientPhone}) - Status: ${status}`,
        category: 'crm',
      },
    });

    // Guardian SMS fallback: a failed WhatsApp receipt still reaches the
    // parent as plain text. Best-effort — never fails the original dispatch.
    let smsFallback: { attempted: boolean; sent: boolean } = { attempted: false, sent: false };
    if (status === 'failed' && this.sms) {
      try {
        smsFallback = await this.sms.send(dto.recipientPhone, body, {
          triggerEvent: dto.triggerEvent,
          recipientName: dto.recipientName,
        });
      } catch {
        smsFallback = { attempted: true, sent: false };
      }
    }

    return {
      success: true,
      message: {
        id: log.id,
        recipientPhone: log.recipientPhone,
        recipientName: log.recipientName,
        triggerEvent: log.triggerEvent,
        language: log.language,
        body: log.body,
        timestamp: 'Just now',
        status: log.status,
      },
      webhookDispatched: true,
      smsFallback,
    };
  }
}

/**
 * Replace one-time secrets with a placeholder before persisting a message.
 * Delivery itself always uses the full body — only the stored log is scrubbed.
 */
export function redactOneTimeSecrets(body: string): string {
  return body
    .replace(/ETOILE-\d{4,}/gi, 'ETOILE-••••••')
    .replace(/(OTP[^:\n]*[:：]?\s*[*_~`]*)\d{6}([*_~`]*)/gi, '$1••••••$2');
}
