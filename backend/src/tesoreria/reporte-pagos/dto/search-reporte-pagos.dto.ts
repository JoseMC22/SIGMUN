import { z } from 'zod';

/**
 * Search criteria for "Reporte Pagos" (`Caja.sp_rptTesoreria` @buscar=9).
 *
 * Dates arrive from the UI as ISO `YYYY-MM-DD` and are forwarded to the SP
 * as `DD/MM/YYYY`, because the SP runs `set dateformat dmy`.
 */
export const SearchReportePagosSchema = z
  .object({
    fecha_inicio: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'La fecha de inicio debe tener formato YYYY-MM-DD',
      ),
    fecha_fin: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'La fecha de fin debe tener formato YYYY-MM-DD',
      ),
    recibo: z.string().trim().max(18).optional(),
    codigo: z.string().trim().max(12).optional(),
    contribuyente: z.string().trim().max(40).optional(),
    placa: z.string().trim().max(10).optional(),
    papeleta: z.string().trim().max(15).optional(),
    talonario: z.string().trim().max(2).optional(),
    anio: z.string().trim().max(4).optional(),
  })
  .refine((dto) => dto.fecha_inicio <= dto.fecha_fin, {
    message: 'La fecha de inicio no puede ser mayor que la fecha de fin',
    path: ['fecha_fin'],
  });

export type SearchReportePagosDto = z.infer<typeof SearchReportePagosSchema>;
