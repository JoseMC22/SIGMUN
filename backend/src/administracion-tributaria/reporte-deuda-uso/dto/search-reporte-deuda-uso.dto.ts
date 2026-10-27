import { z } from 'zod';

export const SearchReporteDeudaUsoSchema = z.object({
  anno: z.string().min(1, 'El año es requerido'),
  id_uso: z.string().optional().default(''),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(15),
});

export type SearchReporteDeudaUsoDto = z.infer<typeof SearchReporteDeudaUsoSchema>;
