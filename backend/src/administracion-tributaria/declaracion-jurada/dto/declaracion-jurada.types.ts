// ── SP result interfaces ──

export interface SpMContribuyenteRow {
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
  nestado: number;
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

// ── SP result for busc=14 (Direccion/Predio mode) ──

export interface SpMContribuyenteDireccionRow {
  codigo: string;
  nombre: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  direcion: string;
  ROW: number;
}

// ── SP result for busc=18 (Placa mode) ──

export interface SpMContribuyentePlacaRow {
  ROW: number;
  codigo: string;
  nomcontrib: string;
  nro_documento: string;
  DireFis: string;
  placa: string;
  ord: string;
}

// ── Domain types ──

export interface ContribuyenteListItem {
  codigo: string;
  tipoDetalle: string;
  gestion: string;
  nombresCompletos: string;
  numDoc: string;
  direFis: string;
  row: number;
}

export interface ContribuyenteDireccionItem {
  codigo: string;
  nombre: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  direccion: string;
  row: number;
}

export interface ContribuyentePlacaItem {
  codigo: string;
  nombresCompletos: string;
  numDoc: string;
  direFis: string;
  placa: string;
  row: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Combo option types (para el modal de registro) ──

/** Tipo de documento — id_doc "01/8" => value="01", maxDigits=8 */
export interface TipoDocumentoOption {
  value: string;
  maxDigits: number;
  label: string;
}

export interface TipoContribuyenteOption {
  value: string;
  label: string;
}

export interface SubTipoContribuyenteOption {
  value: string;
  label: string;
}

export interface DistritoOption {
  value: string;
  label: string;
}

// ── SP_vw_Mvias types (búsqueda de vías) ──

export interface SpMviaRow {
  cod_via: string;
  id_zona: string;
  nom_zona: string;
  id_urba: string;
  nombabr: string;
  nombres: string;
  tipoabr: string;
  nombre_via: string;
  arancel: string;
  vcuadra: string;
  lado_via: string;
  ROW: number;
}

export interface MviaItem {
  codVia: string;
  idZona: string;
  zona: string;
  idUrba: string;
  urbanizacion: string;
  via: string;
  nCuadra: string;
  nLado: string;
  arancel: string;
}

// ── SP result for busc=26 (Buscar contribuyente por nº documento) ──

export interface SpMBuscarContribuyenteRow {
  nombres: string;
  paterno: string;
  materno: string;
  codigo: string;
  correo_e: string;
  num_doc: string;
}

export interface BuscarContribuyenteResult {
  encontrado: boolean;
  nombres: string;
  paterno: string;
  materno: string;
  codigo: string;
  correo_e: string;
  num_doc: string;
}

// ── SP result for busc=25 (Validar si debe agregar representante) ──

export interface ValidarRepresentanteResult {
  debeAgregarRepresentante: boolean;
}

// ── SP result for busc=1 (Guardar contribuyente) ──

export interface GuardarContribuyenteResult {
  codigo: string;
  mensaje: string;
}

// ── Guardar representante (sp_Mrepresentante + sp_Mcontribuyente) ──

export interface GuardarRepresentanteResult {
  id: string;
}

// ── Vincular representante con contribuyente (sp_Mrepresentante @busc=13) ──

export interface VincularRepresentanteResult {
  success: boolean;
}

// ── SP result for busc=3 (Eliminar contribuyente) ──

export interface EliminarContribuyenteResult {
  success: boolean;
  mensaje: string;
}

// ── SP Rentas.sp_rentasmain @buscar=3 (Modal Representantes — Datos Contribuyente) ──

export interface ContribuyenteResumenResult {
  codigo: string;
  nombres: string;
  numDoc: string;
  direccion: string;
}

// ── SP Rentas.sp_Mrepresentante @busc=4 (Modal Representantes — grid) ──
// Mapeo posicional del legacy:
// 0 lid, 1 codigo, 4+5+6 nombres, 25 documento (tipo doc), 31 descripcion (tipo relacion), 32 direccion

export interface RepresentanteGridItem {
  cod: string;
  codigo: string;
  tipoRelacion: string;
  nombres: string;
  tipoDocumento: string;
  nroDocumento: string;
  direccion: string;
}

export interface ObtenerRepresentantesResult {
  datos: ContribuyenteResumenResult;
  representantes: RepresentanteGridItem[];
}

// ── SP Rentas.sp_Mrepresentante @busc=6 (Editar representante — carga el form) ──
// Mapeo posicional del legacy PHP:
// 0 id, 1 codigo, 2 id_docu, 3 num_doc, 4 nombres, 5 paterno, 6 materno,
// 7 id_dist, 8 tipourb, 9 des_urb, 10 tipovia, 11 des_via, 12 id_zona,
// 13 id_urba, 14 id_via, 15 referencia, 16 manzana, 17 lote, 18 sub_lote,
// 19 numero, 20 departam, 21 nestado, 22 operador, 23 estacion,
// 27 nomzona, 28 nomurba, 30 nomvia, 31 id_tipo_relacion,
// 33 letra1, 34 numero2, 35 letra2, 36 piso, 37 numero_interno,
// 38 letra_interno, 39 tipo_interior_id, 40 tipo_edificio_id,
// 41 tipo_ingreso_id, 42 tipo_agrupamiento_id,
// 43 nombre_edificio, 44 nombre_ingreso, 45 nombre_agrupamiento

export interface EditarRepresentanteResult {
  id: string;
  codigo: string;
  idDocu: string;
  numDoc: string;
  nombres: string;
  paterno: string;
  materno: string;
  idDist: string;
  tipourb: string;
  desUrb: string;
  tipovia: string;
  desVia: string;
  idZona: string;
  idUrba: string;
  idVia: string;
  referencia: string;
  manzana: string;
  lote: string;
  subLote: string;
  numero: string;
  departam: string;
  nestado: string;
  operador: string;
  estacion: string;
  nomZona: string;
  nomUrba: string;
  nomVia: string;
  idTipoRelacion: string;
  letra1: string;
  numero2: string;
  letra2: string;
  piso: string;
  numeroInterno: string;
  letraInterno: string;
  tipoInteriorId: string;
  tipoEdificacionId: string;
  tipoIngresoId: string;
  tipoAgrupamientoId: string;
  nombreEdificio: string;
  nombreIngreso: string;
  nombreAgrupamiento: string;
}

// ── SP Rentas.sp_Mrepresentante @busc=7 (Eliminar representante) ──

export interface EliminarRepresentanteResult {
  success: boolean;
  mensaje: string;
}

// ── SP result for busc=4 (Obtener contribuyente por código — edición) ──
// Mapeo posicional igual al proyecto legacy. Columnas del SP:
// 0 codigo, 1 id_pers, 2 id_docu, 3 num_doc, 4 nombres, 5 paterno,
// 6 materno, 7 id_dist, 8 tipourb, 9 des_urb, 10 tipovia, 11 des_via,
// 12 id_zona, 13 id_urba, 14 id_via, 15 referencia, 16 manzana, 17 lote,
// 18 sub_lote, 19 numero, 20 departam, 21 nestado, 22 operador, 23 estacion,
// 24 fech_ing, 31 id_tipocontri, 32 id_subtipocontri, ...
export interface EditarContribuyenteResult {
  codigo: string;
  idPers: string;
  idDocu: string;
  numDoc: string;
  nombres: string;
  paterno: string;
  materno: string;
  idDist: string;
  tipourb: string;
  desUrb: string;
  tipovia: string;
  desVia: string;
  idZona: string;
  idUrba: string;
  idVia: string;
  referencia: string;
  manzana: string;
  lote: string;
  subLote: string;
  numero: string;
  departam: string;
  nestado: string;
  operador: string;
  estacion: string;
  fechIng: string;
  nomZona: string;
  nomUrba: string;
  nomVia: string;
  tipoContri: string;
  subTipoContri: string;
  letra1: string;
  numero2: string;
  letra2: string;
  tipoInteriorId: string;
  tipoAgrupamientoId: string;
  tipoIngresoId: string;
  tipoEdificacionId: string;
  nombreEdificio: string;
  nombreIngreso: string;
  nombreAgrupamiento: string;
  piso: string;
  letraInterno: string;
  numeroInterno: string;
  correo: string;
  partidaDefuncion: string;
  fechaDefuncion: string;
  telefono1: string;
  anexo1: string;
  telefono2: string;
  anexo2: string;
  flagNotificar: string;
}

// ── SP dbo.store_caja_framework @msquery=5|6|15|20|21 ─────────────
// Filtros del modal Estado de Cuenta, por contribuyente.

export interface EstadoCuentaPredioOption {
  /** cod_pred-anexo1 — código compuesto enviado al backend al consultar deuda */
  value: string;
  /** cod_pred-anexo1-direccion — texto mostrado en el groupbox */
  label: string;
}

export interface EstadoCuentaFiltrosResult {
  /** @msquery=5 → rango min/max, p.ej. ["01".."12"] */
  periodos: string[];
  /** @msquery=6 → rango min/max en orden descendente, p.ej. ["2026".."2008"] */
  anios: string[];
  /** @msquery=15 → predios del contribuyente */
  predios: EstadoCuentaPredioOption[];
  /** @msquery=20 → placas (cod_pred) */
  vehiculos: string[];
  /** @msquery=21 → fraccionamientos (num_docu) */
  fraccionamientos: string[];
}

// ── SP Caja.sp_EstCta_Rentas family ───────────────────────────────
// Recibos grid ("Mostrar" button) of the Estado de Cuenta modal.

/** Radio "Estado" values understood by the SPs (@estado). */
export type EstadoCuentaEstadoFiltro = '0' | '1' | '3' | '%';

export interface EstadoCuentaReciboRow {
  idrecibo: string;
  codigo: string;
  tipo: string;
  anno: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  /** "anexo-subAnexo", only for Arbitrios rows (tipo 11.00). */
  detAnexo: string;
  tipoRec: string;
  periodo: string;
  impInsol: number;
  costoEmision: number;
  impReaj: number;
  interes: number;
  desTipo: string;
  desCabecera: string;
  ubica: string;
  benefic: number;
  total: number;
  totPagado: number;
}

// ── Generar Liquidación DJ ───────────────────────────────

export interface GenerarLiquidacionDJResult {
  success: boolean;
  idliqui?: string;
  nliqui?: string;
  error?: string;
}

// ── Reporte Liquidación (pa_liquidacion @msquery=9) ───────

export interface LiquidacionReporteDetalle {
  anno: string;
  tipo_general: string;
  monto: number;
}

export interface LiquidacionReporteData {
  nombre: string;
  domicilio: string;
  codigo: string;
  nliqui: string;
  fecha: string;
  usuario: string;
  detalles: LiquidacionReporteDetalle[];
  totalNeto: number;
}
