// ── Resultado crudo de la vista (columnas tal como las devuelve SQL Server) ──

export interface SpListaContribuyenteRow {
  CODIGO: string | null;
  NOMBRE: string | null;
  DIRECCION: string | null;
  JUNTA: string | null;
  DNI: string | null;
  CORREO: string | null;
  ID_VIA: string | null;
  TELEFONO1: string | null;
  BASE_IMPONIBLE: number | null;
  INAFECTO: number | null;
  CATEGORIA: string | null;
  GESTOR: string | null;
  IMP_ANUAL: number | null;
  IMP_TRIME: number | null;
  COSTO_EMI: number | null;
  IMPTOTAL: number | null;
}

// ── Tipos de dominio ──

export interface ContribuyenteRow {
  codigo: string;
  nombre: string;
  direccion: string;
  junta: string;
  dni: string;
  correo: string;
  idVia: string;
  telefono1: string;
  baseImponible: number;
  inafecto: number;
  categoria: string;
  gestor: string;
  impAnual: number;
  impTrime: number;
  costoEmi: number;
  impTotal: number;
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