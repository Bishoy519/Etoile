import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { CoursesService, CreateCourseDto, CreateSessionDto, UpdateReminderConfigDto } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // --------------------------------------------------------------------------
  // COURSES
  // --------------------------------------------------------------------------
  // Public catalog (landing page). Contact details are redacted for anonymous
  // callers and included for signed-in viewers — see CoursesService.
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  getAllCourses(
    @Request() req: any,
    @Query('program') program?: string,
    @Query('instructorId') instructorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('branchCode') branchCode?: string,
  ) {
    return this.coursesService.getAllCourses(program, instructorId, req.user ?? null, { page, limit, branchCode });
  }

  @Get('reminders/config')
  getReminderConfig() {
    return this.coursesService.getReminderConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Patch('reminders/config')
  updateReminderConfig(@Body() dto: UpdateReminderConfigDto) {
    return this.coursesService.updateReminderConfig(dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('sessions')
  getAllSessions(
    @Request() req: any,
    @Query('courseId') courseId?: string,
    @Query('instructorId') instructorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('branchCode') branchCode?: string,
  ) {
    return this.coursesService.getSessions(courseId, instructorId, req.user ?? null, { page, limit, branchCode });
  }

  // --------------------------------------------------------------------------
  // SELF CHECK-IN QR (staff mints, family scans)
  // --------------------------------------------------------------------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Get('sessions/:sessionId/checkin-qr')
  sessionCheckinQr(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.coursesService.getSessionCheckinQr(sessionId, req.user);
  }

  /** Public resolve for scanners — no PII, token-gated by unguessable value. */
  @Get('sessions/checkin/:token')
  resolveCheckin(@Param('token') token: string) {
    return this.coursesService.resolveCheckinToken(token);
  }

  // --------------------------------------------------------------------------
  // PERSONALIZED SCHEDULES (STUDENTS & INSTRUCTORS)
  // --------------------------------------------------------------------------
  @UseGuards(OptionalJwtAuthGuard)
  @Get('student/my-schedule/:identifier')
  getStudentSchedule(@Request() req: any, @Param('identifier') identifier: string) {
    return this.coursesService.getStudentSchedule(identifier, req.user ?? null);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('instructor/my-schedule/:identifier')
  getInstructorSchedule(@Request() req: any, @Param('identifier') identifier: string) {
    return this.coursesService.getInstructorSchedule(identifier, req.user ?? null);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  getCourseById(@Request() req: any, @Param('id') id: string) {
    return this.coursesService.getCourseById(id, req.user ?? null);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post()
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Patch(':id')
  updateCourse(@Param('id') id: string, @Body() dto: Partial<CreateCourseDto>) {
    return this.coursesService.updateCourse(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete(':id')
  deleteCourse(@Param('id') id: string) {
    return this.coursesService.deleteCourse(id);
  }

  // --------------------------------------------------------------------------
  // ENROLLMENTS
  // --------------------------------------------------------------------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post(':id/enroll')
  enrollStudent(@Param('id') id: string, @Body('studentId') studentId: string) {
    return this.coursesService.enrollStudent(id, studentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete(':id/enroll/:studentId')
  unenrollStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.coursesService.unenrollStudent(id, studentId);
  }

  // --------------------------------------------------------------------------
  // WAITLIST
  // --------------------------------------------------------------------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor', 'family', 'student')
  @Post(':id/waitlist')
  joinWaitlist(
    @Param('id') id: string,
    @Body() body: { studentId: string; sessionId?: string },
    @Request() req: any,
  ) {
    return this.coursesService.joinWaitlist(id, body.studentId, body.sessionId, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Get(':id/waitlist')
  listWaitlist(@Param('id') id: string, @Query('status') status?: string) {
    return this.coursesService.listWaitlist(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('waitlist/:entryId/promote')
  promoteWaitlist(@Param('entryId') entryId: string, @Body() body: { courseId: string }, @Request() req: any) {
    return this.coursesService.promoteNext(body.courseId, entryId, req.user?.name || req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete('waitlist/:entryId')
  cancelWaitlist(@Param('entryId') entryId: string) {
    return this.coursesService.cancelWaitlist(entryId);
  }

  // --------------------------------------------------------------------------
  // SESSIONS
  // --------------------------------------------------------------------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post(':id/sessions')
  createSession(@Param('id') courseId: string, @Body() dto: Omit<CreateSessionDto, 'courseId'>) {
    return this.coursesService.createSession({ ...dto, courseId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Patch('sessions/:sessionId')
  updateSession(@Param('sessionId') sessionId: string, @Body() body: any) {
    return this.coursesService.updateSession(sessionId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete('sessions/:sessionId')
  deleteSession(@Param('sessionId') sessionId: string) {
    return this.coursesService.deleteSession(sessionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post('sessions/:sessionId/send-reminder')
  sendSessionReminders(@Param('sessionId') sessionId: string) {
    return this.coursesService.sendSessionReminders(sessionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post(':id/broadcast')
  broadcastCourseMessage(@Param('id') courseId: string, @Body('message') message: string) {
    return this.coursesService.broadcastCourseMessage(courseId, message);
  }
}

