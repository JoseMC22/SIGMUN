import { z } from 'zod';

// Eliminar (anular) una RD del listado de consulta RD Alcabala.
// Llama a Rentas.SP_ConsultadocuAlcabala @msquery=5 (Eliminar RD).
export const EliminarRdAlcabalaSchema = z.object({
  num_val: z.string().trim().min(1, 'Número de RD es obligatorio'),
  ano_val: z.string().trim().min(1, 'Año de RD es obligatorio'),
  observacion: z.string().trim().min(1, 'Motivo de eliminación es obligatorio'),
});

export type EliminarRdAlcabalaDto = z.infer<typeof EliminarRdAlcabalaSchema>;
