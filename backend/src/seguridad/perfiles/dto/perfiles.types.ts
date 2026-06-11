// ── SP result interfaces ──

export interface SpPerfilRow {
  id_perfil: string;
  nombre: string;
  nestado: string; // "0" or "1"
  ROW: number;
}

export interface SpPerfilTotal {
  total: number;
}

// ── Domain types ──

export interface PerfilRow {
  id: string;
  nombre: string;
  estado: string; // "ACTIVADO" | "DESACTIVADO"
}

// ── Response envelopes ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
