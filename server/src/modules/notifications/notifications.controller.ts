import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly feed: NotificationsService,
    private readonly push: PushService,
  ) {}

  /** Unified inbox for the signed-in household (family/student) or staff member. */
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@Request() req: any) {
    return this.feed.mine(req.user || {});
  }

  /** VAPID public key for browser subscription (safe to expose). */
  @Get('push/vapid-key')
  vapidKey() {
    return this.push.vapidKey();
  }

  @UseGuards(JwtAuthGuard)
  @Post('push/subscribe')
  subscribe(@Request() req: any, @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    const user = req.user || {};
    const isStaff = ['superadmin', 'owner', 'receptionist', 'instructor'].includes(user.role);
    return this.push.subscribe(body, {
      familyId: !isStaff ? user.familyId || user.sub : undefined,
      staffId: isStaff ? user.id || user.sub : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('read-all')
  markAllRead(@Request() req: any) {
    const user = req.user || {};
    return this.feed.markStaffAllRead(user.id || user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('push/unsubscribe')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.push.unsubscribe(body?.endpoint);
  }
}
