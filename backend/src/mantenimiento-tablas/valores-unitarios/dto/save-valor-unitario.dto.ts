import { z } from 'zod';

export const SaveValorUnitarioSchema = z.object({
  region: z
    .string()
    .regex(/^\d$/, 'La región debe tener 1 dígito'),
  anno: z
    .string()
    .regex(/^\d{4}$/, 'El año debe tener 4 dígitos'),
  codi: z
    .string()
    .trim()
    .min(1, 'El código debe tener entre 1 y 2 caracteres')
    .max(2, 'El código debe tener entre 1 y 2 caracteres'),
  valor: z.coerce
    .number()
    .min(0, 'El valor debe estar entre 0 y 99999.99')
    .max(99999.99, 'El valor debe estar entre 0 y 99999.99'),
});

/** Clave natural, usada por DELETE y por los chequeos de existencia. */
export const ValorUnitarioKeySchema = SaveValorUnitarioSchema.omit({
  valor: true,
});

export type SaveValorUnitarioDto = z.infer<typeof SaveValorUnitarioSchema>;
export type ValorUnitarioKeyDto = z.infer<typeof ValorUnitarioKeySchema>;
