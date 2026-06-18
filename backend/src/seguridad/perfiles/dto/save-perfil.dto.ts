import { z } from 'zod';

export const SavePerfilSchema = z.object({
  id_perfil: z.string().optional().default(''),
  nombre: z.string().min(1, 'El nombre del perfil es requerido'),
  nestado: z
    .union([z.boolean(), z.string()])
    .transform((v) => {
      if (typeof v === 'boolean') return v ? '1' : '0';
      return v || '1';
    }),
});

export type SavePerfilDto = z.infer<typeof SavePerfilSchema>;
