import { z } from 'zod';

const CODIGO_LENGTH = 7;
const CODIGO_PATTERN = /^\d{1,7}$/;
const CODIGO_MESSAGE = { message: 'Codigo must be 1 to 7 digits' };

const FECHA_ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FECHA_LEGACY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const FECHA_MESSAGE = {
  message: 'Fecha proyectada must be YYYY-MM-DD or DD/MM/YYYY',
};

/** Shared by every detail endpoint: digits only, then padded to seven chars. */
function padCodigo(value: string): string {
  return value.padStart(CODIGO_LENGTH, '0');
}

/** Rejects overflowed days such as 31/02/2026, including leap-year edge cases. */
function isCalendarDate(year: number, month: number, day: number): boolean {
  const candidate = new Date(0);
  candidate.setUTCFullYear(year, month - 1, day);
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/**
 * Accepts the browser's YYYY-MM-DD, the catalog SP's DD/MM/YYYY and the empty
 * filter. Both formats are calendar-checked before anything reaches the SP.
 */
function isValidFechaProyectada(value: string): boolean {
  if (value === '') return true;
  const iso = FECHA_ISO_PATTERN.exec(value);
  if (iso) {
    return isCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const legacy = FECHA_LEGACY_PATTERN.exec(value);
  if (legacy) {
    return isCalendarDate(Number(legacy[3]), Number(legacy[2]), Number(legacy[1]));
  }
  return false;
}

/**
 * Zod boundary for @fecha_proyectada: the legacy SP parses this under
 * DATEFORMAT dmy, so neither an impossible date nor a free-form string may pass.
 */
export const FechaProyectadaSchema = z.coerce
  .string()
  .trim()
  .refine(isValidFechaProyectada, FECHA_MESSAGE);

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
  // The predecessor SP builds a dynamic @query from @tipos; an empty array
  // arrives as '' and produces invalid SQL, so reject it at the boundary.
  tipos: z.array(z.coerce.string().trim()).min(1, {
    message: 'At least one tipo is required',
  }),
  tiporec: z.coerce.string().trim().default(''),
  perio: z.coerce.string().trim().default(''),
  predio: z.coerce.string().trim().default(''),
  estado: z.enum(ESTADOS_DETALLE_PROYECTADO).default('0'),
  fecha_proyectada: FechaProyectadaSchema.default(''),
});

export type ConsultaDetalleEstadoCuentaProyectadoDto = z.infer<
  typeof ConsultaDetalleEstadoCuentaProyectadoSchema
>;
