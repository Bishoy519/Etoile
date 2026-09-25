import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner', 'receptionist', 'instructor')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list() {
    return this.branches.list();
  }

  @Get('academic-years')
  years() {
    return this.branches.years();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('academic-years/rollover')
  rollover(@Request() req: any) {
    return this.branches.rollover(req.user?.name || req.user?.email);
  }
}
