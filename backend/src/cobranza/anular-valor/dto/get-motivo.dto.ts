import { z } from 'zod';

/**
 * Llave del valor para leer su motivo de anulación.
 * Fuente: Rentas.SP_Mvalores @msquery=14
 * (select observacion from MVALORES_MOTIVO por llave, 0..N filas).
 * Mismas longitudes que anular-valor.dto (char(2)/char(7)/char(4) del SP).
 */
export const GetMotivoSchema = z.object({
  IdValor: z.string().min(1).max(2),
  NumVal: z.string().min(1).max(7),
  AnoVal: z.string().min(1).max(4),
});

export type GetMotivoDto = z.infer<typeof GetMotivoSchema>;
