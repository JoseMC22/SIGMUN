import { z } from 'zod';

export const SearchReporteIngresosCajeroSchema = z.object({
  desde: z.string().min(1, 'La fecha inicial es requerida'),
  hasta: z.string().min(1, 'La fecha final es requerida'),
});

export type SearchReporteIngresosCajeroDto = z.infer<
  typeof SearchReporteIngresosCajeroSchema
>;
