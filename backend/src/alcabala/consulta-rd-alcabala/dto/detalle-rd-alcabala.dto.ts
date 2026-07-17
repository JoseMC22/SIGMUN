import { z } from 'zod';

// Params for: exec Rentas.SP_Mvalores @msquery=4, @id_valor='08', @num_val='', @ano_val=''
export const DetalleRdAlcabalaSchema = z.object({
  num_val: z.string().optional().default(''),
  ano_val: z.string().optional().default(''),
  nombre: z.string().optional().default(''),
  nomb_val: z.string().optional().default(''),
});

export type DetalleRdAlcabalaDto = z.infer<typeof DetalleRdAlcabalaSchema>;
