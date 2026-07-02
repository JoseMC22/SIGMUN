// ── SP result interfaces ──

/** Raw row from sp_vehiculo_modelo_listar (0-indexed columns).
 *  Index [0]=codmodelo, [2]=marca, [3]=nombre, [4]=estado,
 *  [5]=categoria, [6]=id. Index [1] is SKIPPED per PHP legacy. */
export interface SpModeloRow {
  codmodelo: string; // [0]
  marca: string; // [2]
  nombre: string; // [3]
  estado: string; // [4]
  categoria: string; // [5]
  id: string; // [6]
}

/** Raw row from sp_vehiculo_modelo_buscar (detail, catalogs). */
export interface SpBuscarRow {
  codmodelo: string;
  nombre: string;
  marca: string;
  id_marca: string;
  id_categoria: string;
  categoria: string;
  estado: string;
  id: string;
}

// ── Domain types ──

export interface ModeloRow {
  codmodelo: string;
  marca: string;
  nombre: string;
  estado: string; // "ACTIVO" | "INACTIVO"
  categoria: string;
  id: string;
}

export interface ModeloDetalle {
  id: string;
  codmodelo: string;
  nombre: string;
  id_marca: string;
  marca: string;
  id_categoria: string;
  categoria: string;
  estado: string;
}

export interface CatalogoOption {
  id: string;
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
