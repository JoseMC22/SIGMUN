import { z } from 'zod';

/**
 * Payload para registrar un cargo de notificación.
 * Se envía como parámetros al SP `notificacion.sp_cargos_notificacion` con
 * `@busc=2`. Los campos de auditoría (`usuario_reg`, `estacion_reg`,
 * `usuario_act`, `fecha_act`) se inyectan desde el backend, no desde el front.
 */
export const GrabarCargoSchema = z.object({
  // Identificación del valor
  codigo: z.string().optional(),
  id_valor: z.string().optional(),
  num_valor: z.string().optional(),
  ano_valor: z.coerce.number().int().optional(),

  // Cargo
  num_cargo: z.string().optional(),
  ano_cargo: z.coerce.number().int().optional(),
  id_notificador: z.coerce.number().int().optional(),
  monto: z.coerce.number().optional(),
  c_fachada: z.string().optional(),

  // Situación / Visita
  flg_situacion: z.string().optional(),
  nro_visita: z.string().optional(),
  f_visita1: z.string().optional(),
  f_visita2: z.string().optional(),
  h_visita1: z.string().optional(),
  h_visita2: z.string().optional(),

  // Datos de recepción
  f_notifica: z.string().optional(),
  id_parentesco: z.coerce.number().int().optional(),
  parentesco_detalle: z.string().optional(),
  nombre: z.string().optional(),
  nro_documento: z.string().optional(),
  id_firma: z.coerce.number().int().optional(),
  direc_fiscal: z.string().optional(),
  n_suministro: z.string().optional(),
  observacion: z.string().optional(),
  otros: z.string().optional(),
  fvencimiento: z.string().optional(),
  n_pisos: z.coerce.number().int().optional(),
  derivar_drft: z.string().optional(),
  estado: z.string().optional(),
  ruta1: z.string().optional(),
  imagen1: z.string().optional(),
  ruta2: z.string().optional(),
  imagen2: z.string().optional(),
  /** true = cargo existente => ejecutar @busc=6 (update) en lugar de @busc=2. */
  actualizar: z.boolean().optional(),
});

export type GrabarCargoDto = z.infer<typeof GrabarCargoSchema>;
