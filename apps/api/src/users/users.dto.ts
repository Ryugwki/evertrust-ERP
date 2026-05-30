import { createZodDto } from 'nestjs-zod';
import { UpdateMyNameDto as UpdateMyNameSchema } from '@evertrust/shared';

// Validated by the global ZodValidationPipe against the shared schema.
export class UpdateMyNameBodyDto extends createZodDto(UpdateMyNameSchema) {}
