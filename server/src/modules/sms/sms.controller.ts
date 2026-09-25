import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist')
@Controller('sms')
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  @Get('status')
  status() {
    return this.sms.status();
  }

  @Roles('superadmin', 'owner')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('test')
  async test(@Body() body: { phone: string; message?: string }) {
    if (!body?.phone) return { attempted: false, sent: false, error: 'phone required' };
    return this.sms.send(body.phone, body.message || 'Étoile test message — reply STOP to opt out.', {
      triggerEvent: 'announcement',
      recipientName: 'Staff test',
    });
  }
}
