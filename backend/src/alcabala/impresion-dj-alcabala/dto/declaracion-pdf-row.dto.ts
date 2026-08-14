import { z } from 'zod';

/**
 * Schema for a row from `Alcabala.RptAlcabala` (25 declared fields).
 * String fields default to ''; numeric fields coerce and `.catch(0)` so that
 * non-numeric garbage (e.g. 'N/A') from the SP never raises a ZodError → 500.
 */
export const DeclaracionPdfRowSchema = z.object({
  // ── String fields (16) ──
  codigo_compra: z.string().default(''),
  comprador: z.string().default(''),
  comprador_fiscal: z.string().default(''),
  comprador_dni: z.string().default(''),
  codigo_venta: z.string().default(''),
  vendedor: z.string().default(''),
  vendedor_fiscal: z.string().default(''),
  vendedor_dni: z.string().default(''),
  contrato: z.string().default(''),
  direccion_predio: z.string().default(''),
  fecha_contrato: z.string().default(''),
  tipo_pred: z.string().default(''),
  monto_letras: z.string().default(''),
  observacion: z.string().default(''),
  usuario_ing: z.string().default(''),
  fecha_ing: z.string().default(''),

  // ── Numeric fields (9) ──
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
