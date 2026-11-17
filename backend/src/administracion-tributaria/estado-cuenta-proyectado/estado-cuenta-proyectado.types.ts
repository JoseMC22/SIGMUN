// ── Raw named row from Rentas.sp_Mcontribuyente @busc=5 ──
// `mssql` returns `recordset` as objects keyed by column/alias; the legacy
// positional indexes are deliberately not reproduced here.
export type SpContribuyenteProyectadoRow = Readonly<Record<string, unknown>>;

// ── Criterion values accepted by @tipo_busqueda ──
export type TipoBusquedaProyectado = 'C' | 'N' | 'D' | 'R';

// ── Domain row exposed by the search endpoint ──
export interface ContribuyenteProyectadoRow {
  codigo: string;
  nombres: string;
  documento: string;
  direccion: string;
}

// ── Paginated response envelope (same shape as consulta-predios) ──
export interface EstadoCuentaProyectadoSearchResponse {
  data: ContribuyenteProyectadoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
