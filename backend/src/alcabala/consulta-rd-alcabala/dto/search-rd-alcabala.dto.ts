import { z } from 'zod';

// Matches frontend ConsultaRDFilters query params
export const SearchRdAlcabalaSchema = z.object({
  codigo: z.string().optional().default(''),
  contribuyente: z.string().optional().default(''),
  estado: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(15),
});

export type SearchRdAlcabalaDto = z.infer<typeof SearchRdAlcabalaSchema>;
