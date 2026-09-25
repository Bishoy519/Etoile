import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { EtaService } from './eta.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist')
@Controller('eta')
export class EtaController {
  constructor(private readonly eta: EtaService) {}

  @Get('docs')
  docs() {
    return this.eta.list();
  }

  @Post('submit')
  submit(@Body() body: { invoiceId: string; invoice?: any }) {
    return this.eta.submit(body.invoiceId, body.invoice);
  }

  @Post('retry')
  retry(@Body() body: { id: string }) {
    return this.eta.retry(body.id);
  }
}
