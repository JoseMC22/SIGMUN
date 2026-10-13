import { z } from 'zod';

/**
 * Alta de ordenanza master (T5, caja.sp_ordenanzas @msquery=1).
 *
 * Contrato del modal de alta: fechas YYYY-MM-DD (el service las normaliza a
 * YYYYMMDD con toIsoDateParam para el SP); observacion y estacion son
 * opcionales con default '' — el SP exige los parámetros presentes en toda
 * llamada, y '' es un valor real para un parámetro varchar sin default.
 */
export const CrearOrdenanzaSchema = z.object({
  criterio: z.coerce
    .number({ invalid_type_error: 'El criterio debe ser un número' })
    .int('El criterio debe ser un número entero'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  fdesde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La vigencia desde debe tener formato YYYY-MM-DD'),
  fhasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La vigencia hasta debe tener formato YYYY-MM-DD'),
  observacion: z.string().optional().default(''),
  estacion: z.string().default(''),
});

export type CrearOrdenanzaDto = z.infer<typeof CrearOrdenanzaSchema>;
