import { createZodDto } from 'nestjs-zod';
import {
  AnalyzeMeetingDto as AnalyzeMeetingSchema,
  CreatePersonaDto as CreatePersonaSchema,
  LinkMeetingDto as LinkMeetingSchema,
} from '@evertrust/shared';

// Validated by the global ZodValidationPipe against the shared schemas.
export class LinkMeetingBodyDto extends createZodDto(LinkMeetingSchema) {}
export class AnalyzeMeetingBodyDto extends createZodDto(AnalyzeMeetingSchema) {}
export class CreatePersonaBodyDto extends createZodDto(CreatePersonaSchema) {}
