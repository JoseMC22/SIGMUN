// ── SP result interfaces — Reporte de Fraccionamientos con Cuotas Impagadas ──

/**
 * Fila del SP Rentas.Rpt_Rentas_General con @BUSC=42 (rama rpt_fraccionamientos_resumen).
 *
 * Las columnas tienen casing y simbolos literales como viene del SP; NO normalizar:
 * - 'Año' lleva ñ  → acceder siempre por corchetes (row['Año'])
 * - 'F.Convenio' y 'Ins Vencido' llevan punto → acceso por corchetes obligatorio
 *
 * Orquestado sobre SRV201.SIGMUN_DATAMART.[DATA].[NOTIFICACION_FRACCIONAMIENTOS].
 */
export interface FraccCuotasImpagasRow {
  Codigo?: string | number | null;
  Nombre?: string | number | null;
  Direccion?: string | number | null;
  'Año'?: string | number | null;
  Convenio?: string | number | null;
  /** Fecha del convenio en dd/mm/yyyy. Es la unica fecha real por fraccionamiento. */
  'F.Convenio'?: string | number | null;
  Deuda?: string | number | null;
  'C.Inicial'?: string | number | null;
  Cuotas?: string | number | null;
  Pendientes?: string | number | null;
  Vencidas?: string | number | null;
  'Ins Vencido'?: string | number | null;
  'Mora Ven'?: string | number | null;
  /** Fecha del datamart: constante en todo el resultado, no sirve como criterio. */
  curren_date?: string | number | null;
  estado_frac?: string | number | null;

  /**
   * Allow extra columns returned by SP without losing them.
   */
  [key: string]: string | number | null | undefined;
}

/**
 * Envelope de respuesta unificado para el endpoint de búsqueda.
 * Exito:    { success: true, data, total, page, pageSize, totalPages }
 * Error:    { success: false, data: [], total: 0, page, pageSize, totalPages: 0, error }
 */
export interface FraccCuotasImpagasResult {
  success: boolean;
  data: FraccCuotasImpagasRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}