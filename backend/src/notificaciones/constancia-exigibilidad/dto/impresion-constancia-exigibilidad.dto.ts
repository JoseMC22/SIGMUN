import { z } from 'zod';

export const ImpresionConstanciaExigibilidadSchema = z
  .object({
    numexig: z.coerce
      .string()
      .trim()
      .regex(
        /^\d{1,7}$/,
        'El número de exigibilidad debe contener entre 1 y 7 dígitos',
      )
      .transform((value) => value.padStart(7, '0')),
    anoexig: z.coerce
      .string()
      .trim()
      .regex(/^\d{4}$/, 'El año de exigibilidad debe tener 4 dígitos'),
  })
  .strict();

export type ImpresionConstanciaExigibilidadDto = z.infer<
  typeof ImpresionConstanciaExigibilidadSchema
>;
