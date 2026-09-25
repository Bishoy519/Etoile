import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  /** Family portal: my code + funnel stats. */
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@Request() req: any) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.referrals.myStats(familyId);
  }

  /** Staff: pipeline + one-click wallet rewards. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get()
  list(@Query('status') status?: string) {
    return this.referrals.list(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post(':id/reward')
  reward(@Param('id') id: string, @Body() body: { studentId: string; amount: number }, @Request() req: any) {
    return this.referrals.reward(id, body.studentId, body.amount, req.user?.name || req.user?.email);
  }
}
