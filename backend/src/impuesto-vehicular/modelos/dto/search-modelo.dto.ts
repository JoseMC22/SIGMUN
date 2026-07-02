import { z } from 'zod';

export const SearchModeloSchema = z.object({
  tipoBusqueda: z.string().optional(),
  criterio: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type SearchModeloDto = z.infer<typeof SearchModeloSchema>;
