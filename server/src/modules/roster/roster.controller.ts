import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { RosterService } from './roster.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist', 'instructor')
@Controller('roster')
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @Get('shifts')
  shifts(@Query() q: { from?: string; to?: string; staffId?: string; mine?: string }, @Request() req: any) {
    return this.roster.listShifts(q, req.user);
  }

  @Post('shifts')
  createShift(@Body() body: { staffId: string; date: string; startTime?: string; endTime?: string; duty?: string; notes?: string }, @Request() req: any) {
    return this.roster.createShift(body, req.user);
  }

  @Patch('shifts/:id')
  setShift(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.roster.setShiftStatus(id, body.status, req.user);
  }

  @Delete('shifts/:id')
  deleteShift(@Param('id') id: string, @Request() req: any) {
    return this.roster.deleteShift(id, req.user);
  }

  @Get('leaves')
  leaves(@Query() q: { status?: string; mine?: string; staffId?: string }, @Request() req: any) {
    return this.roster.listLeaves(q, req.user);
  }

  @Post('leaves')
  requestLeave(@Body() body: { from: string; to: string; reason?: string; staffId?: string }, @Request() req: any) {
    return this.roster.requestLeave(body, req.user);
  }

  @Post('leaves/:id/decide')
  decideLeave(@Param('id') id: string, @Body() body: { approve: boolean }, @Request() req: any) {
    return this.roster.decideLeave(id, body.approve === true, req.user);
  }
}
