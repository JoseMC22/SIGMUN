import { z } from 'zod';

const CODIGO_LENGTH = 7;
const CODIGO_PATTERN = /^\d{1,7}$/;
const CODIGO_MESSAGE = { message: 'Codigo must be 1 to 7 digits' };

/** Shared by every detail endpoint: digits only, then padded to seven chars. */
function padCodigo(value: string): string {
  return value.padStart(CODIGO_LENGTH, '0');
}

export const CodigoProyectadoSchema = z.coerce
  .string()
  .trim()
  .regex(CODIGO_PATTERN, CODIGO_MESSAGE)
  .transform(padCodigo);

export const CodigoProyectadoQuerySchema = z.object({
  codigo: CodigoProyectadoSchema,
});

export type CodigoProyectadoQueryDto = z.infer<typeof CodigoProyectadoQuerySchema>;

/** The legacy @estado values: pending, paid, or every state. */
export const ESTADOS_DETALLE_PROYECTADO = ['0', '1', '%'] as const;

/**
 * Body of POST /consulta. Field names mirror the validated SP parameter names
 * so the service can bind them directly; `criterio` is deliberately absent and
 * is forced to '0' in the service as the legacy controller did.
 */
export const ConsultaDetalleEstadoCuentaProyectadoSchema = z.object({
  codigo: CodigoProyectadoSchema,
  annos: z.array(z.coerce.string().trim()).default([]),
  tipos: z.array(z.coerce.string().trim()).default([]),
  tiporec: z.coerce.string().trim().default(''),
  perio: z.coerce.string().trim().default(''),
  predio: z.coerce.string().trim().default(''),
  estado: z.enum(ESTADOS_DETALLE_PROYECTADO).default('0'),
  fecha_proyectada: z.coerce.string().trim().default(''),
});

export type ConsultaDetalleEstadoCuentaProyectadoDto = z.infer<
  typeof ConsultaDetalleEstadoCuentaProyectadoSchema
>;
