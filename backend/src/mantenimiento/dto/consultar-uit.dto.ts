import { z } from 'zod';

export const ConsultarUitSchema = z.object({
  anno: z.coerce.number().int().min(1992),
});

export type ConsultarUitDto = z.infer<typeof ConsultarUitSchema>;
