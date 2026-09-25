import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AcademyService } from './academy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const STAFF = ['superadmin', 'owner', 'receptionist', 'instructor'] as const;

@Controller('academy')
export class AcademyController {
  constructor(private readonly academy: AcademyService) {}

  // -- Categories (public list; managed by directors) --
  @Get('categories')
  categories(@Query('inactive') inactive?: string) {
    return this.academy.listCategories(inactive === 'true');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('categories')
  createCategory(@Body() body: any, @Request() req: any) {
    return this.academy.createCategory(body, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.academy.updateCategory(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Delete('categories/:id')
  archiveCategory(@Param('id') id: string, @Request() req: any) {
    return this.academy.archiveCategory(id, req.user);
  }

  // -- Groups --
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF)
  @Get('groups')
  groups(@Query() q: { categoryId?: string; instructorId?: string; branchCode?: string; includeInactive?: string }) {
    return this.academy.listGroups(q);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF)
  @Get('groups/:id')
  group(@Param('id') id: string) {
    return this.academy.getGroup(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('groups')
  createGroup(@Body() body: any, @Request() req: any) {
    return this.academy.createGroup(body, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.academy.updateGroup(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Delete('groups/:id')
  archiveGroup(@Param('id') id: string, @Request() req: any) {
    return this.academy.archiveGroup(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('groups/:id/clone')
  cloneGroup(@Param('id') id: string, @Body() body: { title?: string; startDate: string }, @Request() req: any) {
    return this.academy.cloneGroup(id, body, req.user);
  }

  // -- Group sessions --
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF)
  @Get('groups/:id/sessions')
  groupSessions(@Param('id') id: string) {
    return this.academy.listGroupSessions(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('groups/:id/sessions')
  createGroupSession(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.academy.createGroupSession(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('groups/:id/sessions/bulk')
  bulkGroupSessions(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.academy.bulkGroupSessions(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('sessions/:id/cancel')
  cancelSession(
    @Param('id') id: string,
    @Body() body: { reason?: string; compensationType?: 'credit_session' | 'wallet_credit' | 'none'; walletAmount?: number; notifyWhatsapp?: boolean },
    @Request() req: any,
  ) {
    return this.academy.cancelSessionAndCompensate(id, body, req.user);
  }

  // -- Group enrollments + waitlist --
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('groups/:id/enroll')
  enroll(@Param('id') id: string, @Body('studentId') studentId: string, @Request() req: any) {
    return this.academy.enrollInGroup(id, studentId, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete('groups/:id/enroll/:studentId')
  unenroll(@Param('id') id: string, @Param('studentId') studentId: string, @Request() req: any) {
    return this.academy.unenrollFromGroup(id, studentId, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor', 'family', 'student')
  @Post('groups/:id/waitlist')
  joinWaitlist(@Param('id') id: string, @Body('studentId') studentId: string, @Request() req: any) {
    return this.academy.joinGroupWaitlist(id, studentId, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF)
  @Get('groups/:id/waitlist')
  groupWaitlist(@Param('id') id: string, @Query('status') status?: string) {
    return this.academy.listGroupWaitlist(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('groups/:id/waitlist/promote')
  promoteWaitlist(@Param('id') id: string, @Request() req: any) {
    return this.academy.promoteGroupWaitlist(id, req.user?.name || req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete('groups/waitlist/:entryId')
  cancelWaitlist(@Param('entryId') entryId: string) {
    return this.academy.cancelGroupWaitlist(entryId);
  }

  // -- Workload --
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF)
  @Get('workload/instructors')
  workload() {
    return this.academy.instructorWorkload();
  }
}
