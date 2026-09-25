import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { OpenWaService, DispatchMessageDto, UpdateGatewayConfigDto } from './openwa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('openwa')
export class OpenWaController {
  constructor(private readonly openWaService: OpenWaService) {}

  // -- Gateway management: staff only -------------------------------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Get('status')
  getStatus() {
    return this.openWaService.getStatus();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post('connect')
  connect(@Body('mode') mode: 'builtin_qr' | 'external_gateway') {
    return this.openWaService.connect(mode);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post('pair-confirm')
  confirmPairing(
    @Body('phoneNumber') phoneNumber?: string,
    @Body('pushName') pushName?: string,
  ) {
    return this.openWaService.confirmPairing(phoneNumber, pushName);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post('disconnect')
  disconnect() {
    return this.openWaService.disconnect();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Get('gateway-config')
  getGatewayConfig() {
    return this.openWaService.getStatus();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Patch('gateway-config')
  updateGatewayConfig(@Body() dto: UpdateGatewayConfigDto) {
    return this.openWaService.updateGatewayConfig(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Get('messages')
  getMessages(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.openWaService.getMessages({ page, limit });
  }

  // -- Notification triggers: families & students may notify their own
  // household (e.g. quota/debt alerts from the portal); staff unrestricted.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor', 'family', 'student')
  @Post('dispatch')
  dispatchMessage(@Body() dto: DispatchMessageDto) {
    return this.openWaService.dispatchMessage(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor', 'family', 'student')
  @Post('webhook')
  triggerWebhook(@Body() dto: DispatchMessageDto) {
    return this.openWaService.dispatchMessage(dto);
  }
}
