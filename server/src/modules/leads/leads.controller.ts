import { Controller, Post, Body, Get, Patch, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateTrialDto } from './dto/create-trial.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // Public endpoint - called by EnrollModal on public landing page
  @Post()
  async submitLead(@Body() dto: CreateLeadDto) {
    return this.leadsService.createLead(dto);
  }

  /** Public trial-class availability (fixed studio hours, Africa/Cairo). */
  @Get('trial-slots')
  trialSlots() {
    return this.leadsService.getTrialSlots();
  }

  /** Public trial-class booking — enters the pipeline as trial_scheduled. */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('trial')
  bookTrial(@Body() dto: CreateTrialDto) {
    return this.leadsService.createTrialLead(dto);
  }

  // Staff CRM endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Get()
  async getAllLeads(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.leadsService.getAllLeads({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Patch(':id/stage')
  async updateStage(@Param('id') id: string, @Body('stage') stage: string) {
    return this.leadsService.updateLeadStage(id, stage);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post(':id/convert')
  async convertToStudent(@Param('id') id: string, @Body('planTier') planTier?: string) {
    return this.leadsService.convertLeadToStudent(id, planTier);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete(':id')
  async deleteLead(@Param('id') id: string) {
    return this.leadsService.deleteLead(id);
  }
}
