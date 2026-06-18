import { z } from 'zod';

export const SearchPerfilSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().optional(),
  estado: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type SearchPerfilDto = z.infer<typeof SearchPerfilSchema>;
