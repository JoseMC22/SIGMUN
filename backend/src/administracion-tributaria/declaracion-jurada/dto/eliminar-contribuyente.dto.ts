import { z } from 'zod';

// ── Eliminar contribuyente (sp_Mcontribuyente @busc=3) ──

export const EliminarContribuyenteSchema = z.object({
  codigo: z.string().min(1, 'El código del contribuyente es obligatorio.'),
  motivo: z.string().optional().default(''),
  operador: z.string().optional().default(''),
});

export type EliminarContribuyenteDto = z.infer<typeof EliminarContribuyenteSchema>;