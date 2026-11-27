import { z } from 'zod';

export const SearchValoresUnitariosSchema = z.object({
  anno: z
    .string()
    .regex(/^\d{4}$/, 'El año debe tener 4 dígitos'),
  region: z
    .string()
    .regex(/^\d$/, 'La región debe tener 1 dígito')
    .optional(),
});

export type SearchValoresUnitariosDto = z.infer<
  typeof SearchValoresUnitariosSchema
>;
