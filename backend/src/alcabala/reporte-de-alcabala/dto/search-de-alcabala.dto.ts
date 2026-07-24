import { z } from 'zod';

export const SearchDeAlcabalaSchema = z.object({
  codigo: z.string().optional(),
  anio: z
    .coerce.number()
    .int()
    .min(1998, 'El anio minimo es 1998')
    .max(new Date().getFullYear(), `El anio maximo es ${new Date().getFullYear()}`)
    .default(new Date().getFullYear()),
  estado: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100000).default(15),
});

export type SearchDeAlcabalaDto = z.infer<typeof SearchDeAlcabalaSchema>;