import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('accrual')
  getAccrual(
    @Query('price') price?: string,
    @Query('totalDays') totalDays?: string,
    @Query('daysInMonth1') daysInMonth1?: string,
  ) {
    return this.accountingService.calculateAccrualAllocation(
      parseFloat(price || '4800'),
      parseInt(totalDays || '30'),
      parseInt(daysInMonth1 || '15'),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('pnl')
  getPnL() {
    return this.accountingService.getPnLStatement();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('trial-balance')
  getTrialBalance() {
    return this.accountingService.getTrialBalance();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('balance-sheet')
  getBalanceSheet() {
    return this.accountingService.getBalanceSheet();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Get('cash-flow')
  getCashFlow() {
    return this.accountingService.getCashFlow();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('deferred-waterfall')
  getDeferredWaterfall() {
    return this.accountingService.getDeferredWaterfall();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('ap-aging')
  getApAging() {
    return this.accountingService.getApAging();
  }

  /** Parent-portal invoice history — any authenticated session (family/student/staff). */
  @UseGuards(JwtAuthGuard)
  @Get('family/invoices')
  getFamilyInvoices(@Request() req: any) {
    const familyId = req.user?.familyId || req.user?.sub;
    return this.accountingService.getFamilyInvoices(familyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('expenses')
  getExpenses(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountingService.getExpenses({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('expenses')
  createExpense(@Body() data: any, @Request() req: any) {
    return this.accountingService.createExpense({ ...data, requestedBy: data.requestedBy || req.user?.name || req.user?.email });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('expenses/pending')
  getPendingExpenses() {
    return this.accountingService.getPendingExpenses();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('expenses/:id/approve')
  approveExpense(@Param('id') id: string, @Request() req: any) {
    return this.accountingService.approveExpense(id, req.user?.name || req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('expenses/:id/reject')
  rejectExpense(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.accountingService.rejectExpense(id, req.user?.name || req.user?.email, body?.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return this.accountingService.deleteExpense(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Get('invoices')
  getInvoices(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountingService.getInvoices({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('invoices')
  createInvoice(@Body() data: any) {
    return this.accountingService.createInvoice(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('invoices/:id/payments')
  recordPayment(@Param('id') id: string, @Body() data: any) {
    return this.accountingService.recordInvoicePayment(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('invoices/:id/cancel')
  cancelInvoice(@Param('id') id: string) {
    return this.accountingService.cancelInvoice(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Get('credit-notes')
  listCreditNotes(@Query('invoiceId') invoiceId?: string) {
    return this.accountingService.listCreditNotes(invoiceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('credit-notes')
  issueCreditNote(@Body() data: any, @Request() req: any) {
    return this.accountingService.issueCreditNote({ ...data, issuedBy: req.user?.name || req.user?.email });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('credit-notes/:id/apply')
  applyCreditNote(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.accountingService.applyCreditNote(id, { ...data, actorName: req.user?.name || req.user?.email });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('credit-notes/:id/void')
  voidCreditNote(@Param('id') id: string, @Request() req: any) {
    return this.accountingService.voidCreditNote(id, req.user?.name || req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('discount-policy')
  getDiscountPolicy() {
    return this.accountingService.getDiscountPolicy();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('discount-policy')
  updateDiscountPolicy(@Body() data: any) {
    return this.accountingService.updateDiscountPolicy(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Get('scholarships')
  listScholarships(@Query('status') status?: string) {
    return this.accountingService.listScholarships(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('scholarships')
  grantScholarship(@Body() data: any, @Request() req: any) {
    return this.accountingService.grantScholarship({ ...data, grantedBy: req.user?.name || req.user?.email });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('scholarships/:id/revoke')
  revokeScholarship(@Param('id') id: string, @Request() req: any) {
    return this.accountingService.revokeScholarship(id, req.user?.name || req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('budgets/vs-actual')
  budgetsVsActual(@Query('period') period?: string) {
    return this.accountingService.budgetsVsActual(period);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('budgets')
  upsertBudget(@Body() data: any, @Request() req: any) {
    return this.accountingService.upsertBudget({ ...data, createdBy: req.user?.name || req.user?.email });
  }

  /** Public FX table (EGP base) — converted display only, ledger always posts EGP. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('fx')
  listFx() {
    return this.accountingService.listFx();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('fx')
  upsertFx(@Body() data: any, @Request() req: any) {
    return this.accountingService.upsertFx({ ...data, updatedBy: req.user?.name || req.user?.email });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('payroll')
  getPayroll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountingService.getPayroll({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('payroll')
  createPayroll(@Body() data: any, @Request() req: any) {
    return this.accountingService.createPayroll({ ...data, preparedBy: req.user?.name || req.user?.email });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('payroll/sync-month')
  syncPayroll(@Body('month') month: string, @Request() req: any) {
    return this.accountingService.syncMonthInstructorPayroll(month, req.user?.name || req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('payroll/:id/approve')
  approvePayroll(@Param('id') id: string, @Request() req: any) {
    return this.accountingService.approvePayroll(id, req.user?.name || req.user?.email);
  }

  /** Instructor self-view of own slips (any authenticated session; others get []). */
  @UseGuards(JwtAuthGuard)
  @Get('payroll/mine')
  myPayroll(@Request() req: any) {
    return this.accountingService.getMyPayroll(req.user?.id || req.user?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('payroll/:id/pay')
  payPayroll(@Param('id') id: string, @Body('paymentRef') paymentRef?: string) {
    return this.accountingService.payPayroll(id, paymentRef);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('journal')
  getJournalEntries(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountingService.getJournalEntries({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('journal')
  createJournalEntry(@Body() data: any) {
    return this.accountingService.createJournalEntry(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('journal/:id/void')
  voidJournal(@Param('id') id: string) {
    return this.accountingService.voidJournalEntry(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Get('cash-shifts')
  getCashDrawerShifts(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountingService.getCashDrawerShifts({ page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post('cash-shifts')
  createCashDrawerShift(@Body() data: any) {
    return this.accountingService.createCashDrawerShift(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Patch('cash-shifts/:id/close')
  closeCashDrawerShift(
    @Param('id') id: string,
    @Body('actualCash') actualCash: number,
    @Body('notes') notes?: string,
  ) {
    return this.accountingService.closeCashDrawerShift(id, actualCash, notes);
  }
}
