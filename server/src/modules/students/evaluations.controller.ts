import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist', 'instructor')
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.studentsService.deleteEvaluation(id);
  }
}
