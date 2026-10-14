import { z } from 'zod';

/**
 * Esquema para pedir los valores emitidos de un contribuyente.
 * Fuente: Rentas.ssp_Consultadocu @msquery=3 filtrado por @codigo exacto.
 */
export const GetValoresSchema = z.object({
  Codigo: z.string().min(1).max(7),
});

export type GetValoresDto = z.infer<typeof GetValoresSchema>;
