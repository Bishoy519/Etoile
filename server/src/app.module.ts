import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { LeadsModule } from './modules/leads/leads.module';
import { StudentsController } from './modules/students/students.controller';
import { EvaluationsController } from './modules/students/evaluations.controller';
import { StudentsService } from './modules/students/students.service';
import { SubscriptionsController } from './modules/subscriptions/subscriptions.controller';
import { SubscriptionsService } from './modules/subscriptions/subscriptions.service';
import { AttendanceController } from './modules/attendance/attendance.controller';
import { AttendanceService } from './modules/attendance/attendance.service';
import { PosController } from './modules/pos/pos.controller';
import { PosService } from './modules/pos/pos.service';
import { AccountingController } from './modules/accounting/accounting.controller';
import { AccountingService } from './modules/accounting/accounting.service';
import { OpenWaController } from './modules/openwa/openwa.controller';
import { OpenWaService } from './modules/openwa/openwa.service';
import { ContentController } from './modules/content/content.controller';
import { ContentService } from './modules/content/content.service';
import { HealthController } from './health/health.controller';

import { CoursesModule } from './modules/courses/courses.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OpsModule } from './modules/ops/ops.module';
import { EtaModule } from './modules/eta/eta.module';
import { BranchesModule } from './modules/branches/branches.module';
import { BlogModule } from './modules/blog/blog.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { TestimonialsModule } from './modules/testimonials/testimonials.module';
import { RosterModule } from './modules/roster/roster.module';
import { AcademyModule } from './modules/academy/academy.module';
import { SmsModule } from './modules/sms/sms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuthModule,
    LeadsModule,
    CoursesModule,
    AnalyticsModule,
    PaymentsModule,
    OpsModule,
    EtaModule,
    BranchesModule,
    BlogModule,
    SchedulerModule,
    NotificationsModule,
    ReferralsModule,
    TestimonialsModule,
    RosterModule,
    AcademyModule,
    SmsModule,
  ],
  controllers: [
    HealthController,
    StudentsController,
    EvaluationsController,
    SubscriptionsController,
    AttendanceController,
    PosController,
    AccountingController,
    OpenWaController,
    ContentController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    StudentsService,
    SubscriptionsService,
    AttendanceService,
    PosService,
    AccountingService,
    OpenWaService,
    ContentService,
  ],
})
export class AppModule {}
