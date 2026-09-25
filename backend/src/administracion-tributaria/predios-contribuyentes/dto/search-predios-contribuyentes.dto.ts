import { z } from 'zod';

// Esquema de búsqueda de predios por contribuyente.
// `pageSize` ES el selector de modo: 20 = grilla (grid), 100000 = exportación
// (re-consulta completa del listado). Cualquier otro valor es inválido (400
// validation_error) — así un tamaño intermedio nunca activa silenciosamente el
// rango de exportación. Patrón análogo a maestro de contribuyentes (20/100000).
// `categoria` acepta '' = TODOS (devuelve todos los predios); PRICO/MECO/PECO
// filtran por tipo de contribuyente. La rama 29 aplica
// `(@categoria = '' OR RENTAS.GET_TIPO_CONTRIBUYENTE(wc.codigo) = @categoria)`.
export const SearchPrediosContribuyentesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(20), z.literal(100000)]))
    .default(20),
  categoria: z
    .union([
      z.literal(''),
      z.literal('PRICO'),
      z.literal('MECO'),
      z.literal('PECO'),
    ])
    .default(''),
});

export type SearchPrediosContribuyentesDto = z.infer<
  typeof SearchPrediosContribuyentesSchema
>;