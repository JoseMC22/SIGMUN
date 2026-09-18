import { z } from 'zod';

// ── Determinación del contribuyente (Impuesto Predial / Arbitrios) ──

/** Determinación del IP — legacy: determinacionimpuesto4Action. */
export const DeterminacionIpSchema = z.object({
  codigo: z.string().min(1),
  anno: z.string().min(1),
  /** '1' = Por Emisión, '2' = Por Fiscalización. */
  tipodeterminacion: z.string().optional().default('1'),
  operador: z.string().optional().default(''),
  estacion: z.string().optional().default(''),
});

export type DeterminacionIpDto = z.infer<typeof DeterminacionIpSchema>;

const PredioDeterminacionSchema = z.object({
  codigo: z.string().min(1),
  anno: z.string().min(1),
  cod_pred: z.string().min(1),
  anexo: z.string().optional().default(''),
  sub_anexo: z.string().optional().default(''),
  tipodeterminacion: z.string().optional().default('1'),
});

/** Determinación de Arbitrios por predio — legacy: determinacionarbitrioAction. */
export const DeterminacionArbitriosSchema = z.object({
  predios: z.array(PredioDeterminacionSchema).min(1),
  operador: z.string().optional().default(''),
  estacion: z.string().optional().default(''),
});

export type DeterminacionArbitriosDto = z.infer<typeof DeterminacionArbitriosSchema>;
