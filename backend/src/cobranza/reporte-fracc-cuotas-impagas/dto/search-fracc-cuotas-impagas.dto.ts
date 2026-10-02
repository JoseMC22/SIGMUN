import { z } from 'zod';

/**
 * Esquema de búsqueda del Reporte de Fraccionamientos con Cuotas Impagadas.
 *
 * pageSize es el selector de modo: 15 = grilla (paginación pedida por el usuario),
 * 100000 = exportación (re-consulta completa para Excel).
 * Patrón canónico del repo: nunca usar .max(100). Union de literales estricta.
 *
 * Criterios:
 * - page: número de página (1-based), default 1
 * - pageSize: selector de modo (15 | 100000), default 15
 * - Codigo: código del contribuyente, opcional y de hasta 7 caracteres (varchar(7)
 *   en el SP). Si viene vacío, se manda '' para no acotar el resultado.
 * - FechCorte: fecha de corte en formato YYYY-MM-DD (opcional). Si viene vacío, no
 *   se filtra por fecha.
 *
 * OJO con las claves: zod NO valida claves desconocidas, las descarta en silencio. Si
 * el action mandara `codigo` en minúscula, el DTO devolvería Codigo: '' y el reporte
 * traería TODOS los registros sin ningún error visible. Ver el spec del dto.
 */
export const SearchFraccCuotasImpagasSchema = z.object({
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
  FechCorte: z
    .string()
    .optional()
    .transform((v) => v ?? '')
    // Una fecha mal formada se rechaza en vez de ignorarse: si el filtro se
    // descarta en silencio la pantalla miente mostrando el listado completo.
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: 'FechCorte debe tener formato YYYY-MM-DD',
    }),
});

export type SearchFraccCuotasImpagasDto = z.infer<
  typeof SearchFraccCuotasImpagasSchema
>;