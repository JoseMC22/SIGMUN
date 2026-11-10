import { z } from 'zod';

export const ValorIdentitySchema = z
  .object({
    tipoValor: z
      .string()
      .trim()
      .min(1, 'Debe seleccionar un Tipo de Valor')
      .max(2, 'El Tipo de Valor es inválido'),
    anio: z.coerce
      .number()
      .int('El año debe ser un número entero')
      .min(1000, 'El año debe tener 4 dígitos')
      .max(9999, 'El año debe tener 4 dígitos'),
    numero: z.coerce
      .string()
      .trim()
      .regex(/^\d{1,7}$/, 'El número debe contener entre 1 y 7 dígitos')
      .transform((value) => value.padStart(7, '0')),
  })
  .strict();

export const ValorIdentitySchema = z
  .object({
    tipoValor: z
      .string()
      .trim()
      .min(1, 'Debe seleccionar un Tipo de Valor')
      .max(2, 'El Tipo de Valor es inválido'),
    anio: z.coerce
      .number()
      .int('El año debe ser un número entero')
      .min(1000, 'El año debe tener 4 dígitos')
      .max(9999, 'El año debe tener 4 dígitos'),
    numero: z.coerce
      .string()
      .trim()
      .regex(/^\d{1,7}$/, 'El número debe contener entre 1 y 7 dígitos')
      .transform((value) => value.padStart(7, '0')),
  })
  .strict();

export const ValidarConstanciaExigibilidadSchema = ValorIdentitySchema;

export type ValidarConstanciaExigibilidadDto = z.infer<
  typeof ValidarConstanciaExigibilidadSchema
>;
