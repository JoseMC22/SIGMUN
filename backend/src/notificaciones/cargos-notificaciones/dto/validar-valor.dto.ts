import { z } from 'zod';

/**
 * Criterios para validar un valor tributario (SP `[Rentas].[ssp_mvalores]`
 * @msquery=9). Devuelve el detalle del valor (contribuyente, dirección,
 * tributos) y el monto asociado.
 */
export const ValidarValorSchema = z.object({
  id_valor: z.string().min(1, 'Debe seleccionar un Tipo de Valor'),
  num_valor: z.string().optional(),
  ano_valor: z.coerce.number().int().optional(),
});

export type ValidarValorDto = z.infer<typeof ValidarValorSchema>;
