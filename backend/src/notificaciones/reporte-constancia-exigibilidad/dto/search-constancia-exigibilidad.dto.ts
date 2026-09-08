import { z } from 'zod';

/**
 * Criterios del Reporte de Constancia de Exigibilidad.
 * Búsqueda única @opcion=5 que combina un código opcional
 * con un rango de fechas (SP COACTIVO.USP_EXIGIBILIDAD).
 */
export const SearchConstanciaExigibilidadSchema = z.object({
  codigo: z.string().max(20).optional(), // código (opcional, texto)
  fdesde: z.string().optional(), // fecha desde (YYYY-MM-DD)
  fhasta: z.string().optional(), // fecha hasta (YYYY-MM-DD)
});

export type SearchConstanciaExigibilidadDto = z.infer<
  typeof SearchConstanciaExigibilidadSchema
>;
