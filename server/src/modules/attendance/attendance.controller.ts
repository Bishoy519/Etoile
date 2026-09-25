import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AttendanceService, CheckInRequestDto } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist', 'instructor', 'family', 'student')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('checkin')
  checkIn(@Request() req: any, @Body() dto: CheckInRequestDto) {
    // Families/students are household-scoped inside the service; staff are unrestricted.
    return this.attendanceService.processCheckIn(dto, req.user ?? undefined);
  }

  @Post('self-checkin')
  selfCheckin(@Request() req: any, @Body() body: { token: string; studentId: string }) {
    return this.attendanceService.selfCheckin(body.token, body.studentId, req.user ?? undefined);
  }

  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post('session-mark')
  markSession(
    @Request() req: any,
    @Body() body: { sessionId: string; records: Array<{ studentId: string; present: boolean }> },
  ) {
    return this.attendanceService.markSessionAttendance(body.sessionId, body.records, req.user);
  }

  @Get('logs')
  getLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.attendanceService.getLogs({ page, limit });
  }
}
