import { z } from 'zod';

// ── Guardar Hoja de Resumen predial (Rentas.sp_MHRpred) ──
// @busc: '1' = crear, '2' = editar.

export const GuardarHojaResumenSchema = z.object({
  action: z.string().optional().default('1'),
  codigo: z.string().optional().default(''),
  anno: z.string().optional().default(''),
  num_resol: z.string().optional().default(''),
  fec_resol: z.string().optional().default(''),
  nro_expediente: z.string().optional().default(''),
  base_legal: z.string().optional().default(''),
  regimen: z.string().optional().default(''),
  motivo: z.string().optional().default(''),
  vig_desde: z.string().optional().default(''),
  vig_hasta: z.string().optional().default(''),
  observacion: z.string().optional().default(''),
  bloquear_emi: z.string().optional().default(''),
  // Fecha de la DJ y fechas de vigencia del registro (txtfecdecla,
  // txtdesde/txthasta del formulario legado).
  fec_decla: z.string().optional().default(''),
  fec_vig_desde: z.string().optional().default(''),
  fec_vig_hasta: z.string().optional().default(''),
  operador: z.string().optional().default(''),
  estacion: z.string().optional().default(''),
});

export type GuardarHojaResumenDto = z.infer<typeof GuardarHojaResumenSchema>;