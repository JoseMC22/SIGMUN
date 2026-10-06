import { z } from 'zod';

// ── Deuda Consolidada (Caja.sp_Imprime_EstCta_4version) ──
// POST body filters. Mirrors the legacy "Deuda consolidado" button:
// the body SP is chosen by criterion (0 → _2020, else → _2021), and
// @resumen/@detalle/@agrupar come from the modal option checkboxes.
//
// Legacy parity notes:
// - Clients send PLAIN values ("2026", "02.30"); the backend wraps each as
//   *value* before calling the SP (same pattern as estado-cuenta/recibos).
// - estado is fixed to '0' (Pendiente) by the frontend; the legacy button
//   only printed pending accounts.
// - criterio is fixed to 0 (Mostrar) by the frontend, which selects the
//   sp_Imprime_EstCta_4version_2020 body variant.

export const DeudaConsolidadoSchema = z.object({
  codigo: z.string().min(1, 'El código del contribuyente es obligatorio.'),
  periodos: z.array(z.string()).default([]),
  anios: z.array(z.string()).default([]),
  conceptos: z.array(z.string()).default([]),
  arbitrios: z.array(z.string()).default([]),
  predios: z.array(z.string()).default([]),
  vehiculos: z.array(z.string()).default([]),
  fraccionamientos: z.array(z.string()).default([]),
  /** '0' pendiente | '1' cancelado | '3' por compensar | '%' todo */
  estado: z.enum(['0', '1', '3', '%']).default('0'),
  /** Legacy button criterion: 0 base (Mostrar), 11 sin multa, 12 amnistía */
  criterio: z.number().int().min(0).max(99).optional().default(0),
  /** Option "Ver Resumen Ctas." */
  resumen: z.boolean().optional().default(true),
  /** Option "Ver Detalle Ctas." */
  detalle: z.boolean().optional().default(true),
  /** Option "Agrupar detalle por concepto" */
  agrupar: z.boolean().optional().default(false),
});

export type DeudaConsolidadoDto = z.infer<typeof DeudaConsolidadoSchema>;
