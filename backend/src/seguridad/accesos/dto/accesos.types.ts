// ── SP result: @busc=5 (paginated rows) ──

export interface SpAccesoRow {
  id_acceso: string;
  orden: string;
  nombre: string;
  id_objeto: string;
  icono: string;
  doform: string;
  nestado: string;
  ROW: number;
}

// ── SP result: @busc=6 (total count) ──

export interface SpAccesoTotal {
  total: number;
}

// ── Domain types ──

export interface AccesoRow {
  id_acceso: string;
  orden: string;
  nombre: string;
  id_objeto: string;
  icono: string;
  doform: string;
  nestado: string;
}

export interface MenuOption {
  id_acceso: string;
  nommenu: string;
}

export type ModuloOption = MenuOption;

// ── Response envelope ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
