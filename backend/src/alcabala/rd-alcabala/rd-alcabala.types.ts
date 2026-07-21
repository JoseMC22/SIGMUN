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

// SP result: Caja.sp_EstCta_Rentasalcabala_proyectado
export interface SpPendienteAlcabalaRow {
  idrecibo: string;
  codigo: string;
  tipo: string;
  anno: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  tipo_docu: string;
  num_docu: string;
  tipo_rec: string;
  periodo: string;
  imp_insol: number;
  costo_emis: number;
  fact_reaj: number;
  imp_reaj: number;
  fact_mora: number;
  mora: number;
  observacion: string;
  estado: string;
  ubica: string;
  fec_venc: string;
  num_ingr: string;
  operador: string;
  estacion: string;
  fech_ing: string;
  fec_pago: string;
  des_tipo: string;
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

export interface PendienteAlcabalaItem {
  tributo: string;
  anio: string;
  predio: string;
  anexo: string;
  subanexo: string;
  periodo: string;
  impInsol: number;
  impReaj: number;
  factorMora: number;
  interes: number;
  costoEmis: number;
  total: number;
  estado: string;
  observacion: string;
  idrecibo: string;
  codigo: string;
}

export interface PendienteAlcabalaResult {
  success: boolean;
  data: PendienteAlcabalaItem[];
  total: number;
  error?: string;
}
