import { z } from 'zod';

// ── Estado de Cuenta: recibos grid ("Mostrar" button) ──
// Consumed by the Caja.sp_EstCta_Rentas stored-procedure family.
//
// Legacy parity notes:
// - The old UI posted a positional JSON array; here every group is a named
//   field, so adding/removing filters no longer shifts positions.
// - The SPs expect each list item wrapped in asterisks (*v1*,*v2*) because
//   sp_EstCta_Rentas_predecesor rewrites them into quoted IN (...) literals.
//   The backend wraps items; clients send plain values (e.g. "2026").

export const EstadoCuentaRecibosSchema = z.object({
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
  /** Legacy button criterion: 0 base, 8 fracc 2025, 11 sin multa, 12 amnistía */
  criterio: z.number().int().min(0).max(99).optional().default(0),
  soloCoactivo: z.boolean().optional().default(false),
});

export type EstadoCuentaRecibosDto = z.infer<typeof EstadoCuentaRecibosSchema>;
