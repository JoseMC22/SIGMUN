import { z } from 'zod';

// Esquema de búsqueda de inconsistencias de predios.
// `pageSize` ES el selector de modo: 10 = grilla, 100000 = export (re-consulta
// completa del filtro). Cualquier otro valor es inválido (400 validation_error) —
// así un tamaño intermedio nunca activa silenciosamente el rango de exportación.
// `anno` tiene techo 2100: valores ≥ 2^31-1 superan el binding mssql.Int y
// producirían un 500 en lugar de un 400 de validación.
export const SearchInconsistenciaPrediosSchema = z.object({
  idAcceso: z.string().min(1),
  anno: z.coerce.number().int().min(1998).max(2100),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(10), z.literal(100000)]))
    .default(10),
});

export type SearchInconsistenciaPrediosDto = z.infer<
  typeof SearchInconsistenciaPrediosSchema
>;
