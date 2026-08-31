import { z } from 'zod';

/**
 * Search criteria for the Reporte de Cargos.
 * Two mutually exclusive modes:
 *  - Modo "tipo_valor": busca por Tipo de Valor + N° de Valor + Año (@busc=15).
 *  - Modo "fecha": busca por Rango de Fechas (@busc=7).
 */
export const SearchReporteCargosSchema = z.object({
  mode: z.enum(['tipo_valor', 'fecha']).default('fecha'),

  // Modo tipo_valor (@busc=15)
  id_valor: z.string().optional(),
  nom_valor: z.string().optional(), // display label passthrough (no SP use)
  num_valor: z.string().optional(),
  ano_valor: z.coerce.number().int().optional(),

  // Modo fecha (@busc=7)
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
});

export type SearchReporteCargosDto = z.infer<typeof SearchReporteCargosSchema>;
