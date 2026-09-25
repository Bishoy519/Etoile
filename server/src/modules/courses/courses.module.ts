import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OpenWaService } from '../openwa/openwa.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CoursesController],
  providers: [CoursesService, OpenWaService],
  exports: [CoursesService],
})
export class CoursesModule {}
