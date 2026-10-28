import { z } from 'zod';

export const SearchReporteIngresosGerenciaSchema = z.object({
  desde: z.string().min(1, 'La fecha inicial es requerida'),
  hasta: z.string().min(1, 'La fecha final es requerida'),
  area: z.string().optional().default(''),
  cajero: z.string().optional().default('--'),
  tipo_operacion: z.string().optional().default(''),
  nivel: z.coerce.number().int().optional().default(0),
});

export type SearchReporteIngresosGerenciaDto = z.infer<
  typeof SearchReporteIngresosGerenciaSchema
>;
