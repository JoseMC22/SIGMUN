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

// ── Detalle (iteración 3, @msquery=4) ──

// Resultado crudo del SP caja.sp_ordenanzas (@msquery=4): SELECT * FROM
// CAJA.DORDENANZAS (fuente verificada en vivo, 13/10): idordenanza,
// cidordenanza (FK al master), anno (char 4), tipo (char 5), tipo_rec
// (char 5), imp_insol, imp_reaj, mora, costo_emis (decimal), observacion,
// estado (char), fec_venc (datetime), operador/estacion (char con
// padding), fech_ing (datetime). El SP NO filtra server-side: devuelve
// TODAS las filas (~3210) — el filtro por cidordenanza es en memoria.
export interface SpOrdenanzaDetalleRow {
  idordenanza?: number | null;
  cidordenanza?: number | string | null;
  anno?: string | null;
  tipo?: string | null;
  tipo_rec?: string | null;
  imp_insol?: number | string | null;
  imp_reaj?: number | string | null;
  mora?: number | string | null;
  costo_emis?: number | string | null;
  observacion?: string | null;
  estado?: string | null;
  fec_venc?: string | Date | null;
  operador?: string | null;
  estacion?: string | null;
  fech_ing?: string | Date | null;
}

/**
 * Fila de detalle de ordenanza normalizada: campos char recortados
 * (null → ''), montos numéricos y fechas en passthrough ISO (el front
 * formatea).
 */
export interface OrdenanzaDetalleRow {
  idordenanza: number;
  cidordenanza: number;
  anno: string;
  tipo: string;
  tipo_rec: string;
  imp_insol: number;
  imp_reaj: number;
  mora: number;
  costo_emis: number;
  observacion: string;
  estado: string;
  fec_venc: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

/**
 * Contrato del endpoint GET /api/mantenimiento-tablas/ordenanzas/detalle
 * (T7): filas del master pedido; sin filas → { data: [] } SIN excepción.
 */
export interface OrdenanzasDetalleResponse {
  data: OrdenanzaDetalleRow[];
}
