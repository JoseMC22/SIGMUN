export interface SpContribuyenteSearchRow {
  codigo: string;
  num_doc: string;
  nombres: string;
  paterno: string;
  materno: string;
  documento: string;
  codpos: string;
  DireFis: string;
  tipo_detalle: string;
  Gestion: string;
  nestado: string;
  [key: string]: any;
}

export interface SpContribuyenteTotal {
  total: number;
}

export interface SpContribuyenteDetail {
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
  distrito: string;
  zona: string;
  nombabr: string;
  nombre_urba: string;
  nombre_via: string;
  id_tipocontri: string;
  id_subtipocontri: string;
  id_motivo_actualizacion: string;
  telefono1: string;
  anexo1: string;
  telefono2: string;
  anexo2: string;
  letra1: string;
  numero2: string;
  letra2: string;
  tipo_interior_id: string;
  tipo_agrupamiento_id: string;
  tipo_ingreso_id: string;
  tipo_edificacion_id: string;
  nombre_edificio: string;
  nombre_ingreso: string;
  nombre_agrupamiento: string;
  piso: string;
  letra_interno: string;
  numero_interno: string;
  correo_e: string;
  partida_defuncion: string;
  fecha_defuncion: string;
  flag_notificar: string;
}

export interface ContribuyenteRow {
  codigo: string;
  numDoc: string;
  nombres: string;
  paterno: string;
  materno: string;
  tipoDocumento: string;
  distrito: string;
  direccionFiscal: string;
  tipoDetalle: string;
  gestion: string;
  estado: string;
  codPred?: string;
  anexo?: string;
  subAnexo?: string;
  placa?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface TipoContribuyente {
  id_tipocontri: string;
  tipo_detalle: string;
}

export interface SubtipoContribuyente {
  id_subtipocontri: string;
  subtipo_detalle: string;
}

export interface MotivoActualizacion {
  motivo_actualizacion_id: string;
  descripcion: string;
}

export interface TipoInterior {
  tipo_interior_id: string;
  descripcion: string;
}

export interface TipoEdificacion {
  tipo_edificacion_id: string;
  descripcion: string;
}

export interface TipoIngreso {
  tipo_ingreso_id: string;
  descripcion: string;
}

export interface TipoAgrupamiento {
  tipo_agrupamiento_id: string;
  descripcion: string;
}

export interface DocumentoOption {
  id: string;
  nombre: string;
}

export interface DistritoOption {
  id_post: string;
  codpos: string;
}

export interface TipoViaOption {
  id_tipo: string;
  nombre: string;
}

export interface SolicitudRow {
  id_solicitud: string;
  anio: string;
  fecha: string;
  placa: string;
}

export interface SolicitudDetail {
  id_solicitud: string;
  anio: string;
  codigo: string;
  nombre: string;
  tipo_doc: string;
  num_doc: string;
  tipo_persona: string;
  tipo_contri: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  telefono1: string;
  telefono2: string;
  celular: string;
  correo: string;
  petitorio: string;
  hecho: string;
  derecho: string;
  num_recibo: string;
  fecha_recibo: string;
}

export interface DjRow {
  id_dj: string;
  num_decla: string;
  anio_dj: string;
  fecha_decla: string;
  imp_anual: string;
  id_solicitud: string;
}

export interface RepresentanteRow {
  id_representante: string;
  codigo_contribuyente: string;
  nombres: string;
  paterno: string;
  materno: string;
  id_documento: string;
  num_documento: string;
  tipo_relacion_id: string;
  tipo_relacion_nombre: string;
  // Domicilio
  id_dist: string;
  id_via: string;
  id_zona: string;
  id_urba: string;
  manzana: string;
  lote: string;
  sub_lote: string;
  numero: string;
  departam: string;
  referencia: string;
  piso: string;
  letra1: string;
  numero2: string;
  letra2: string;
  tipo_interior_id: string;
  numero_interno: string;
  letra_interno: string;
  tipo_edificacion_id: string;
  nombre_edificio: string;
  tipo_ingreso_id: string;
  nombre_ingreso: string;
  tipo_agrupamiento_id: string;
  nombre_agrupamiento: string;
  nestado: string;
}

export interface TipoRelacion {
  tipo_relacion_id: string;
  descripcion: string;
}

export interface VerificarRepresentanteResponse {
  exists: boolean;
}
