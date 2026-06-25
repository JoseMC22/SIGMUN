import { z } from 'zod';

// ─── CREATE ────────────────────────────────────────────────

export const CreateUrbanizacionSchema = z.object({
  id_urba: z.string().max(4, 'id_urba máximo 4 caracteres').optional().default(''),
  tipourb: z.string().max(4, 'tipourb máximo 4 caracteres'),
  nombre:  z.string().max(200, 'nombre máximo 200 caracteres'),
  nestado: z.string().max(1, 'nestado máximo 1 carácter').default('1'),
  operador: z.string().default(''),
  estacion: z.string().max(25, 'estacion máximo 25 caracteres').default(''),
});

export type CreateUrbanizacionDto = z.infer<typeof CreateUrbanizacionSchema>;

// ─── UPDATE ────────────────────────────────────────────────

export const UpdateUrbanizacionSchema = z.object({
  id_urba: z.string().max(4, 'id_urba máximo 4 caracteres').optional().default(''),
  tipourb: z.string().max(4, 'tipourb máximo 4 caracteres'),
  nombre:  z.string().max(200, 'nombre máximo 200 caracteres'),
  nestado: z.string().max(2, 'nestado máximo 2 caracteres').default('1'),  operador: z.string().default(''),  estacion: z.string().max(50, 'estacion máximo 50 caracteres').default(''),
});

export type UpdateUrbanizacionDto = z.infer<typeof UpdateUrbanizacionSchema>;
