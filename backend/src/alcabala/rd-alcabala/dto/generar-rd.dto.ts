import { z } from 'zod';

export const GenerarRdSchema = z.object({
  registros: z.array(z.object({
    idrecibo: z.string().min(1),
    anio: z.string().min(4),
  })).min(1, 'Debe seleccionar al menos un registro'),
});

export type GenerarRdDto = z.infer<typeof GenerarRdSchema>;
