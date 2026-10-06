// ── Resultado crudo del SP (columnas tal como las devuelve SQL Server) ──

export interface SpContribuyenteSinValoresRow {
  Codigo: string | null;
  Categoria: string | null;
  Nombre: string | null;
  Direccion: string | null;
  Junta: string | null;
  Anno: string | null;
  periodos: string | null;
  TOTAL_INSOL: number | null;
  TOTAL_INTERES: number | null;
  TOTAL_COSTO_EMIS: number | null;
  TOTAL_GENERAL: number | null;
}

// ── Tipos de dominio ──

export interface ContribuyenteSinValoresRow {
  codigo: string;
  categoria: string;
  nombre: string;
  direccion: string;
  junta: string;
  anno: string;
  periodos: string;
  totalInsol: number;
  totalInteres: number;
  totalCostoEmis: number;
  totalGeneral: number;
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
