import { z } from 'zod';

// ── Vincular representante con contribuyente recién creado (sp_Mrepresentante @busc=13) ──

export const VincularRepresentanteSchema = z.object({
  codigo: z.string().min(1, 'El código del contribuyente es obligatorio.'),
  id: z.string().min(1, 'El id del representante es obligatorio.'),
});

export type VincularRepresentanteDto = z.infer<typeof VincularRepresentanteSchema>;
