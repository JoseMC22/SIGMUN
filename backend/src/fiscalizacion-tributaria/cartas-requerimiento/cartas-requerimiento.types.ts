// ── SP result interfaces ──

export interface SpCartasRequerimientoRow {
  codigo: string;
  contribuyente: string;
  direccionFiscal: string;
  ROW: number;
}

// SP result for mquery=12 (contribuyente lookup)
export interface SpContribuyenteRow {
  codigo: string;
  nombres: string;
  paterno: string;
  materno: string;
}

// SP result for mquery=4 (cartas de requerimiento)
export interface SpCartaRequerimientoRow {
  idCarta: number;
  nroCarta: string;
  anio: string;
  dia: string;
  mes: string;
  ye: string;
  detalle: string;
  ROW: number;
}

// ── Domain types ──

export interface CartasRequerimientoRow {
  codigo: string;
  contribuyente: string;
  direccionFiscal: string;
  row: number;
}

export interface ContribuyenteInfo {
  codigo: string;
  nombreCompleto: string;
}

export interface CartaRequerimientoItem {
  idCarta: number;
  nroCarta: string;
  anio: string;
  dia: string;
  mes: string;
  year: string;
  detalle: string;
  row: number;
}

// SP result for mquery=7 (T_ANIO lookup)
export interface SpTAAnioRow {
  [key: string]: any;
}

// SP result for mquery=7 (MOTIVO lookup)
export interface SpMotivoRow {
  [key: string]: any;
}

// SP result for mquery=10 (CARTA_REQ predios by codigo + anno)
export interface SpCartaReqPredioRow {
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  id_urba: string;
  id_via: string;
  num_manz: string;
  num_lote: string;
  sub_lote: string;
  num_call: string;
  num_depa: string;
  referenc: string;
  dirPredio: string;
  confirmado: number;
  nueva_dir: number;
}

// SP result for mquery=6 (single carta by idCarta)
export interface SpCartaByIdRow {
  idCarta: number;
  nroCarta: string;
  anio: string;
  codigo: string;
  nombres: string;
  paterno: string;
  materno: string;
  fecEmision: string;
  fi_dia: number;
  fi_mes: number;
  fi_anio: number;
  horaInspec: string;
  idMotivo: number;
  anioDesde: number;
  anio1: number;
}

// SP result for mquery=6 (FISCALIZADORES)
export interface SpFiscalizadorRow {
  codigo: string;
  fiscalizador: string;
}

// ── Domain types (new endpoints) ──

export interface TAAnioOption {
  value: string;
  label: string;
}

export interface MotivoOption {
  value: string;
  label: string;
}

export interface CartaReqPredio {
  codPred: string;
  anexo: string;
  subAnexo: string;
  dirPredio: string;
  confirmado: number;
  nuevaDir: number;
}

export interface Fiscalizador {
  codigo: string;
  nombre: string;
  seleccionado?: number;
}

export interface CartaById {
  idCarta: number;
  nroCarta: string;
  anio: string;
  codigo: string;
  contribuyente: string;
  fechaEmision: string;
  horaInspec: string;
  idMotivo: string;
  anioDesde: string;
  anno: string;
}

// ── Response envelopes ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
