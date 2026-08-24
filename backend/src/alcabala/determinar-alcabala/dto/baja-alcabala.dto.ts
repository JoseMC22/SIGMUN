import { z } from 'zod';

export const BajaAlcabalaSchema = z.object({
  codigo: z.string().trim().min(1, 'Código de contribuyente es obligatorio'),
  idAlcabala: z.number().int().positive('ID de alcabala debe ser positivo'),
  // 0 (or omitted) means "resolve idrecibo from the DB" — never a positive receipt id.
  idrecibo: z.number().int().nonnegative().optional().default(0),
  observacion: z.string().trim().min(1, 'Motivo de baja es obligatorio'),
});

export type BajaAlcabalaDto = z.infer<typeof BajaAlcabalaSchema>;
