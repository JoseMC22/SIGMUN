import { z } from 'zod';

/**
 * Schema for a row from `Alcabala.RptAlcabala` (25 declared fields).
 * String fields default to ''; numeric fields coerce and `.catch(0)` so that
 * non-numeric garbage (e.g. 'N/A') from the SP never raises a ZodError → 500.
 */
export const DeclaracionPdfRowSchema = z.object({
  // ── String fields (16) — coerce to tolerate numeric SP output ──
  codigo_compra: z.coerce.string().default(''),
  comprador: z.coerce.string().default(''),
  comprador_fiscal: z.coerce.string().default(''),
  comprador_dni: z.coerce.string().default(''),
  codigo_venta: z.coerce.string().default(''),
  vendedor: z.coerce.string().default(''),
  vendedor_fiscal: z.coerce.string().default(''),
  vendedor_dni: z.coerce.string().default(''),
  contrato: z.coerce.string().default(''),
  direccion_predio: z.coerce.string().default(''),
  fecha_contrato: z.coerce.string().default(''),
  tipo_pred: z.coerce.string().default(''),
  monto_letras: z.coerce.string().default(''),
  observacion: z.coerce.string().default(''),
  usuario_ing: z.coerce.string().default(''),
  fecha_ing: z.coerce.string().default(''),

  // ── Numeric fields (9) — coerce with .catch for NaN/null/undefined ──
  transferencia: z.coerce.number().catch(0),
  autoavaluo: z.coerce.number().catch(0),
  monto_inafecto: z.coerce.number().catch(0),
  monto_afecto: z.coerce.number().catch(0),
  mora: z.coerce.number().catch(0),
  tasa_impuesto: z.coerce.number().catch(0),
  monto_alcabala: z.coerce.number().catch(0),
  total_alcabala: z.coerce.number().catch(0),
  base_imponible: z.coerce.number().catch(0),
});

export type DeclaracionPdfRow = z.infer<typeof DeclaracionPdfRowSchema>;
