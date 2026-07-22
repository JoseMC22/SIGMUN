import { z } from 'zod';

export const SearchPendientesSchema = z.object({
  codigo: z.string().optional().default(''),
  annos: z.string().optional().default(''),
  tipos: z.string().optional().default(''),
  tiporec: z.string().optional().default(''),
  perio: z.string().optional().default(''),
  predio: z.string().optional().default(''),
  estado: z.string().optional().default(''),
  fechaProyectada: z.string().optional().default(''),
});

export type SearchPendientesDto = z.infer<typeof SearchPendientesSchema>;
