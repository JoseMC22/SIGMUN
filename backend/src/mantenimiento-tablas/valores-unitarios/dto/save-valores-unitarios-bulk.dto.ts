import { z } from 'zod';

/**
 * Los 70 códigos catastrales de Calculo.Tblvaluni: diez letras (A..J) por
 * siete números (1..7), en orden estable A1, A2, ... J7.
 * Se genera en vez de escribirse a mano para que la grilla y Zod no diverjan.
 */
export const VALORES_UNITARIOS_CODES: string[] = Array.from(
  { length: 10 },
  (_, letterIndex) =>
    Array.from(
      { length: 7 },
      (_, numberIndex) =>
        `${String.fromCharCode('A'.charCodeAt(0) + letterIndex)}${numberIndex + 1}`,
    ),
).flat();

const SaveValorUnitarioBulkItemSchema = z.object({
  codi: z
    .string()
    .regex(/^[A-J][1-7]$/, 'El código debe estar entre A1 y J7'),
  valor: z.coerce
    .number()
    .min(0, 'El valor debe estar entre 0 y 99999.99')
    .max(99999.99, 'El valor debe estar entre 0 y 99999.99'),
});

export const SaveValoresUnitariosBulkSchema = z
  .object({
    region: z
      .string()
      .regex(/^\d$/, 'La región debe tener 1 dígito'),
    anno: z
      .string()
      .regex(/^\d{4}$/, 'El año debe tener 4 dígitos'),
    items: z
      .array(SaveValorUnitarioBulkItemSchema)
      .min(1, 'Debe enviar al menos un código')
      .max(70, 'No puede enviar más de 70 códigos'),
  })
  .refine(
    (data) => new Set(data.items.map((item) => item.codi)).size === data.items.length,
    { message: 'Los códigos no pueden repetirse', path: ['items'] },
  );

export type SaveValoresUnitariosBulkDto = z.infer<
  typeof SaveValoresUnitariosBulkSchema
>;
