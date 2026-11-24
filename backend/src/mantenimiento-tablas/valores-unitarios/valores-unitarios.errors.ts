import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ZodError, ZodType, ZodTypeDef } from 'zod';

/** Parsea un input externo y traduce ZodError al envelope canónico de la API. */
export function parseOrThrow<Output, Input>(
  schema: ZodType<Output, ZodTypeDef, Input>,
  input: unknown,
): Output {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        code: 'validation_error',
        message: 'Validation failed',
        details: {
          errors: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }
    throw error;
  }
}

export function conflictError(message: string): never {
  throw new ConflictException({ code: 'conflict', message });
}

export function notFoundError(message: string): never {
  throw new NotFoundException({ code: 'not_found', message });
}

export function databaseUnavailableError(): never {
  throw new ServiceUnavailableException({
    code: 'database_unavailable',
    message: 'Base de datos no disponible',
  });
}
