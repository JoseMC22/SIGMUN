// ── Raw named row from Rentas.sp_Mcontribuyente @busc=19/20/21 ──
// `mssql` returns `recordset` as objects keyed by column/alias: mapping is
// done by column name, never by position.
export type SpConsultaPrediosRow = Readonly<Record<string, unknown>>;

// ── Domain row (name-based mapping verified against the live SP) ──

export interface ConsultaPrediosRow {
  codigo: string;
  nombre: string;
  cod_pred: string;
  anexo: string;
  direccion: string;
  uso: string;
  t_area_const: number;
  area_terreno: number;
  porcen: number;
  val_terreno: number;
  val_constru: number;
  autoavaluo: number;
  id_instalas: string;
  num_pisos: number;
  categoria: string;
}

// ── Envoltorio paginado de la respuesta de search ──

export interface ConsultaPrediosSearchResponse {
  data: ConsultaPrediosRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Export (@busc=21) ──

/** Definición de una columna del XLS; `sourceIndex` es la celda del SP. */
export interface ConsultaPrediosExportColumn {
  key: string;
  label: string;
  sourceIndex: number;
}

export interface ConsultaPrediosExportResponse {
  /** Title read from the `anno` key; the frontend prepends its own prefix. */
  title: string;
  mostrarPisos: boolean;
  /** 16 columnas sin pisos, 33 con pisos. Incluye la numeración `N`. */
  columns: ConsultaPrediosExportColumn[];
  /** Una fila por registro; misma longitud que `columns`. */
  rows: string[][];
}
