import { z } from 'zod';

/**
 * Esquema para generar la orden de pago.
 *
 * Son los mismos filtros de ProcesarOpSchema más los datos del contribuyente
 * que el SP de generación necesita para el comprobante. El cliente NUNCA manda
 * el nombre del SP: el servicio lo resuelve con el mapa id_valor/whitelist.
 *
 * `FechaProyectada` acá es obligatoria: define el corte con el que se vuelve a
 * proyectar el estado de cuenta server-side antes de generar.
 */
export const GenerarOpSchema = z.object({
  Codigo: z.string().min(1).max(7),
  /** Tributo que define el SP de generación: predial u vehicular. */
  Tipo: z.enum(['predial', 'vehicular']).optional().default('predial'),
  Annos: z.string().max(500).optional().default(''),
  Tipos: z.string().max(500).optional().default(''),
  Perio: z.string().max(2000).optional().default(''),
  Predio: z.string().max(500).optional().default(''),
  Estado: z.string().max(1).optional().default('0'),
  FechaProyectada: z.string().min(1).max(20),
  Nombre: z.string().max(200).optional().default(''),
  DirFiscal: z.string().max(300).optional().default(''),
  NumDoc: z.string().max(20).optional().default(''),
  IdUsuario: z.string().max(50).optional().default(''),
  Operador: z.string().max(50).optional().default(''),
  Estacion: z.string().max(50).optional().default(''),
  /**
   * Recibos (ids de la proyección) que el usuario eligió incluir en la OP.
   * El cliente elige CUÁLES, nunca los importes: el servicio vuelve a
   * proyectar y toma los importes de la base.
   */
  IdRecibos: z.array(z.coerce.number().int().positive()).min(1),
});

export type GenerarOpDto = z.infer<typeof GenerarOpSchema>;
