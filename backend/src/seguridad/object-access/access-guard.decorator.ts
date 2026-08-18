import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ObjectAccessGuard, ACCESS_GUARD_OBJETO, ACCESS_GUARD_ACCESO } from './object-access.guard';

/**
 * Parameterized decorator that protects a mutation endpoint with the
 * ObjectAccessGuard. Extracts `id_objeto` from the decorator argument
 * and optionally accepts an `id_acceso` override.
 *
 * Usage:
 *   @AccessGuard('btnGuardar')        — id_acceso from JWT / request body
 *   @AccessGuard('btnGuardar', 42)    — explicit id_acceso
 */
export function AccessGuard(id_objeto: string, id_acceso?: number) {
  return applyDecorators(
    SetMetadata(ACCESS_GUARD_OBJETO, id_objeto),
    SetMetadata(ACCESS_GUARD_ACCESO, id_acceso),
    UseGuards(ObjectAccessGuard),
  );
}
