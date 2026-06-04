import { createZodDto } from 'nestjs-zod';
import {
  AnalyzeMeetingDto as AnalyzeMeetingSchema,
  IngestMeetingDto as IngestMeetingSchema,
  LinkMeetingDto as LinkMeetingSchema,
} from '@evertrust/shared';

// Validated by the global ZodValidationPipe against the shared schemas.
export class LinkMeetingBodyDto extends createZodDto(LinkMeetingSchema) {}
export class AnalyzeMeetingBodyDto extends createZodDto(AnalyzeMeetingSchema) {}
export class IngestMeetingBodyDto extends createZodDto(IngestMeetingSchema) {}
