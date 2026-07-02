import { z } from 'zod';

export const SaveArancelSchema = z.object({
  id_tbl: z.union([z.string(), z.number()]).optional().default(''),
  cod_via: z.string().min(1, 'cod_via es requerido'),
  anno: z.string().min(1, 'anno es requerido'),
  arancel: z.union([z.string(), z.number()]).transform((v) => String(v)).pipe(z.string().min(1, 'arancel es requerido')),
  nestado: z.string().min(1, 'nestado es requerido'),
  operador: z.string().default(''),
  estacion: z.string().default(''),
});

export type SaveArancelDto = z.infer<typeof SaveArancelSchema>;
