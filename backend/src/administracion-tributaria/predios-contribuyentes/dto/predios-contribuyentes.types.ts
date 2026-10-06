// ── Resultado crudo del SP (columnas tal como las devuelve SQL Server) ──

export interface SpPredioContribuyenteRow {
  Codigo: string | null;
  Nombre: string | null;
  Categoria: string | null;
  CodPredio: string | null;
  Anexo: string | null;
  Sub_Anexo: string | null;
  Predio: string | null;
  Junta: string | null;
}

// ── Tipos de dominio ──

export interface PredioContribuyenteRow {
  codigo: string;
  nombre: string;
  categoria: string;
  codPredio: string;
  anexo: string;
  subAnexo: string;
  predio: string;
  junta: string;
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