/**
 * Contratos del modulo cobranza/multa-tributaria.
 *
 * Origen legacy: multastributarias/index + formu + editar.
 * Todas las fechas que expone la API viajan como ISO `YYYY-MM-DD` para evitar
 * la ambiguedad `dd/mm/yyyy` bajo `us_english`.
 */

export interface ContribuyenteRow {
  codigo: string;
  nombres: string;
  paterno: string;
  materno: string;
  documento: string;
  numDoc: string;
  direccion: string;
}

export interface SearchContribuyenteResult {
  success: boolean;
  data: ContribuyenteRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export interface ContribuyenteHeader {
  codigo: string;
  nombres: string;
  numDoc: string;
  direccion: string;
}

export interface MultaRow {
  codigo: string;
  nroMulta: string;
  anio: string;
  fecMulta: string;
  motivo: string;
  monto: number;
  estadoMulta: string;
  estadoRecibo: string;
  obligacion: string;
  frac: string;
  idMulta: string;
}

export interface MultasResult {
  success: boolean;
  data: MultaRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export interface PredioRow {
  codigo: string;
  anno: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  anexos: string;
  direccion: string;
  areaTerreno: number;
  porcenPropiedad: number;
  totalAutoavaluo: number;
  tipo: string;
  flagPredio: string;
}

export interface TributoRow {
  tipo: string;
  tipoRec: string;
  id: string;
  concepto: string;
}

export interface GradualidadRow {
  idTable: number;
  concepto: string;
}

export interface UitRow {
  anno: string;
  valorUit: number;
  impMinimo: number;
  impMaximo: number;
  costoEmis: number;
  costoAdic: number;
}

export interface MultaDetalle {
  codigo: string;
  anno: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  uit: number;
  tributo: string;
  gradualidad: number;
  insoluto: number;
  derechoEmision: number;
  fechaEmision: string;
  fechaVencimiento: string;
  glosa: string;
}

export interface InfraccionRow {
  anno: string;
  tributoConcepto: string;
  gradualidadConcepto: string;
  periodos: string;
  fechaVencimiento: string;
  importe: number;
  emision: number;
  subTotal: number;
  glosa: string;
  fechaRegistro: string;
  tributo: string;
  subTributo: string;
  tipo: string;
}

export interface WriteResult {
  success: boolean;
  message?: string;
  error?: string;
  /** Solo en alta: ids generados por fila. */
  created?: Array<{ idMulta: number; idRecibo: number }>;
}
