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

// ── SP result: busc='3' (perfil detail) ──

export interface SpPerfilDetail {
  id_perfil: string;
  nombre: string;
  nestado: string;
}

// ── SP result: busc='7' (módulos) ──

export interface SpModuloRow {
  id_acceso: string;
  nombre: string;
}

// ── SP result: busc='8' (accesos por módulo) ──

export interface SpAccesoRow {
  id_acceso: string;
  nombre: string;
}

// ── SP result: busc='10' (perfil-access mappings) ──

export interface SpPerfilAcceso {
  id_acceso: string;
  bacceso: string; // "0" or "1"
}

// ── Domain types ──

export interface PerfilRow {
  id: string;
  nombre: string;
  estado: string; // "ACTIVADO" | "DESACTIVADO"
}

export interface PerfilDetail {
  id: string;
  nombre: string;
  estado: boolean; // true = activado
}

export interface ModuloRow {
  id_acceso: string;
  nombre: string;
}

export interface AccesoRow {
  id_acceso: string;
  nombre: string;
  checked: boolean;
}

// ── Response envelopes ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
