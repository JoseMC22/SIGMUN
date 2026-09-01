// ── SP result interfaces for Reporte de Constancia de Exigibilidad ──

/** A single row from SP `[COACTIVO].[USP_EXIGIBILIDAD]` @opcion=5. */
export interface ConstanciaExigibilidadRow {
  [key: string]: string | number | null; // dynamic columns — SP shape is DB-defined
}

/** Unified envelope returned by the search endpoint. */
export interface ConstanciaExigibilidadResult {
  success: boolean;
  data: ConstanciaExigibilidadRow[];
  total: number;
  error?: string;
}
