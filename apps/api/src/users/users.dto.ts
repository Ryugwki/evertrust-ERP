import { createZodDto } from 'nestjs-zod';
import {
  UpdateMyNameDto as UpdateMyNameSchema,
  UpdateUserDto as UpdateUserSchema,
} from '@evertrust/shared';

// Validated by the global ZodValidationPipe against the shared schemas.
export class UpdateMyNameBodyDto extends createZodDto(UpdateMyNameSchema) {}
export class UpdateUserBodyDto extends createZodDto(UpdateUserSchema) {}
