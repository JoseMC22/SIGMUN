import { z } from 'zod';

/**
 * Schema for a row from `Rentas.sp_ImprimeOP @buscar=2` (35 columns).
 * Numeric columns default to 0; string columns default to ''.
 */
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
  rtramo01: z.string().default(''),
  rtramo02: z.string().default(''),
  rtramo03: z.string().default(''),
  base_imponible1: z.coerce.number().default(0),
  imp_anual1: z.coerce.number().default(0),
  cuotas: z.string().default(''),
  imp_insol: z.coerce.number().default(0),
  imp_insoltexto: z.string().default(''),
  imp_reaj: z.coerce.number().default(0),
  mora: z.coerce.number().default(0),
  costo_emis: z.coerce.number().default(0),
  costo_emistexto: z.string().default(''),
  imp_total: z.coerce.number().default(0),
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
