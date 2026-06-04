import { createZodDto } from 'nestjs-zod';
import { LinkMeetingDto as LinkMeetingSchema } from '@evertrust/shared';

// Validated by the global ZodValidationPipe against the shared schema.
export class LinkMeetingBodyDto extends createZodDto(LinkMeetingSchema) {}
