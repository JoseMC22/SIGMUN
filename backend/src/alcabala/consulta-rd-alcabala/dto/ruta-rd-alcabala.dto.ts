import { z } from 'zod';

// Params for: exec Rentas.SP_MHRuta @msquery='3', @id_valor='08', @num_val='', @ano_val=''
export const RutaRdAlcabalaSchema = z.object({
  num_val: z.string().optional().default(''),
  ano_val: z.string().optional().default(''),
  nombre: z.string().optional().default(''),
  nomb_val: z.string().optional().default(''),
});

export type RutaRdAlcabalaDto = z.infer<typeof RutaRdAlcabalaSchema>;
