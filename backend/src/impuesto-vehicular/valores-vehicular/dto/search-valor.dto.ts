import { z } from 'zod';

export const SearchValorSchema = z.object({
  criterio1: z.string().optional(),
  criterio2: z.string().optional(),
  criterio3: z.string().optional(),
  criterio4: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type SearchValorDto = z.infer<typeof SearchValorSchema>;
