import { z } from 'zod';

export const SearchContribuyenteSchema = z.object({
  tipoBusqueda: z.enum(['C', 'N', 'R', 'D', 'P', 'V']).default('C'),
  busqueda: z.string().optional().default(''),
  paterno: z.string().optional().default(''),
  materno: z.string().optional().default(''),
  nombres: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(15),
});

export type SearchContribuyenteDto = z.infer<typeof SearchContribuyenteSchema>;