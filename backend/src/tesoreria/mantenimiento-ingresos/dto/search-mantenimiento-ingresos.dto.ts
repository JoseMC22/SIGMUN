import { z } from 'zod';

// Esquema de búsqueda del clasificador de ingresos.
// Criterio único (combo en el front): 'C' = código, 'N' = nombre/concepto.
// Viaja a @tipo y el valor a @nombre (@area fijo '').
// `pageSize` ES selector de modo: 15 = grilla, 100000 = export (re-consulta
// completa). Cualquier otro valor es inválido (400 validation_error).
export const SearchMantenimientoIngresosSchema = z.object({
  criterio: z.union([z.literal('C'), z.literal('N')]).default('C'),
  valor: z.coerce.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(15), z.literal(100000)]))
    .default(15),
});

export type SearchMantenimientoIngresosDto = z.infer<
  typeof SearchMantenimientoIngresosSchema
>;
