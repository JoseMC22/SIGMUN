import { z } from 'zod';

export const SearchMantenimientoViasSchema = z.object({
  cod_via: z.string().optional(),
  nom_zona: z.string().optional(),
  nom_urba: z.string().optional(),
  nombre_via: z.string().optional(),
  nestado: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchMantenimientoViasDto = z.infer<typeof SearchMantenimientoViasSchema>;
