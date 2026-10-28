// ── Tipos del Reporte de Pagos (Caja.sp_rptTesoreria @buscar=9) ──

/** Fila ya mapeada a nombres de dominio (columnas visibles del legacy). */
export interface ReportePagoRow {
  recibo: string;
  fecha_pago: string;
  clasificacion: string;
  codigo: string;
  contribuyente: string;
  tributo: string;
  monto: number;
  tipo_pago: string;
  estado: string;
  /** Id numérico del tipo de operación ('1' Sismuni, '2' Tupa, '4' Entrada). */
  tipo_operacion: string;
  /** Marca de recibo especial ('12.23'); se usa para el color de fila. */
  tipo_rec: string;
  caja: string;
}

/** Envelope devuelto por el endpoint de búsqueda. */
export interface ReportePagosResult {
  success: boolean;
  /** Solo la página pedida. */
  data: ReportePagoRow[];
  /** Cantidad total de filas del filtro (todas las páginas). */
  total: number;
  /** Suma de `monto` de todo el filtro, redondeada a 2 decimales. */
  monto_total: number;
  page: number;
  page_size: number;
  total_pages: number;
  error?: string;
}
