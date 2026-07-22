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

export interface PendienteAlcabalaItem {
  // Campos de dominio (para la UI)
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

  // Campos crudos del SP (para @dataxml en generarRD)
  tipo: string;
  tipo_docu: string;
  num_docu: string;
  tipo_rec: string;
  imp_insol: number;
  costo_emis: number;
  fact_reaj: number;
  imp_reaj: number;
  fact_mora: number;
  imp_mora: number;
  fec_venc: string;
  num_ingr: string;
  operador: string;
  estacion: string;
  fech_ing: string;
  fec_pago: string;
  des_tipo: string;
  cod_pred: string;
  sub_anexo: string;
}

export interface PendienteAlcabalaResult {
  success: boolean;
  data: PendienteAlcabalaItem[];
  total: number;
  error?: string;
}

export interface GenerarRdResult {
  success: boolean;
  message?: string;
  data?: any[];
  error?: string;
}

// SP result: Rentas.sp_Imprime_alcabala @buscar=1
export interface SpImprimeAlcabalaRow {
  id_valor: string;
  num_val: string;
  ano_val: string;
  tributo: string;
  numerOP: string;
  fec_val: string;
  fecvaln: string;
  fec_valn: string;
  codigo: string;
  nombre: string;
  num_doc: string;
  dirfiscal: string;
  idrecibo: number;
  anio_fiscal: string;
  valortotal: number;
  monto_afecto: number;
  monto_inafecto: number;
  tasa: string;
  monto_alcabala: number;
  mora: number;
  total: number;
  codpred: string;
  direccion_predio: string;
  fechacontrato: string;
  fono: string;
}
