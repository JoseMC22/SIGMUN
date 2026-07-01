// ── SP result interfaces ──

export interface SpMViaRow {
  cod_via: string;
  zona: string;
  urba: string;
  nombre_via: string;
  vcuadra: string;
  vlado: string;
  nestado: string;
  ROW: number;
}

/** Resultado de @busc=3 (selec_editar) */
export interface SpViaDetail {
  cod_via: string;
  id_urba: string;
  tipovia: string;
  vcuadra: string;
  id_zona: string;
  nombre_via: string;
  id_tipozona: string;
  nestado: string;
  lado_via: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

// ── Domain types ──

export interface ViasRow {
  cod_via: string;
  zona: string;
  urba: string;
  nombre_via: string;
  vcuadra: string;
  vlado: string;
  nestado: string;
}

export interface ViaDetail {
  cod_via: string;
  id_urba: string;
  tipovia: string;
  vcuadra: string;
  id_zona: string;
  nombre_via: string;
  id_tipozona: string;
  nestado: number;
  lado_via: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

/** @busc=9 — Arancel de vía */
export interface SpArancelRow {
  id_tbl: string;
  cod_via: string;
  anno: string;
  arancel: string;
  estado: string;
  ROW: number;
}

/** @busc=12 — Detalle de un arancel por id_tbl */
export interface SpArancelDetalle {
  id_tbl?: string;
  cod_via?: string;
  anno: string;
  arancel: number;
  nestado: number;
}

/** @busc=20 — Tipo de urbanización */
export interface SpTipoUrbanizacion {
  id: string;
  abrev: string;
  nombre: string;
}

/** @busc=26 — Tipo de vía (id_tipo, nombre) */
export interface SpTipoVia {
  id_tipo: string;
  nombre: string;
}

/** @busc=23 — Urbanización (id_urba, nombres) */
export interface SpUrbanizacion {
  id_urba: string;
  nombres: string;
}

/** Resultado de búsqueda de urbanizaciones (@busc=17 / @busc=18) */
export interface UrbanizacionRow {
  id_urba: string;
  tipourb: string;
  nombabr: string;
  nombre: string;
  estado: string;
}

/** @busc=7 — Zona (id_zona, nombres) */
export interface SpZona {
  id_zona: string;
  nombres: string;
}

/** @busc=21 — Detalle de urbanización para edición.
 * Columnas del SP: id_urba, tipourb, nombres, nestado, operador, estacion, fech_ing
 */
export interface SpUrbanizacionDetail {
  id_urba: string;
  tipourb: string;
  nombre: string;
  nestado: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

/** @busc=16 / @busc=22 — Respuesta del SP CRUD */
export interface SpUrbanizacionCRUDResult {
  mensaje?: string;
  success?: string;
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

export interface SuccessResponse {
  success: true;
  message: string;
}
