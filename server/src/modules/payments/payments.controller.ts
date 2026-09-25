import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('paylink')
  createPayLink(
    @Body()
    body: {
      invoiceId?: string;
      studentId?: string;
      amount: number;
      provider: string;
      phone?: string;
    },
  ) {
    return this.paymentsService.createPayLink(body);
  }

  /** Public link-status lookup for the portal pay page (no PII exposed). */
  @Get('paylink/:ref')
  getPayLinkStatus(@Param('ref') ref: string) {
    return this.paymentsService.getPayLinkStatus(ref);
  }

  /** Parent-portal: create a pay-link for your own invoice (family/student session). */
  @UseGuards(JwtAuthGuard)
  @Post('paylink/family')
  createFamilyPayLink(@Request() req: any, @Body() body: { invoiceId: string; provider: string }) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.paymentsService.createFamilyPayLink(familyId, body);
  }

  /**
   * Public provider callback, authenticated by the unguessable link ref.
   * Reconciles the link to paid/failed/expired/cancelled (idempotent).
   */
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('webhook')
  handleWebhook(@Body() body: { ref?: string; status?: string; providerRef?: string }) {
    return this.paymentsService.handleWebhook(body);
  }
}
