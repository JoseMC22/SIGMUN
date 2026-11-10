import { z } from 'zod';
import { ValorIdentitySchema } from './valor-identity.schema';

export { ValorIdentitySchema };

export const ValidarConstanciaExigibilidadSchema = ValorIdentitySchema;

export type ValidarConstanciaExigibilidadDto = z.infer<
  typeof ValidarConstanciaExigibilidadSchema
>;
