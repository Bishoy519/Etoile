import { Controller, Post, UseGuards } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'owner')
@Controller('ops/nightly')
export class SchedulerController {
  constructor(private readonly nightly: SchedulerService) {}

  @Post('run')
  run() {
    return this.nightly.run();
  }

  @Post('aging')
  aging() {
    return this.nightly.refreshAging();
  }

  @Post('expire-links')
  expire() {
    return this.nightly.expireLinks();
  }
}
