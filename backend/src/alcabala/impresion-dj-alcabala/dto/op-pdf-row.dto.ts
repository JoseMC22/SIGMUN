import { z } from 'zod';

/**
 * Schema for a row from `Rentas.sp_ImprimeOP @buscar=2` (35 columns).
 *
 * The SP may return `number` for columns we treat as strings, and SQL NULL
 * (→ `undefined` after `col()`) for numeric columns.  We use `z.coerce` and
 * `z.preprocess` so the schema tolerates both scenarios instead of throwing
 * at parse time.
 */
const num = z.preprocess(
  (v) => (v == null ? 0 : v),
  z.coerce.number(),
);

export const OpPdfRowSchema = z.object({
  id_valor: z.string().default(''),
  num_val: z.string().default(''),
  ano_val: z.string().default(''),
  numerOP: z.string().default(''),
  fec_val: z.string().default(''),
  fecvaln: z.string().default(''),
  codigo: z.string().default(''),
  nombre: z.string().default(''),
  num_doc: z.string().default(''),
  Dirfiscal: z.string().default(''),
  anno: z.string().default(''),
  cadenaUIT: z.string().default(''),
  rtramo01: z.coerce.string().default(''),
  rtramo02: z.coerce.string().default(''),
  rtramo03: z.coerce.string().default(''),
  base_imponible1: num,
  imp_anual1: num,
  cuotas: z.string().default(''),
  imp_insol: num,
  imp_insoltexto: z.string().default(''),
  imp_reaj: num,
  mora: num,
  costo_emis: num,
  costo_emistexto: z.string().default(''),
  imp_total: num,
  imp_totaltexto: z.string().default(''),
  cuota_rej: z.string().default(''),
  cuota_mor: z.string().default(''),
  direccion: z.string().default(''),
  fecha: z.string().default(''),
  moratorio: z.string().default(''),
  fech_proyectado: z.string().default(''),
  cod_pred: z.string().default(''),
  fvencimiento: z.string().default(''),
  periodoRomano: z.string().default(''),
});

export type OpPdfRow = z.infer<typeof OpPdfRowSchema>;
