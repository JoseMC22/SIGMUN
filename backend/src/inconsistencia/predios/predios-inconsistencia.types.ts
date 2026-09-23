// ── Fila del result set de Rentas.sp_inconsistencias (llamada de datos) ──
// Nombres exactos del SP, incluida la errata `direcion`.

export interface PredioInconsistenciaRow {
  codigo: string;
  nombre: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  direcion: string;
  uso: string;
  area_terreno: number;
  porcen_propiedad: number;
  val_total_terreno: number;
  val_total_constru: number;
  total_autoavaluo: number;
  ROW: number;
}

// ── Envoltorio paginado genérico ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Combo tipo de inconsistencia (Acceso.Macceso) ──

export interface TipoInconsistenciaOption {
  id_acceso: string;
  nombre: string;
}

export interface SpTipoInconsistenciaRow {
  id_acceso: string;
  nombre: string;
  [key: string]: unknown;
}

// ── Combo tipo de uso (Contenedor.TblUsoPredio, solo visual) ──

export interface UsoPredioOption {
  id_uso: string;
  uso: string;
}

export interface SpUsoPredioRow {
  id_uso: string;
  uso: string;
  [key: string]: unknown;
}
