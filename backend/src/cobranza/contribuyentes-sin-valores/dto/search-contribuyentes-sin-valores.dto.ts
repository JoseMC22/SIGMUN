import { z } from 'zod';

// Esquema de búsqueda de contribuyentes sin valores tributarios.
// `pageSize` ES el selector de modo: 20 = grilla (grid), 100000 = exportación
// (re-consulta completa del listado). Cualquier otro valor es inválido (400
// validation_error) — así un tamaño intermedio nunca activa silenciosamente el
// rango de exportación. Patrón análogo a predios por contribuyente (20/100000).
// `anoVal` es obligatorio y no tiene default: el SP `Rentas.sp_Mvalores`
// (@msquery=13) espera `@ano_val char(4)` y el backend NO inventa el año —
// siempre lo envía el frontend como string de 4 dígitos.
export const SearchContribuyentesSinValoresSchema = z.object({
  anoVal: z
    .string()
    .regex(/^\d{4}$/, 'El año debe ser un string de 4 dígitos (ej: 2023).'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(20), z.literal(100000)]))
    .default(20),
});

export type SearchContribuyentesSinValoresDto = z.infer<
  typeof SearchContribuyentesSinValoresSchema
>;
