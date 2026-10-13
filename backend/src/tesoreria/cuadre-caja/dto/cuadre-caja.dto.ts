import { z } from 'zod';

// Esquema de búsqueda del cuadre de caja. El SP consulta una sola fecha
// (sin paginación: devuelve UNA fila o ninguna → data null).
// `fecha` es requerida y debe llegar como YYYY-MM-DD (input type=date);
// el service la normaliza a YYYYMMDD para el parámetro del SP.
export const SearchCuadreCajaSchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD.'),
});

export type SearchCuadreCajaDto = z.infer<typeof SearchCuadreCajaSchema>;
