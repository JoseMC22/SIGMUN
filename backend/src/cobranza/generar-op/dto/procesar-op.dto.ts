import { z } from 'zod';

/**
 * Esquema para procesar la proyección de estado de cuenta.
 * Fuente: Caja.sp_EstCta_Rentasop_proyectado (solo lectura).
 * @perio viaja como JSON de 4 elementos armado en el frontend.
 */
export const ProcesarOpSchema = z.object({
  Codigo: z.string().min(1).max(7),
  Annos: z.string().max(500).optional().default(''),
  Tipos: z.string().max(500).optional().default(''),
  Perio: z.string().max(2000).optional().default(''),
  Predio: z.string().max(500).optional().default(''),
  Estado: z.string().max(500).optional().default(''),
  FechaProyectada: z.string().max(20).optional().default(''),
});

export type ProcesarOpDto = z.infer<typeof ProcesarOpSchema>;
