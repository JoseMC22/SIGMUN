// ── Resultado crudo del SP caja.sp_ordenanzas (@msquery=3) ──
// SELECT * FROM CAJA.MORDENANZAS (fuente verificada en vivo, 13/10):
// idordenanza, criterio (char con padding), descripcion, fec_desde
// (datetime), fec_hasta (datetime), observacion, estado (char),
// operador (char con padding), estacion (char con padding),
// fech_ing (datetime). El driver mssql entrega datetime como Date.

export interface SpOrdenanzaRow {
  idordenanza?: number | null;
  criterio?: string | null;
  descripcion?: string | null;
  fec_desde?: string | Date | null;
  fec_hasta?: string | Date | null;
  observacion?: string | null;
  estado?: string | null;
  operador?: string | null;
  estacion?: string | null;
  fech_ing?: string | Date | null;
}

// ── Tipos de dominio ──

/**
 * Ordenanza (master) normalizada para el listado: campos char recortados
 * (sin padding, null → '') y fechas en passthrough ISO (el front formatea).
 */
export interface OrdenanzaRow {
  idordenanza: number;
  criterio: string;
  descripcion: string;
  fec_desde: string;
  fec_hasta: string;
  observacion: string;
  estado: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

/**
 * Contrato del endpoint GET /api/mantenimiento-tablas/ordenanzas (S3):
 * lista completa sin paginación (25 filas); lista vacía → { data: [] }
 * SIN excepción (distinto de mantenimiento-uit, que lanza por año).
 */
export interface OrdenanzasResponse {
  data: OrdenanzaRow[];
}
