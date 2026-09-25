import { Controller, Post, Body, Get, UseGuards, Request, Patch, Param, Delete, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Brute-force-sensitive endpoints carry per-route limits on top of the
  // global 120 req/min guard. Password guessing is primarily defeated by
  // per-account lockout (10 strikes → 15-min lock), so IP budgets stay
  // generous enough for reception-desk bursts and audit-suite cadence.
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('demo-cards')
  async getDemoCards() {
    return this.authService.getDemoCards();
  }

  // --------------------------------------------------------------------------
  // CARD CODE & WHATSAPP AUTHENTICATION ENDPOINTS
  // --------------------------------------------------------------------------
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('card-login')
  async cardLogin(@Body() body: { cardCode?: string; identifier?: string; password?: string }) {
    const code = (body.cardCode || body.identifier || '').trim();
    return this.authService.loginWithCardCode(code, body.password);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('request-initial-password')
  async requestInitialPassword(@Body() body: { cardCode?: string; identifier?: string } | string) {
    const code = typeof body === 'string' ? body : (body?.cardCode || body?.identifier || '');
    return this.authService.requestInitialPassword(code.trim());
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('first-time-setup')
  async firstTimeSetup(
    @Body() body: { cardCode?: string; identifier?: string; tempPassword: string; newPassword: string },
  ) {
    const code = (body.cardCode || body.identifier || '').trim();
    return this.authService.completeFirstTimeSetup(code, body.tempPassword, body.newPassword);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('forgot-password/request-otp')
  async forgotPasswordRequestOtp(@Body() body: { cardCode?: string; identifier?: string } | string) {
    const code = typeof body === 'string' ? body : (body?.cardCode || body?.identifier || '');
    return this.authService.requestPasswordResetOtp(code.trim());
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('forgot-password/reset')
  async forgotPasswordReset(
    @Body() body: { cardCode?: string; identifier?: string; otp: string; newPassword: string },
  ) {
    const code = (body.cardCode || body.identifier || '').trim();
    return this.authService.resetPasswordWithOtp(code, body.otp, body.newPassword);
  }

  // --------------------------------------------------------------------------
  // SESSION REFRESH & LOGOUT (rotating opaque refresh tokens)
  // --------------------------------------------------------------------------
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Body() body: { refreshToken?: string }) {
    return this.authService.refreshSession(body?.refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }) {
    return this.authService.logout(body?.refreshToken);
  }


  @UseGuards(JwtAuthGuard)
  @Get('family/me')
  async getFamilyProfile(@Request() req: any) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.authService.getFamilyProfile(familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('family/onboarding')
  async getOnboarding(@Request() req: any) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.authService.getOnboarding(familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('family/export')
  async exportData(@Request() req: any) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.authService.exportFamilyData(familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('family/deletion')
  async deletionStatus(@Request() req: any) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.authService.deletionStatus(familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('family/deletion/request')
  async requestDeletion(@Request() req: any) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.authService.requestDeletion(familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('family/deletion/cancel')
  async cancelDeletion(@Request() req: any) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.authService.cancelDeletion(familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('staff')
  async getStaff() {
    return this.authService.getStaffList();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('staff/:id/shift')
  async toggleShift(@Param('id') id: string) {
    return this.authService.toggleShift(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('staff/:id/role')
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.authService.updateRole(id, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Patch('staff/:id/avatar')
  async updateAvatar(
    @Param('id') id: string,
    @Body('avatarUrl') avatarUrl: string,
    @Request() req: any,
  ) {
    const requestingUserId = req?.user?.sub || req?.user?.id;
    const requestingUserRole = req?.user?.role;
    // Allow directors/owners to update any staff avatar; instructors and receptionists can update their own
    if (
      requestingUserRole !== 'superadmin' &&
      requestingUserRole !== 'owner' &&
      requestingUserId !== id
    ) {
      throw new ForbiddenException('You can only update your own profile avatar.');
    }
    return this.authService.updateAvatar(id, avatarUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('staff/:id/password')
  async resetPassword(@Param('id') id: string, @Body('password') password: string) {
    return this.authService.resetPassword(id, password);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Delete('staff/:id')
  async deleteStaff(@Param('id') id: string, @Request() req: any) {
    const requestingUserId = req?.user?.sub || req?.user?.id;
    return this.authService.deleteStaff(id, requestingUserId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('staff')
  async createStaff(@Body() body: any) {
    return this.authService.createStaff(body);
  }
}
