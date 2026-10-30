/**
 * Contratos del modulo cobranza/certificado-no-adeudo.
 *
 * Origen legacy: certificado/index (busqueda de contribuyentes).
 * La grilla reutiliza el mismo contrato de contribuyentes que
 * cobranza/multa-tributaria: Rentas.sp_Mcontribuyente @busc=6 (conteo) +
 * @busc=5 (pagina).
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

export interface CollectionResult<T> {
  success: true;
  data: T[];
  total: number;
}

export interface ItemResult<T> {
  success: true;
  data: T;
}

export interface ErrorResult {
  success: false;
  error: string;
}

export type CollectionResponse<T> = CollectionResult<T> | ErrorResult;
export type ItemResponse<T> = ItemResult<T> | ErrorResult;

export interface CertificadoRow {
  idTbl: string;
  idRecibo: string;
  codigo: string;
  certNro: string;
  certAnio: string;
  tipoDeuda: string;
  tipoDeudaDescripcion: string;
  tipoPeriodo: string;
  tipoPeriodoDescripcion: string;
  observacion: string;
  cantImpresion: string;
  impresion: string;
  fechaImpresion: string;
  estado: string;
  estImprime: string;
  numCertif: string;
}

export interface CertificadoDetalle {
  idTbl: string;
  idRecibo: string;
  codigo: string;
  certNro: string;
  certAnio: string;
  tipoDeuda: string;
  tipoPeriodo: string;
  observacion: string;
  cantImpresion: string;
  impresion: string;
  fechaImpresion: string;
  estado: string;
  anioDeuda: string;
  numCertif: string;
}

export interface ContribuyenteHeader {
  codigo: string;
  nombres: string;
  numDoc: string;
  direccion: string;
}

export interface TipoDeudaRow {
  tipo: string;
  detalle: string;
}

export interface TipoPeriodoRow {
  idTbl: number;
  detalle: string;
}

export interface DetalleRow {
  codigo: string;
  anio: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  anexos: string;
  direccion: string;
  detalles: string;
  tipo: string;
  areaTerreno: number;
  porcenPropiedad: number;
  totalAutoavaluo: number;
  chekeado: string;
}

export interface CertificadoGeneradoResult {
  success: true;
  message: string;
  estado: 'REGISTRADO';
}

export interface DeudaPendienteResult {
  success: false;
  code: 'DEUDA';
  message: string;
  montoDeuda: number;
}

export interface DeudaDetectadaPorSpResult {
  success: false;
  code: 'DEUDA';
  message: string;
}

export type GenerarCertificadoResult =
  | CertificadoGeneradoResult
  | DeudaPendienteResult
  | DeudaDetectadaPorSpResult
  | ErrorResult;
