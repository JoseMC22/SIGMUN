import { z } from 'zod';

export const DetallePredioUsoSchema = z.object({
  codigo: z.string().default(''),
  anno: z.coerce.number().int(),
  id_uso: z.string(),
  flag: z.string(),
});

export type DetallePredioUsoDto = z.infer<typeof DetallePredioUsoSchema>;
