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
    .regex(/^[A-J][1-7]$/, 'La categoría debe estar entre A1 y J7'),
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
