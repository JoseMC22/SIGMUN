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
