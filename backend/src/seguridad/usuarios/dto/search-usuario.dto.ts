import { z } from 'zod';

export const SearchUsuarioSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().optional(),
  usuario: z.string().optional(),
  area: z.string().optional(),
  perfil: z.string().optional(),
  estado: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchUsuarioDto = z.infer<typeof SearchUsuarioSchema>;
