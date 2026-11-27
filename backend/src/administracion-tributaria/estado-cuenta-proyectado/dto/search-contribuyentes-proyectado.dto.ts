import { z } from 'zod';

/** Numeric filters accept empty input; non-digits are rejected at the boundary. */
const DIGITS_ONLY = /^\d*$/;
const DIGITS_ONLY_MESSAGE = { message: 'Only digits are allowed' };

const CODIGO_LENGTH = 7;
const DOCUMENTO_MAX_LENGTH = 11;

/** The four legacy `rdcriterio` values accepted by @tipo_busqueda. */
export const TIPOS_BUSQUEDA_PROYECTADO = ['C', 'N', 'D', 'R'] as const;

/** Uppercases the free-text filters exactly as the legacy inputs did via CSS. */
function uppercase(value: string): string {
  return value.toUpperCase();
}

/**
 * Mirrors js_Mantcontriproyec.js L246-264: a non-empty numeric code is padded
 * with leading zeroes to seven characters before it reaches the SP.
 */
function padCodigo(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || !/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  const zeros = '0000000';
  if (trimmed.length >= zeros.length) {
    return trimmed;
  }
  return zeros.substring(0, zeros.length - trimmed.length) + trimmed;
}

/** Six legacy filters shared by @busc=6 (count) and @busc=5 (rows). */
export const SearchContribuyentesProyectadosSchema = z.object({
  tipoBusqueda: z.enum(TIPOS_BUSQUEDA_PROYECTADO).default('C'),
  codigo: z.coerce
    .string()
    .trim()
    .regex(DIGITS_ONLY, DIGITS_ONLY_MESSAGE)
    .max(CODIGO_LENGTH, { message: 'Codigo must be at most 7 digits' })
    .default('')
    .transform(padCodigo),
  criterioNombre: z.coerce.string().trim().default('').transform(uppercase),
  criterioPaterno: z.coerce.string().trim().default('').transform(uppercase),
  criterioMaterno: z.coerce.string().trim().default('').transform(uppercase),
  criterioRazon: z.coerce.string().trim().default('').transform(uppercase),
  documento: z.coerce
    .string()
    .trim()
    .regex(DIGITS_ONLY, DIGITS_ONLY_MESSAGE)
    .max(DOCUMENTO_MAX_LENGTH, {
      message: 'Documento must be at most 11 digits',
    })
    .default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
});

export type SearchContribuyentesProyectadosDto = z.infer<
  typeof SearchContribuyentesProyectadosSchema
>;
