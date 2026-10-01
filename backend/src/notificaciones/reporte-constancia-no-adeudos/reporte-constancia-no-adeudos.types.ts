// ── SP result interfaces for Reporte de Constancia de No Adeudos ──

/**
 * Fila del SP Certificado.sp_certificado con @BUSC=5.
 * Las columnas tienen casing mixto como viene del SP; no normalizar.
 * - Numero, Año, Fecha, codigo, Nombre, concepto
 * Año contiene 'ñ' → acceder siempre por corchetes (row['Año']).
 */
export interface ConstanciaNoAdeudoRow {
  Numero?: string | number | null;
  Año?: string | number | null; // con ñ
  Fecha?: string | number | null; // viene como dd/mm/yyyy
  codigo?: string | number | null;
  Nombre?: string | number | null;
  concepto?: string | number | null;

  /**
   * Allow extra columns returned by SP without losing them.
   */
  [key: string]: string | number | null | undefined;
}

/**
 * Envelope de respuesta unificado para el endpoint de búsqueda.
 * Exito: { success: true, data, total, page, pageSize, totalPages }
 * Error: { success: false, data: [], total: 0, page, pageSize, totalPages: 0, error }
 */
export interface ConstanciaNoAdeudoResult {
  success: boolean;
  data: ConstanciaNoAdeudoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}
