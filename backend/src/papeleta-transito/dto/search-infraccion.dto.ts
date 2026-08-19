import { z } from 'zod';

export const SearchInfraccionSchema = z.object({
  placa: z.string().optional(),
  propietario: z.string().optional(),
  codigoInfraccion: z.string().optional(),
  anioInfraccion: z.string().optional(),
  conductor: z.string().optional(),
  dniConductor: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type SearchInfraccionDto = z.infer<typeof SearchInfraccionSchema>;
