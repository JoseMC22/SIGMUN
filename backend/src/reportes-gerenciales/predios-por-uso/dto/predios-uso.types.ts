// ── SP result: [Rentas].[Rpt_Rentas_General] @BUSC=1 ──

export interface SpPredioUsoRow {
  tipo: string;
  Uso: string;
  '# PREDIOS': number;
  Condicion: string;
  Count: number;
  anno: number;
  id_uso: string;
  ROW: number;
}

// ── Domain types ──

export interface PredioUsoRow {
  tipo: string;
  uso: string;
  predios: number;
  condicion: string;
  count: number;
  anno: number;
  id_uso: string;
}

// ── [Rentas].[sp_predio] @msquery=3, @tipo_predi=1 ──

export interface SpTipoUsoRow {
  id_uso: string;
  descripcion: string;
  [key: string]: unknown;
}

// ── Response envelope ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
