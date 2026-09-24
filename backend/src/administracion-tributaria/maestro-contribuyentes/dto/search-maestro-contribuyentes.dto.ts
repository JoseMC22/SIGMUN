import { z } from 'zod';

export const SearchMaestroContribuyentesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchMaestroContribuyentesDto = z.infer<typeof SearchMaestroContribuyentesSchema>;