import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SubscriptionsService, EvaluatePlanDto } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  getAvailablePlans(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.subscriptionsService.getAvailablePlans({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('plans')
  createPlan(@Body() body: any) {
    return this.subscriptionsService.createPlan(body);
  }

  @Post('evaluate')
  evaluatePlan(@Body() dto: EvaluatePlanDto) {
    return this.subscriptionsService.evaluatePlan(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('reserve')
  reserve(@Body() body: { studentId: string; planId: string; promoCode?: string }, @Request() req: any) {
    return this.subscriptionsService.reserve({ ...body, actorName: req.user?.name || req.user?.email });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('promos')
  listPromos() {
    return this.subscriptionsService.listPromos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('promos')
  createPromo(@Body() body: any, @Request() req: any) {
    return this.subscriptionsService.createPromo({ ...body, createdBy: req.user?.name || req.user?.email });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('promos/:code')
  setPromoActive(@Param('code') code: string, @Body() body: { active: boolean }) {
    return this.subscriptionsService.setPromoActive(code, body.active !== false);
  }
}
