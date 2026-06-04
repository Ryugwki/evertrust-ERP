import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { PersonasController } from './personas.controller';
import { PersonasService } from './personas.service';

@Module({
  imports: [AiModule],
  controllers: [MeetingsController, PersonasController],
  providers: [MeetingsService, PersonasService],
})
export class MeetingsModule {}
