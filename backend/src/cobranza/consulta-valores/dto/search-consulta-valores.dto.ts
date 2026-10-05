import { z } from 'zod';

/**
 * Esquema de búsqueda de la Consulta de Valores.
 *
 * pageSize es el selector de modo: 15 = grilla (paginación server-side en el SP),
 * 100000 = exportación (re-consulta completa para Excel).
 * Patrón canónico del repo: nunca usar .max(100). Union de literales estricta.
 *
 * Criterios (la UI manda lleno solo el elegido con el selector; los otros van ''):
 * - Codigo: código del contribuyente, hasta 7 caracteres (varchar(7) en el SP).
 *   El SP lo compara EXACTO (=): un parcial devuelve 0 filas.
 * - Unombre: nombre del contribuyente, hasta 200 caracteres (varchar(200)).
 *   El SP lo compara LIKE parcial (%...%): trae coincidencias intermedias.
 * - NumVal: número de valor, hasta 7 caracteres (char(7)). EXACTO (=) y es el
 *   número del valor (secuencial por id_valor+ano_val), NO un documento de identidad.
 *
 * OJO con las claves: zod NO valida claves desconocidas, las descarta en silencio. Si
 * el action mandara `codigo` en minúscula, el DTO devolvería Codigo: '' y la consulta
 * traería TODOS los valores sin ningún error visible. Ver el spec del dto.
 */
export const SearchConsultaValoresSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(15), z.literal(100000)]))
    .default(15),
  Codigo: z
    .string()
    .max(7)
    .optional()
    .transform((v) => v ?? ''),
  Unombre: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v ?? ''),
  NumVal: z
    .string()
    .max(7)
    .optional()
    .transform((v) => v ?? ''),
});

export type SearchConsultaValoresDto = z.infer<
  typeof SearchConsultaValoresSchema
>;
