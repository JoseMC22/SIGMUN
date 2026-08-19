import { z } from 'zod';

export const SearchContribuyenteSchema = z.object({
  tipoBusqueda: z.enum(['C', 'N', 'R', 'D']).default('C'),
  codigo: z.string().optional().default(''),
  nombres: z.string().optional().default(''),
  paterno: z.string().optional().default(''),
  materno: z.string().optional().default(''),
  razonSocial: z.string().optional().default(''),
  numDoc: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(15),
});

export type SearchContribuyenteDto = z.infer<typeof SearchContribuyenteSchema>;
