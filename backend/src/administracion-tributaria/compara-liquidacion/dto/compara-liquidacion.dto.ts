import { z } from 'zod';

// Cuerpo de la búsqueda del comparativo de liquidaciones.
// `numero` identifica la liquidación (formato NN-NNNNNNNN, ej. 26-00000001).
// Se detiene la validación al primer error de formato para no propagar un
// número mal formado hacia [Caja].[pa_liquidacion].
export const BuscarLiquidacionSchema = z.object({
  numero: z
    .string()
    .trim()
    .regex(
      /^\d{2}-\d{8}$/,
      'El número de liquidación debe tener el formato NN-NNNNNNNN.',
    ),
});

export type BuscarLiquidacionDto = z.infer<typeof BuscarLiquidacionSchema>;
