import { z } from 'zod';

// Esquema de búsqueda del maestro de contribuyentes.
// `pageSize` ES el selector de modo: 20 = grilla, 100000 = export (re-consulta
// completa del listado). Cualquier otro valor es inválido (400 validation_error) —
// así un tamaño intermedio nunca activa silenciosamente el rango de exportación.
// Patrón análogo a inconsistencias de predios (10/100000).
export const SearchMaestroContribuyentesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(20), z.literal(100000)]))
    .default(20),
});

export type SearchMaestroContribuyentesDto = z.infer<
  typeof SearchMaestroContribuyentesSchema
>;