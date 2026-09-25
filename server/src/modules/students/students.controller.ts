import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist', 'instructor')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.studentsService.findAll({ page, limit });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.studentsService.findById(id);
  }

  @Post()
  register(@Body() body: any) {
    return this.studentsService.registerStudent(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.studentsService.updateStudent(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.studentsService.deleteStudent(id);
  }

  @Patch(':id/wallet')
  adjustWallet(@Param('id') id: string, @Body('amount') amount: number) {
    return this.studentsService.adjustWallet(id, amount);
  }

  @Patch(':id/quota')
  adjustQuota(@Param('id') id: string, @Body('delta') delta: number) {
    return this.studentsService.adjustQuota(id, delta);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.studentsService.addNote(id, body, req.user);
  }

  @Post(':id/evaluations')
  addEvaluation(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.studentsService.addEvaluation(id, body, req.user);
  }

  /** Document vault — household-scoped for families, open for staff. */
  @UseGuards(JwtAuthGuard)
  @Get(':id/documents')
  listDocuments(@Param('id') id: string, @Request() req: any) {
    return this.studentsService.listDocuments(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/documents')
  uploadDocument(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.studentsService.uploadDocument(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('documents/:docId/file')
  downloadDocument(@Param('docId') docId: string, @Request() req: any) {
    return this.studentsService.downloadDocument(docId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('documents/:docId')
  deleteDocument(@Param('docId') docId: string, @Request() req: any) {
    return this.studentsService.deleteDocument(docId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/certificates')
  listCertificates(@Param('id') id: string, @Request() req: any) {
    return this.studentsService.listCertificates(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/birthdate')
  setBirthDate(@Param('id') id: string, @Body() body: { birthDate: string }, @Request() req: any) {
    return this.studentsService.setBirthDate(id, body?.birthDate, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/progress')
  getProgress(@Param('id') id: string, @Request() req: any) {
    return this.studentsService.getProgress(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/report')
  getReport(@Param('id') id: string, @Request() req: any) {
    return this.studentsService.getProgress(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist', 'instructor')
  @Post(':id/certificates')
  issueCertificate(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.studentsService.issueCertificate(id, body, req.user);
  }
}
