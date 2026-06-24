import { z } from 'zod';

export const SearchAccoSchema = z.object({
  id_acceso: z.string().optional(),
  nombre: z.string().optional(),
  orden: z.string().optional(),
  menu: z.string().optional(),
  pantalla: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type SearchAccesoDto = z.infer<typeof SearchAccoSchema>;
