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

export interface SpDetalleAlcabalaRow {
  codigo_compra: string;
  anio: string;
  nombres: string;
  documento: string;
  num_doc: string;
  direcc_fiscal: string;
  distrito: string;
  provincia: string;
  departamento: string;
  codigo_venta: string;
  nombres1: string;
  documento1: string;
  num_doc1: string;
  direcc_fiscal1: string;
  distrito1: string;
  provincia1: string;
  departamento1: string;
  codpred: string;
  aniopred: string;
  fecha_contrato: string;
  transferencia: string;
  observacion: string;
  contrato: string;
  monto_alcabala: number;
  autoavaluo: number;
  direccion_predio: string;
  monto_inafecto: number;
  monto_afecto: number;
  anexo: string;
  sub_anexo: string;
  flag_check: string;
  observacion_flag: string;
  nombre: string;
  direccion: string;
  dni: string;
  tipodoc: string;
  usuario: string;
  estacion: string;
  fecha_ing: string;
  flag_inafecto: string;
  tipo_pred: string;
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

export interface DetalleAlcabalaItem {
  codigoCompra: string;
  anio: string;
  nombres: string;
  documento: string;
  numDoc: string;
  direccFiscal: string;
  distrito: string;
  provincia: string;
  departamento: string;
  codigoVenta: string;
  nombres1: string;
  documento1: string;
  numDoc1: string;
  direccFiscal1: string;
  distrito1: string;
  provincia1: string;
  departamento1: string;
  codPred: string;
  anioPred: string;
  fechaContrato: string;
  transferencia: string;
  observacion: string;
  contrato: string;
  montoAlcabala: number;
  autoavaluo: number;
  direccionPredio: string;
  montoInafecto: number;
  montoAfecto: number;
  anexo: string;
  subAnexo: string;
  flagCheck: string;
  observacionFlag: string;
  nombre: string;
  direccion: string;
  dni: string;
  tipodoc: string;
  usuario: string;
  estacion: string;
  fechaIng: string;
  flagInafecto: string;
  tipoPred: string;
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

export interface DetalleAlcabalaResult {
  success: boolean;
  data: DetalleAlcabalaItem | null;
  error?: string;
}

export interface CrearAlcabalaResult {
  success: boolean;
  idAlcabala?: number;
  error?: string;
}