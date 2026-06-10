// ── SP result interfaces ──

export interface SpUsuariosRow {
  id_usuario: string;
  nombre: string;
  area: string;
  perfil: string;
  vlogin: string;
  nestado: string; // "0" or "1" from SP
  ROW: number;
}

export interface SpUsuariosTotal {
  total: number;
}

export interface SpAreaRow {
  area: string;
  nombre: string;
}

export interface SpPerfilRow {
  id_perfil: string;
  nombre: string;
  nestado: number;
}

/** Row from sp_TblUsuarios @busc='9' (user detail) */
export interface SpUsuarioDetalleRow {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  area: string;
  vlogin: string;
  id_perfil: string;
  id_doc: string;
  num_doc: string;
  cargo: string;
  cajero: string | null;
  nestado: string;
}

/** Row from sp_TblUsuarios @busc='8' (document types) */
export interface SpTipoDocumentoRow {
  id_doc: string;   // "01/8" — value/maxLength combined
  documento: string; // "DNI"
}

/** Row from sp_TblUsuarios @busc='10' (cajeros) */
export interface SpCajeroRow {
  caja: string;     // single column, used as both value and display
}

// ── Domain types ──

export interface UsuarioRow {
  id: string;
  nombre: string;
  area: string;
  perfil: string;
  usuario: string;
  estado: string; // "ACTIVADO" | "DESACTIVADO"
}

export interface UsuarioDetalle {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  area: string;
  vlogin: string;
  id_perfil: string;
  id_doc: string;
  num_doc: string;
  cargo: string;
  cajero: string | null;
  nestado: string;
}

export interface AreaOption {
  area: string;
  nombre: string;
}

export interface PerfilOption {
  id_perfil: string;
  nombre: string;
}

export interface TipoDocumentoOption {
  codigo: string;    // "01"
  nombre: string;    // "DNI"
  maxLength: number; // 8
}

export interface CajeroOption {
  codigo: string;
  nombre: string;
}

// ── Response envelopes ──

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
