import { z } from 'zod';

export const SaveAccoSchema = z.object({
  id_acceso: z.string().min(1, 'El código de acceso es requerido').max(8),
  id_acceso_old: z.string().optional().default(''),
  orden: z.string().min(1, 'El tipo es requerido').max(1),
  menu: z.string().optional().default(''),
  pantalla: z.string().optional().default(''),
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  icono: z.string().max(50).optional().default(''),
  doform: z.string().max(50).optional().default(''),
  id_objeto: z.string().max(50).optional().default(''),
  nestado: z
    .union([z.boolean(), z.string()])
    .transform((v) => {
      if (typeof v === 'boolean') return v ? '1' : '0';
      return v || '1';
    }),
});

export type SaveAccesoDto = z.infer<typeof SaveAccoSchema>;
