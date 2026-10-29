import { z } from 'zod';

/**
 * Busqueda de contribuyentes para multa-tributaria.
 *
 * Mismo contrato que declaracion-jurada/anular-valor:
 * Rentas.sp_Mcontribuyente @busc=6 (count) + @busc=5 (pagina).
 *
 * Criterios:
 * - C: codigo exacto (el SP rellena con ceros).
 * - N: paterno/materno/nombres con LIKE parcial combinados con AND.
 * - R: razon social (nombre completo concatenado).
 * - D: numero de documento con LIKE parcial.
 */
export const TipoBusquedaSchema = z.enum(['C', 'N', 'R', 'D']);

export const SearchContribuyenteSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(15), z.literal(100000)]))
    .default(15),
  TipoBusqueda: TipoBusquedaSchema,
  Codigo: z
    .string()
    .max(7)
    .optional()
    .transform((v) => v ?? ''),
  Paterno: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v ?? ''),
  Materno: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v ?? ''),
  Nombres: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v ?? ''),
  Razon: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v ?? ''),
  NumDoc: z
    .string()
    .max(11)
    .optional()
    .transform((v) => v ?? ''),
});

export type SearchContribuyenteDto = z.infer<typeof SearchContribuyenteSchema>;
