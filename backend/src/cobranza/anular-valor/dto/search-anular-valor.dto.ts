import { z } from 'zod';

/**
 * Esquema del listado de contribuyentes (fase 1 de anular-valor).
 *
 * pageSize es el selector de modo: 15 = grilla, 100000 = exportación.
 * En cobranza el estándar es 15 (maestro-contribuyentes usa 20, pero ese es de
 * administración-tributaria). Union de literales estricta, nunca .max(100).
 *
 * Sin filtros en fase 1: se listan todos. La fase 2 (anulación) agregará lo suyo.
 */
export const SearchAnularValorSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(15), z.literal(100000)]))
    .default(15),
});

export type SearchAnularValorDto = z.infer<typeof SearchAnularValorSchema>;
