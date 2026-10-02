import { z } from 'zod';

/**
 * Esquema de búsqueda de Constancias de No Adeudo.
 *
 * pageSize es el selector de modo: 15 = grilla (vista principal con paginación),
 * 100000 = exportación (re-consulta completa para Excel).
 * Patrón canónico del repo: nunca usar .max(100). Union de literales estricta.
 *
 * Criterios:
 * - page: número de página (1-based), default 1
 * - pageSize: selector de modo (15 | 100000), default 15
 * - Codigo: código opcional (máx. 20 caracteres). Si viene vacío, el service lo pasa como ''
 * - fini: fecha desde en formato YYYY-MM-DD (opcional). Si viene vacío, se pasa como ''
 * - ffin: fecha hasta en formato YYYY-MM-DD (opcional). Si viene vacío, se pasa como ''
 */
export const SearchConstanciaNoAdeudoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(15), z.literal(100000)]))
    .default(15),
  Codigo: z
    .string()
    .max(20)
    .optional()
    .transform((v) => v ?? ''),
  fini: z
    .string()
    .optional()
    .transform((v) => v ?? ''),
  ffin: z
    .string()
    .optional()
    .transform((v) => v ?? ''),
});

export type SearchConstanciaNoAdeudoDto = z.infer<
  typeof SearchConstanciaNoAdeudoSchema
>;