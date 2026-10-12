// ── Resultado crudo del SP dbo.t_tipo_sing @msquery=15 ──
// Columnas reales del SP (evidencia del usuario): Tipo, Nombre_Tipo,
// Partida, Nombre, Ftefin, Valor, ROW. Se aceptan variantes de casing
// por robustez ante el driver.

export interface SpMantenimientoIngresoRow {
  Tipo?: string | null;
  TIPO?: string | null;
  Nombre_Tipo?: string | null;
  NOMBRE_TIPO?: string | null;
  Partida?: string | null;
  PARTIDA?: string | null;
  Nombre?: string | null;
  NOMBRE?: string | null;
  Ftefin?: string | null;
  FTEFIN?: string | null;
  Valor?: number | null;
  VALOR?: number | null;
  ROW?: number | null;
}

// ── Tipos de dominio ──

export interface MantenimientoIngresoRow {
  codigo: string;
  concepto: string;
  partida: string;
  nombre: string;
  ftefin: string;
  valor: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
}
