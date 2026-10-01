import { z } from 'zod';

/**
 * Esquema de búsqueda de Constancias de No Adeudos.
 *
 * pageSize es el selector de modo: 10 = grilla (vista principal con paginación),
 * 100000 = exportación (re-consulta completa para Excel).
 * Patrón canónico del repo: nunca usar .max(100). Union de literales estricta.
 *
 * Criterios:
 * - page: número de página (1-based), default 1
 * - pageSize: selector de modo (10 | 100000), default 10
 * - Codigo: código opcional (máx. 20 caracteres). Si viene vacío, el service lo pasa como ''
 * - fini: fecha desde en formato YYYY-MM-DD (opcional). Si viene vacío, se pasa como ''
 * - ffin: fecha hasta en formato YYYY-MM-DD (opcional). Si viene vacío, se pasa como ''
 */
export const SearchConstanciaNoAdeudosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(10), z.literal(100000)]))
    .default(10),
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

export type SearchConstanciaNoAdeudosDto = z.infer<
  typeof SearchConstanciaNoAdeudosSchema
>;
