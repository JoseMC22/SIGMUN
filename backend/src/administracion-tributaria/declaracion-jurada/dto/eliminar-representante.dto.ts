import { z } from 'zod';

// ── Eliminar representante (sp_Mrepresentante @busc=7) ──

export const EliminarRepresentanteSchema = z.object({
  codigo: z.string().min(1, 'El código del contribuyente es obligatorio.'),
  id: z.string().min(1, 'El id del representante es obligatorio.'),
});

export type EliminarRepresentanteDto = z.infer<typeof EliminarRepresentanteSchema>;
