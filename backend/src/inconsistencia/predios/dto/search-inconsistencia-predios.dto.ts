import { z } from 'zod';

// Esquema de búsqueda de inconsistencias de predios.
// `pageSize` admite hasta 100000 para habilitar la re-consulta completa de la
// exportación; la grilla siempre envía 20 y `totalPages` siempre divide por 20.
export const SearchInconsistenciaPrediosSchema = z.object({
  idAcceso: z.string().min(1),
  anno: z.coerce.number().int().min(1998),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100000).default(20),
});

export type SearchInconsistenciaPrediosDto = z.infer<
  typeof SearchInconsistenciaPrediosSchema
>;
