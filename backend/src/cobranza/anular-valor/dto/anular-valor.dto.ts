import { z } from 'zod';

/**
 * Esquema de la anulación de un valor (Rentas.ssp_Mvalores @msquery=10).
 *
 * Llave completa del valor (el service la usa para re-leer con
 * ssp_Consultadocu @msquery=3 antes y después de escribir), motivo 20-250
 * sobre el texto recortado (@observacion es varchar(250)) y operador
 * opcional (@id_user, default '').
 */
export const AnularValorSchema = z.object({
  Codigo: z.string().min(1).max(7),
  IdValor: z.string().min(1).max(2),
  NumVal: z.string().min(1).max(7),
  AnoVal: z.string().min(1).max(4),
  Motivo: z
    .string()
    .trim()
    .min(20, 'El motivo debe tener al menos 20 caracteres')
    .max(250),
  Operador: z.string().optional().default(''),
});

export type AnularValorDto = z.infer<typeof AnularValorSchema>;
