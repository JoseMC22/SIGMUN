import { z } from 'zod';

/**
 * Esquema del listado de contribuyentes para anular-valor.
 *
 * Fuente: Rentas.ssp_Mcontribuyente @busc=5 (rama msconsulta).
 *
 * pageSize es el selector de modo: 15 = grilla, 100000 = exportación interna.
 * Union de literales estricta, nunca .max(100).
 *
 * TipoBusqueda (char(1) en el SP) dice qué criterio filtra; solo viaja lleno
 * el del criterio elegido:
 * - C: Codigo (varchar(7)). El SP compara EXACTO y rellena solo con
 *   right('0000000'+@codigo,7), así que el front puede mandar sin ceros.
 * - N: Paterno (varchar(50)), Materno (varchar(50)), Nombres (varchar(200)).
 *   Los tres van con LIKE parcial y combinados con AND; los vacíos son %%
 *   (match todo), así que cualquier combinación vale.
 * - R: Razon (varchar(200)). El SP la busca con LIKE sobre el nombre completo
 *   concatenado (nombres+paterno+materno).
 * - D: NumDoc (varchar(11)). El SP la busca con LIKE parcial sobre a.num_doc.
 *
 * OJO con las claves: zod descarta desconocidas en silencio. Si el action
 * mandara `codigo` en minúscula, el DTO devolvería Codigo: '' y la consulta
 * traería todo sin error visible. Ver el spec del dto.
 */
export const TipoBusquedaSchema = z.enum(['C', 'N', 'R', 'D']);

export const SearchAnularValorSchema = z.object({
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

export type SearchAnularValorDto = z.infer<typeof SearchAnularValorSchema>;
