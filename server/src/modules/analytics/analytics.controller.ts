import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService, AnalyticsRange } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist', 'instructor')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analytics.overview();
  }

  @Get('trend')
  trend(
    @Query('range') range?: string,
    @Query('metric') metric?: string,
  ) {
    const r: AnalyticsRange = range === '30D' || range === '12M' ? (range as AnalyticsRange) : '90D';
    const m = metric === 'attendance' || metric === 'enrollment' ? metric : 'revenue';
    return this.analytics.trend(r, m);
  }

  @Get('attention')
  attention() {
    return this.analytics.attention();
  }

  @Get('forecast')
  forecast() {
    return this.analytics.forecast();
  }
}
