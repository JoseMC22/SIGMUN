import { z } from 'zod';

// ── Generar Deuda — Guardar (Rentas.sp_generardeuda @buscar=12) ──
// POST body. @buscar=12 is fixed in the backend (this endpoint is
// purpose-built for the "Generar Deuda" modal's "Guardar" button).
//
// Frontend must supply operador (from getStoredUser().username) and
// estacion (from getPcName()) so the SP has the audit trail it expects.

export const GenerarDeudaGuardarSchema = z.object({
  /** Código del contribuyente (varchar(7)). Requerido: el SP @busc=12
   *  usa @codigo en WHERE/INSERT. Sin él, el SP mete '' en mrecibos.codigo
   *  y rompe por PK duplicada en iteraciones siguientes del WHILE. */
  codigo: z
    .string()
    .min(1, 'El código del contribuyente es obligatorio.')
    .max(7, 'El código no puede superar los 7 caracteres.'),
  /** Año Desde (4 dígitos, e.g. "2025") */
  anio_desde: z
    .string()
    .regex(/^\d{4}$/, 'El año Desde debe tener 4 dígitos.'),
  /** Año Hasta (4 dígitos, e.g. "2026") */
  anio_hasta: z
    .string()
    .regex(/^\d{4}$/, 'El año Hasta debe tener 4 dígitos.'),
  /** Tipo seleccionado del combobox "Concepto" (e.g. "10.86") */
  codigo_infraccion: z
    .string()
    .min(1, 'Seleccione un concepto.'),
  /** Monto de la deuda S/. (> 0) */
  monto_multa: z
    .number({ invalid_type_error: 'El monto debe ser numérico.' })
    .positive('El monto debe ser mayor a 0.'),
  /**
   * Fecha de la multa.
   * Acepta `YYYY-MM-DD` (input date del frontend) o `dd/MM/yyyy`.
   * El service la normaliza a `dd/MM/yyyy` antes de enviarla al SP
   * para que SQL Server (idioma Spanish, columna datetime) la parsee
   * sin errores de conversión.
   */
  fecha_multa: z
    .string()
    .regex(
      /^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/,
      'La fecha debe tener formato YYYY-MM-DD o dd/MM/yyyy.',
    ),
  /** Usuario que genera la deuda (getStoredUser().username) */
  operador: z.string().min(1, 'El operador es obligatorio.'),
  /** Hostname de la PC donde se ejecuta (getPcName()) */
  estacion: z.string().min(1, 'La estación es obligatoria.'),
  /** Observaciones / glosa de la multa (input "observaciones" del modal). */
  glosa: z.string().max(4000, 'La glosa no puede superar los 4000 caracteres.').optional().default(''),
});

export type GenerarDeudaGuardarDto = z.infer<typeof GenerarDeudaGuardarSchema>;
