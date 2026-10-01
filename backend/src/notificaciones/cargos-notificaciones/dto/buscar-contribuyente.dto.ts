import { z } from 'zod';

/**
 * Código de contribuyente para la búsqueda manual en rentas.mcontribuyente
 * (Cargos de Notificación — tipo de valor Resolución de Gerencia).
 */
export const BuscarContribuyenteSchema = z.object({
  codigo: z.string().min(1, 'Debe ingresar un Código de Contribuyente'),
});

export type BuscarContribuyenteDto = z.infer<typeof BuscarContribuyenteSchema>;