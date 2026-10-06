import { z } from 'zod';

// ── Baja de Predio (descargo) — [Rentas].[BajasPredio] ──
// Legacy: frmbajapredio + bajapredio.js + Rentas.sp_rentasmain @buscar=7/8.
// @buscar 4 when id_motivo_descargo==17 else 1.
// When motivo==17 the SP does NOT receive the 5 optional fields.
export const BajaPredioSchema = z.object({
  codigo: z.string().min(1, 'Código de contribuyente requerido.'),
  anno: z.string().min(1, 'Año requerido.'),
  cod_pred: z.string().min(1, 'Código de predio requerido.'),
  anexo: z.string().optional().default(''),
  sub_anexo: z.string().optional().default(''),
  direccion_predio: z.string().optional().default(''),
  id_motivo_descargo: z.string().min(1, 'Motivo de descargo requerido.'),
  porc_propiedad: z.string().optional().default(''),
  observacion: z.string().optional().default(''),
  fech_transparencia: z.string().optional().default(''),
  id_notaria: z.string().optional().default(''),
  codigo_adquiriente: z.string().optional().default(''),
  operador: z.string().optional().default(''),
  estacion: z.string().optional().default(''),
  usuario: z.string().optional().default(''),
  estacion2: z.string().optional().default(''),
  tipo_pred: z.string().optional().default('1'),
});

export type BajaPredioDto = z.infer<typeof BajaPredioSchema>;

// ── Restaurar registro del historial de baja — [Rentas].[BajasPredio] @buscar=8 ──
// Legacy: js_historicobajapredio.js btnRestaurar, one POST per selected row.
export const RestaurarBajaSchema = z.object({
  cod_baja: z.string().min(1, 'Código de baja requerido.'),
  anno: z.string().min(1, 'Año requerido.'),
  cod_pred: z.string().min(1, 'Código de predio requerido.'),
  anexo: z.string().optional().default(''),
  sub_anexo: z.string().optional().default(''),
  codigo: z.string().min(1, 'Código de contribuyente requerido.'),
  annobaja: z.string().min(1, 'Año de baja requerido.'),
  usuariorestaura: z.string().optional().default(''),
  pcrestaura: z.string().optional().default(''),
});

export type RestaurarBajaDto = z.infer<typeof RestaurarBajaSchema>;
