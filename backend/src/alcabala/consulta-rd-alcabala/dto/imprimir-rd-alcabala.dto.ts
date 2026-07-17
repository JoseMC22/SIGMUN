import { z } from 'zod';

// Plantilla HTML from caja.plantillas WHERE id=36 + exec Rentas.sp_Imprime_alcabala @buscar=1, @id_valor='08'
export const ImprimirRdAlcabalaSchema = z.object({
  num_val: z.string().optional().default(''),
  ano_val: z.string().optional().default(''),
});

export type ImprimirRdAlcabalaDto = z.infer<typeof ImprimirRdAlcabalaSchema>;
