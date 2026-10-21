import { z } from 'zod';

/**
 * Esquema para procesar la proyección de estado de cuenta.
 * Fuente: Caja.sp_EstCta_Rentasop_proyectado (solo lectura).
 *
 * Firma real del SP (8 parámetros, todos con default): @codigo char(7),
 * @annos, @tipos, @tiporec, @perio, @predio, @estado varchar(1),
 * @fecha_proyectada.
 *
 * El body solo usa @codigo, @annos, @perio y @estado: @tipos, @tiporec,
 * @predio y @fecha_proyectada quedan declarados pero no entran en el SQL
 * dinámico. @annos y @perio se insertan dentro de un `in (...)` y el SP
 * convierte sus comillas dobles en literales, así que llegan como
 * `"2026"` y `"01","02"`. @estado se concatena crudo y no puede ir vacío.
 */
export const ProcesarOpSchema = z.object({
  Codigo: z.string().min(1).max(7),
  Annos: z.string().max(500).optional().default(''),
  Tipos: z.string().max(500).optional().default(''),
  Perio: z.string().max(2000).optional().default(''),
  Predio: z.string().max(500).optional().default(''),
  Estado: z.string().max(1).optional().default('0'),
  FechaProyectada: z.string().max(20).optional().default(''),
});

export type ProcesarOpDto = z.infer<typeof ProcesarOpSchema>;
