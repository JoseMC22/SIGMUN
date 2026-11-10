import { z } from 'zod';
import { ValorIdentitySchema } from './valor-identity.schema';

export const EmitirConstanciaExigibilidadSchema = ValorIdentitySchema;

export type EmitirConstanciaExigibilidadDto = z.infer<
  typeof EmitirConstanciaExigibilidadSchema
>;
