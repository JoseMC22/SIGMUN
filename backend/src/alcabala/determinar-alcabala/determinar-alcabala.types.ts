// ── SP result interfaces ──

export interface SpMContribuyenteRow {
  codigo: string;
  paterno: string;
  materno: string;
  nombres: string;
  num_doc: string;
  DireFis: string;
  ROW: number;
}

export interface SpAlcabalasByContribuyenteRow {
  codigo_compra: string;
  id_alcabala: number;
  fecharegistro: string;
  monto_alcabala: number;
  codpred: string;
  aniopred: string;
  idrecibo: string;
  codigo_venta: string;
  estado: string;
}

// ── Domain types for frontend ──

export interface ContribuyenteItem {
  codigo: string;
  paterno: string;
  materno: string;
  nombres: string;
  numDoc: string;
  direccion: string;
  row: number;
}

export interface AlcabalaItem {
  idAlcabala: number;
  fechaRegistro: string;
  montoAlcabala: number;
  codPred: string;
  anioPred: string;
  codigoVenta: string;
  estado: string;
}

export interface ContribuyenteSearchResult {
  success: boolean;
  data: ContribuyenteItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export interface AlcabalasResult {
  success: boolean;
  data: AlcabalaItem[];
  error?: string;
}