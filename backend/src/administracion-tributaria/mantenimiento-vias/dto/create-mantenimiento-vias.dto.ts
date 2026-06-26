import { z } from 'zod';

// ─── CREATE ────────────────────────────────────────────────

export const CreateMantenimientoViaSchema = z.object({
  id_urba: z.string().max(4, 'id_urba máximo 4 caracteres'),
  tipovia: z.string().max(2, 'tipovia máximo 2 caracteres'),
  vcuadra: z.string().max(2, 'vcuadra máximo 2 caracteres'),
  id_zona: z.string().max(2, 'id_zona máximo 2 caracteres'),
  nombre_via: z.string().max(200, 'nombre_via máximo 200 caracteres'),
  id_tipozona: z.string().max(2, 'id_tipozona máximo 2 caracteres'),
  nestado: z.string().max(1, 'nestado máximo 1 carácter'),
  vlado: z.string().max(1, 'vlado máximo 1 carácter'),
  operador: z.string().default(''),
  estacion: z.string().max(25, 'estacion máximo 25 caracteres').default(''),
});

export type CreateMantenimientoViaDto = z.infer<typeof CreateMantenimientoViaSchema>;

// ─── UPDATE ────────────────────────────────────────────────

export const UpdateMantenimientoViaSchema = z.object({
  id_urba: z.string().max(4, 'id_urba máximo 4 caracteres'),
  tipovia: z.string().max(2, 'tipovia máximo 2 caracteres'),
  vcuadra: z.string().max(2, 'vcuadra máximo 2 caracteres'),
  id_zona: z.string().max(2, 'id_zona máximo 2 caracteres'),
  nombre_via: z.string().max(200, 'nombre_via máximo 200 caracteres'),
  id_tipozona: z.string().max(2, 'id_tipozona máximo 2 caracteres'),
  nestado: z.string().max(1, 'nestado máximo 1 carácter'),
  vlado: z.string().max(1, 'vlado máximo 1 carácter'),
  estacion: z.string().max(25, 'estacion máximo 25 caracteres').default(''),
});

export type UpdateMantenimientoViaDto = z.infer<typeof UpdateMantenimientoViaSchema>;
