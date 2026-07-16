import { z } from 'zod';

const coerceNum = z.coerce.number().min(0).max(999999.99);
const nullableCoerceNum = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.coerce.number().min(0).max(999999.99).nullable(),
);

export const EditarUitSchema = z.object({
  anno: z.coerce.number().int().min(1992),
  valor_uit: z.coerce.number().positive().max(999999.99),
  imp_minimo: nullableCoerceNum,
  imp_maximo: nullableCoerceNum,
  costo_emis: coerceNum,
  costo_adic: coerceNum,
  estado: z.string().default('1'),
});

export type EditarUitDto = z.infer<typeof EditarUitSchema>;
