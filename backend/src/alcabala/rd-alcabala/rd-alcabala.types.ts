// ── SP result interfaces ──

export interface SpMContribuyenteSearchRow {
  codigo: string;
  id_pers: string;
  id_docu: string;
  num_doc: string;
  nombres: string;
  paterno: string;
  materno: string;
  id_dist: string;
  tipourb: string;
  des_urb: string;
  tipovia: string;
  des_via: string;
  id_zona: string;
  id_urba: string;
  id_via: string;
  referencia: string;
  manzana: string;
  lote: string;
  sub_lote: string;
  numero: string;
  departam: string;
  nestado: string;
  operador: string;
  estacion: string;
  fech_ing: string;
  documento: string;
  codpos: string;
  DireFis: string;
  tipo_detalle: string;
  Gestion: string;
  ROW: number;
}

// ── Domain types for frontend ──

export interface ContribuyenteSearchItem {
  codigo: string;
  paterno: string;
  materno: string;
  nombres: string;
  numDoc: string;
  direccion: string;
  row: number;
}

export interface ContribuyenteSearchResult {
  success: boolean;
  data: ContribuyenteSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}
