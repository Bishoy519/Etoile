import { Module } from '@nestjs/common';
import { OpenWaService } from './openwa.service';
import { OpenWaController } from './openwa.controller';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  controllers: [OpenWaController],
  providers: [OpenWaService],
  exports: [OpenWaService],
})
export class OpenWaModule {}
