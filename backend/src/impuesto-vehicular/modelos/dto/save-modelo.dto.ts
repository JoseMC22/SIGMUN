import { z } from 'zod';

export const SaveModeloSchema = z.object({
  id: z.string().optional(), // empty = create, non-empty = update
  nombre: z.string().min(1, 'Nombre es requerido'),
  id_categoria: z.string().min(1, 'Categoría es requerida'),
  id_marca: z.string().min(1, 'Marca es requerida'),
  estado: z.string(), // "0" | "1"
});

export type SaveModeloDto = z.infer<typeof SaveModeloSchema>;
