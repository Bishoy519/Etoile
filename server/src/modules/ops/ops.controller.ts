import { Controller, Get, Post, Query, Body, Request, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist', 'instructor')
@Controller('ops')
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get('renewal-queue')
  getRenewalQueue() {
    return this.opsService.getRenewalQueue();
  }

  @Get('schedule-conflicts')
  getScheduleConflicts() {
    return this.opsService.getScheduleConflicts();
  }

  @Get('funnel-sla')
  getFunnelSla() {
    return this.opsService.getFunnelSla();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('audit-log')
  getAuditLog(@Query('page') page?: string, @Query('limit') limit?: string, @Query('category') category?: string, @Query('search') search?: string) {
    return this.opsService.getAuditLog({ page, limit, category, search });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('deletion-requests')
  deletionRequests() {
    return this.opsService.getDeletionRequests();
  }

  @Get('celebrations')
  getCelebrations(@Query('days') days?: string) {
    const n = Math.min(90, Math.max(1, parseInt(days || '30', 10) || 30));
    return this.opsService.upcomingCelebrations(n);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('celebrations/dispatch')
  dispatchCelebrations(@Body() body: { days?: number }, @Request() req: any) {
    const n = Math.min(30, Math.max(1, Math.floor(Number(body?.days) || 7)));
    return this.opsService.dispatchCelebrations(n, req.user?.name || req.user?.email);
  }
}
