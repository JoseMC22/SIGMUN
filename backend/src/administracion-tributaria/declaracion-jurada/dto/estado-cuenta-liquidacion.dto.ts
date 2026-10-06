import { z } from 'zod';

const LiquidacionReciboSchema = z.object({
  idrecibo: z.union([z.string(), z.number()]),
  codigo: z.string(),
  anno: z.string(),
  cod_pred: z.string(),
  anexo: z.string().default(''),
  sub_anexo: z.string().default(''),
  tipo: z.string(),
  tipo_rec: z.string(),
  periodo: z.string(),
  total: z.number(),
  imp_reaj: z.number(),
  mora: z.number().default(0),
  costo_emis: z.number().default(0),
  fact_mora: z.number().default(0),
  benefic: z.number().default(0),
  ubica: z.string().optional(),
});

export const GenerarLiquidacionDJSchema = z.object({
  codigo: z.string().min(1),
  totalp: z.number(),
  liquidacion: z.array(LiquidacionReciboSchema).min(1),
  vt: z
    .array(
      z.object({
        codigo: z.string(),
        idrecibo: z.union([z.string(), z.number()]),
      }),
    )
    .default([]),
  usuario: z.string().optional().default('USUARIO'),
});

export type GenerarLiquidacionDJDto = z.infer<typeof GenerarLiquidacionDJSchema>;
