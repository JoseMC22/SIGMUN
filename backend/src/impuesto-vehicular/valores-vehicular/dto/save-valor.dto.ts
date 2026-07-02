import { z } from 'zod';

export const SaveValorSchema = z.object({
  id: z.string().optional(), // empty = create
  id_anio: z.string().min(1, 'Año ejercicio es requerido'),
  id_categoria: z.string().min(1, 'Categoría es requerida'),
  id_marca: z.string().min(1, 'Marca es requerida'),
  id_modelo: z.string().optional(), // from txtIdModelo in PHP (internal)
  anio: z.string().min(1, 'Año es requerido'),
  monto: z.coerce.number().positive('Monto debe ser positivo'),
  estado: z.string(), // "0" | "1"
  xidmod: z.string().min(1, 'Modelo es requerido'), // from cbModelo combo
});

export type SaveValorDto = z.infer<typeof SaveValorSchema>;
