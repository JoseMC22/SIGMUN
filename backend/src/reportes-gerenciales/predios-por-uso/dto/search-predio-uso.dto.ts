import { z } from 'zod';

export const SearchPredioUsoSchema = z.object({
  codigo: z.string().optional(),
  anno: z.coerce.number().int().optional(),
  uso: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type SearchPredioUsoDto = z.infer<typeof SearchPredioUsoSchema>;
