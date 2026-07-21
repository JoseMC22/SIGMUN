import { z } from 'zod';

export const GenerarRdSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Debe seleccionar al menos un registro'),
});

export type GenerarRdDto = z.infer<typeof GenerarRdSchema>;
