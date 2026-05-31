import { Module } from '@nestjs/common';
import { ArsenalController } from './arsenal.controller';
import { ArsenalService } from './arsenal.service';
import { ArsenalScheduler } from './arsenal.scheduler';

// Arsenal triggers: manual "Run now" (controller) + the ERP-owned daily Bazooka
// send (scheduler). DB + AppConfigService are global; the service consumes them.
@Module({
  controllers: [ArsenalController],
  providers: [ArsenalService, ArsenalScheduler],
})
export class ArsenalModule {}
