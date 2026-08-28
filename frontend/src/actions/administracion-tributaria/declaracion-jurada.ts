"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = 'SIGMUN_AUTH';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers['Cookie'] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ─── Search ────────────────────────────────────────────────

export interface SearchContribuyenteFilters {
  tipoBusqueda?: string;
  codigo?: string;
  nombres?: string;
  paterno?: string;
  materno?: string;
  razon?: string;
  numDoc?: string;
  codPred?: string;
  // ── Address/Predio fields (used when tipoBusqueda='P') ──
  anno?: string;
  idVia?: string;
  nro?: string;
  dpto?: string;
  mza?: string;
  lte?: string;
  subLte?: string;
  codUrb?: string;
  checkfrac?: number;
  // ── Placa field (used when tipoBusqueda='V') ──
  placa?: string;
}

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

export type ContribuyenteAnyItem = ContribuyenteListItem | ContribuyenteDireccionItem | ContribuyentePlacaItem;

export interface PaginatedResponse {
  data: ContribuyenteAnyItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchContribuyenteAction(
  filters: SearchContribuyenteFilters,
  page: number = 1,
  pageSize: number = 10,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/declaracion-jurada/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Combos (modal de registro) ────────────────────────────

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

export async function getTiposDocumentoAction(): Promise<
  { success: true; data: TipoDocumentoOption[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/combos/tipos-documento');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getTiposContribuyenteAction(): Promise<
  { success: true; data: TipoContribuyenteOption[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/combos/tipos-contribuyente');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getSubTiposContribuyenteAction(
  idTipoContri: string,
): Promise<{ success: true; data: SubTipoContribuyenteOption[] } | { success: false; error: string }> {
  try {
    const response = await authFetch(
      `/declaracion-jurada/combos/subtipos-contribuyente?idTipoContri=${encodeURIComponent(idTipoContri)}`,
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getDistritosAction(): Promise<
  { success: true; data: DistritoOption[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/combos/distritos');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Combos Datos Domicilio Fiscal ─────────────────────────

async function getDomicilioCombo(path: string): Promise<
  { success: true; data: { value: string; label: string }[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch(path);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getTiposInteriorAction() {
  return getDomicilioCombo('/declaracion-jurada/combos/tipos-interior');
}

export async function getTiposEdificacionAction() {
  return getDomicilioCombo('/declaracion-jurada/combos/tipos-edificacion');
}

export async function getTiposIngresoAction() {
  return getDomicilioCombo('/declaracion-jurada/combos/tipos-ingreso');
}

export async function getTiposAgrupamientoAction() {
  return getDomicilioCombo('/declaracion-jurada/combos/tipos-agrupamiento');
}

// ─── Búsqueda de vías (modal Domicilio Fiscal) ──────────────

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

export interface MviaPaginatedResponse {
  data: MviaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchViasAction(
  nombreVia: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ success: true } & MviaPaginatedResponse | { success: false; error: string }> {
  try {
    const params = new URLSearchParams({
      nombre_via: nombreVia,
      page: String(page),
      pageSize: String(pageSize),
    });
    const response = await authFetch(`/declaracion-jurada/search-vias?${params}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Buscar contribuyente por nº documento (modal Representante) ──

export interface BuscarContribuyenteResult {
  encontrado: boolean;
  nombres: string;
  paterno: string;
  materno: string;
  codigo: string;
  correo_e: string;
  num_doc: string;
}

export async function buscarContribuyentePorDocAction(
  numDoc: string,
): Promise<
  { success: true; data: BuscarContribuyenteResult } | { success: false; error: string }
> {
  try {
    const params = new URLSearchParams({ num_doc: numDoc });
    const response = await authFetch(`/declaracion-jurada/buscar-contribuyente?${params}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Validar si requiere representante (botón Grabar) ──

export interface ValidarRepresentanteResult {
  debeAgregarRepresentante: boolean;
}

export async function validarRepresentanteAction(
  numDoc: string,
): Promise<
  { success: true; data: ValidarRepresentanteResult } | { success: false; error: string }
> {
  try {
    const params = new URLSearchParams({ num_doc: numDoc });
    const response = await authFetch(`/declaracion-jurada/validar-representante?${params}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Validar representante por código (modal Representante) ──

export async function validarRepresentantePorCodigoAction(
  codigo: string,
): Promise<
  { success: true; data: ValidarRepresentanteResult } | { success: false; error: string }
> {
  try {
    const params = new URLSearchParams({ codigo });
    const response = await authFetch(`/declaracion-jurada/validar-representante-por-codigo?${params}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Guardar contribuyente (botón Grabar) ──

export interface GuardarContribuyentePayload {
  codigo?: string;
  id_docu?: string;
  num_doc?: string;
  nombres?: string;
  paterno?: string;
  materno?: string;
  id_dist?: string;
  tipourb?: string;
  des_urb?: string;
  tipovia?: string;
  des_via?: string;
  id_zona?: string;
  id_urba?: string;
  id_via?: string;
  referencia?: string;
  manzana?: string;
  lote?: string;
  sub_lote?: string;
  numero?: string;
  departam?: string;
  nestado?: string;
  motivo?: string;
  operador?: string;
  estacion?: string;
  id_tipocontri?: string;
  id_subtipocontri?: string;
  tipo_interior_id?: string;
  tipo_edificio_id?: string;
  tipo_ingreso_id?: string;
  tipo_agrupamiento_id?: string;
  letra1?: string;
  letra2?: string;
  numero2?: string;
  nombre_ingreso?: string;
  nombre_agrupamiento?: string;
  nombre_edificio?: string;
  piso?: string;
  numero_interno?: string;
  letra_interno?: string;
  correo_e?: string;
  partida_defuncion?: string;
  fecha_defuncion?: string;
  telefono1?: string;
  anexo1?: string;
  telefono2?: string;
  anexo2?: string;
  flag_notificar?: string;
  idperfil?: string;
}

export interface GuardarContribuyenteResultData {
  codigo: string;
  mensaje: string;
}

export async function guardarContribuyenteAction(
  payload: GuardarContribuyentePayload,
): Promise<
  { success: true; data: GuardarContribuyenteResultData } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/guardar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Guardar representante (modal Representante) ──
// Replica la lógica legacy: sp_Mrepresentante + sp_Mcontribuyente (tipo 01/01)
// cuando cod_repre viene vacío. Devuelve el id del representante creado/actualizado.

export interface GuardarRepresentantePayload {
  tip?: string; // '1' = crear, '2' = actualizar
  codigo?: string; // código del contribuyente principal (vacío en alta nueva)
  id?: string; // id del representante (vacío en creación)
  cod_repre?: string; // código del contribuyente que ya es representante
  id_docu?: string;
  num_doc?: string;
  nombres?: string;
  paterno?: string;
  materno?: string;
  id_dist?: string;
  tipourb?: string;
  des_urb?: string;
  tipovia?: string;
  des_via?: string;
  id_zona?: string;
  id_urba?: string;
  id_via?: string;
  referencia?: string;
  manzana?: string;
  lote?: string;
  sub_lote?: string;
  numero?: string;
  departam?: string;
  nestado?: string;
  operador?: string;
  estacion?: string;
  id_tipo_relacion?: string;
  letra1?: string;
  numero2?: string;
  letra2?: string;
  piso?: string;
  numero_interno?: string;
  letra_interno?: string;
  tipo_interior_id?: string;
  tipo_edificio_id?: string;
  tipo_ingreso_id?: string;
  tipo_agrupamiento_id?: string;
  nombre_edificio?: string;
  nombre_ingreso?: string;
  nombre_agrupamiento?: string;
}

export interface GuardarRepresentanteResultData {
  id: string;
}

export async function guardarRepresentanteAction(
  payload: GuardarRepresentantePayload,
): Promise<
  { success: true; data: GuardarRepresentanteResultData } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/guardar-representante', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Vincular representante con contribuyente recién creado ──
// Llama a sp_Mrepresentante @busc=13 con @codigo (contribuyente) + @id (representante).

export interface VincularRepresentantePayload {
  codigo: string;
  id: string;
}

export async function vincularRepresentanteAction(
  payload: VincularRepresentantePayload,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const response = await authFetch('/declaracion-jurada/vincular-representante', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Eliminar contribuyente ──
// Llama a Rentas.sp_Mcontribuyente @busc=3 con @codigo, @motivo, @operador.

export interface EliminarContribuyentePayload {
  codigo: string;
  motivo?: string;
  operador?: string;
}

export interface EliminarContribuyenteResultData {
  success: boolean;
  mensaje: string;
}

export async function eliminarContribuyenteAction(
  payload: EliminarContribuyentePayload,
): Promise<
  { success: true; data: EliminarContribuyenteResultData } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/eliminar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Obtener contribuyente por código (modal Editar Contribuyente) ──
// Llama a Rentas.sp_Mcontribuyente @busc=4, @codigo. Devuelve los datos para
// precargar los tabs del modal.

export interface EditarContribuyenteData {
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

export async function obtenerContribuyentePorCodigoAction(
  codigo: string,
): Promise<{ success: true; data: EditarContribuyenteData } | { success: false; error: string }> {
  try {
    const params = new URLSearchParams({ codigo });
    const response = await authFetch(`/declaracion-jurada/buscar-por-codigo?${params}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Obtener datos + representantes (modal Representantes) ──
// Datos: exec Rentas.sp_rentasmain @buscar=3, @codigo.
// Grid: exec Rentas.sp_Mrepresentante @busc=4, @codigo.

export interface ContribuyenteResumenData {
  codigo: string;
  nombres: string;
  numDoc: string;
  direccion: string;
}

export interface RepresentanteGridData {
  cod: string;
  codigo: string;
  tipoRelacion: string;
  nombres: string;
  tipoDocumento: string;
  nroDocumento: string;
  direccion: string;
}

export interface ObtenerRepresentantesData {
  datos: ContribuyenteResumenData;
  representantes: RepresentanteGridData[];
}

export async function obtenerRepresentantesAction(
  codigo: string,
): Promise<{ success: true; data: ObtenerRepresentantesData } | { success: false; error: string }> {
  try {
    const params = new URLSearchParams({ codigo });
    const response = await authFetch(`/declaracion-jurada/representantes?${params}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Obtener representante por id (modal Editar Representante) ──
// Llama a Rentas.sp_Mrepresentante @busc=6, @id. Devuelve los datos para
// precargar el formulario del representante.

export interface EditarRepresentanteData {
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

export async function obtenerRepresentantePorIdAction(
  id: string,
): Promise<{ success: true; data: EditarRepresentanteData } | { success: false; error: string }> {
  try {
    const params = new URLSearchParams({ id });
    const response = await authFetch(`/declaracion-jurada/representante-por-id?${params}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Eliminar representante ──
// Llama a Rentas.sp_Mrepresentante @busc=7 con @codigo (contribuyente) + @id (representante).

export interface EliminarRepresentantePayload {
  codigo: string;
  id: string;
}

export interface EliminarRepresentanteResultData {
  success: boolean;
  mensaje: string;
}

export async function eliminarRepresentanteAction(
  payload: EliminarRepresentantePayload,
): Promise<
  { success: true; data: EliminarRepresentanteResultData } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/eliminar-representante', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Estado de Cuenta (modal): filtros por contribuyente ──
// store_caja_framework @msquery=5|6|15|20|21, @codigo

export interface EstadoCuentaPredioOption {
  /** cod_pred-anexo1 — código compuesto enviado al backend al consultar deuda */
  value: string;
  /** cod_pred-anexo1-direccion — texto mostrado en el groupbox */
  label: string;
}

export interface EstadoCuentaFiltrosData {
  periodos: string[];
  anios: string[];
  predios: EstadoCuentaPredioOption[];
  vehiculos: string[];
  fraccionamientos: string[];
}

export async function getEstadoCuentaFiltrosAction(
  codigo: string,
): Promise<
  { success: true; data: EstadoCuentaFiltrosData } | { success: false; error: string }
> {
  try {
    const params = new URLSearchParams({ codigo });
    const response = await authFetch(`/declaracion-jurada/estado-cuenta/filtros?${params}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Estado de Cuenta (modal): recibos grid ("Mostrar") ───
// Caja.sp_EstCta_Rentas family via POST /declaracion-jurada/estado-cuenta/recibos

export interface EstadoCuentaRecibosPayload {
  codigo: string;
  periodos: string[];
  anios: string[];
  conceptos: string[];
  arbitrios: string[];
  predios: string[];
  vehiculos: string[];
  fraccionamientos: string[];
  /** '0' pendiente | '1' cancelado | '3' por compensar | '%' todo */
  estado: '0' | '1' | '3' | '%';
  criterio?: number;
  soloCoactivo?: boolean;
}

export interface EstadoCuentaReciboRow {
  idrecibo: string;
  codigo: string;
  tipo: string;
  anno: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
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

export async function getEstadoCuentaRecibosAction(
  payload: EstadoCuentaRecibosPayload,
): Promise<
  { success: true; data: EstadoCuentaReciboRow[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/estado-cuenta/recibos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false as const,
        error: errorData.error ?? errorData.message ?? `Error ${response.status}`,
      };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Liquidación types ────────────────────────────────────

export type LiquidacionReciboPayload = {
  idrecibo: string;
  codigo: string;
  anno: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  tipo: string;
  tipo_rec: string;
  periodo: string;
  total: number;
  imp_reaj: number;
  mora: number;
  costo_emis: number;
  fact_mora: number;
  benefic: number;
  ubica?: string;
};

export type GenerarLiquidacionPayload = {
  codigo: string;
  totalp: number;
  liquidacion: LiquidacionReciboPayload[];
  vt: { codigo: string; idrecibo: string }[];
  usuario: string;
};

export type LiquidacionReporteDetalle = {
  anno: string;
  tipo_general: string;
  monto: number;
};

export type LiquidacionReporteData = {
  nombre: string;
  domicilio: string;
  codigo: string;
  nliqui: string;
  fecha: string;
  usuario: string;
  detalles: LiquidacionReporteDetalle[];
  totalNeto: number;
};

// ─── Generar Liquidación (POST) ───────────────────────────

export async function generarLiquidacionDJAction(
  payload: GenerarLiquidacionPayload,
): Promise<
  { success: true; idliqui: string; nliqui: string } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/estado-cuenta/liquidacion', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false as const,
        error: errorData.error ?? errorData.message ?? `Error ${response.status}`,
      };
    }
    const result = await response.json();
    // Backend returns { success: true, data: { idliqui, nliqui } } — unwrap data.
    const data = result.data ?? result;
    return { success: true as const, idliqui: String(data.idliqui ?? ''), nliqui: String(data.nliqui ?? '') };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Reporte Liquidación (GET) ────────────────────────────

export async function getLiquidacionReporteAction(
  idliqui: string,
): Promise<
  { success: true; data: LiquidacionReporteData } | { success: false; error: string }
> {
  try {
    const response = await authFetch(`/declaracion-jurada/liquidacion/${encodeURIComponent(idliqui)}/reporte`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false as const,
        error: errorData.error ?? errorData.message ?? `Error ${response.status}`,
      };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Ver Pagos (GET) ─────────────────────────────────────

export type VerPagosDetalle = {
  anno: string;
  codObligacion: string;
  tributo: string;
  cuota: string;
  insoluto: number;
  intereses: number;
  emision: number;
  descuento: number;
  totalPagado: number;
  codReferencia: string;
};

export type VerPagosRecibo = {
  nroRecibo: string;
  fechaPago: string;
  totalPagado: number;
  contribuyente: string;
  banco: string;
  detalles: VerPagosDetalle[];
};

export type VerPagosData = {
  recibos: VerPagosRecibo[];
};

export async function getVerPagosAction(
  codigo: string,
): Promise<
  { success: true; data: VerPagosData } | { success: false; error: string }
> {
  try {
    const response = await authFetch(`/declaracion-jurada/ver-pagos/${encodeURIComponent(codigo)}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false as const,
        error: errorData.error ?? errorData.message ?? `Error ${response.status}`,
      };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Deuda Consolidada (POST) ────────────────────────────

export type DeudaConsolidadoFila = {
  codigo: string;
  anno: string;
  tipoagr: string;
  saldo: number;
};

export type DeudaConsolidadoCabecera = {
  codigo: string;
  nombre: string;
  direccion: string;
  fecEmision: string;
  horEmision: string;
  tipoDoc: string;
  ndoc: string;
};

export type DeudaConsolidadoData = {
  cabecera: DeudaConsolidadoCabecera;
  filas: DeudaConsolidadoFila[];
};

export type DeudaConsolidadoPayload = {
  codigo: string;
  periodos: string[];
  anios: string[];
  conceptos: string[];
  arbitrios: string[];
  predios: string[];
  vehiculos: string[];
  fraccionamientos: string[];
  /** '0' pendiente | '1' cancelado | '3' por compensar | '%' todo */
  estado: '0' | '1' | '3' | '%';
  criterio?: number;
  /** Option "Ver Resumen Ctas." */
  resumen?: boolean;
  /** Option "Ver Detalle Ctas." */
  detalle?: boolean;
  /** Option "Agrupar detalle por concepto" */
  agrupar?: boolean;
};

export async function getDeudaConsolidadoAction(
  payload: DeudaConsolidadoPayload,
): Promise<
  { success: true; data: DeudaConsolidadoData } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/estado-cuenta/deuda-consolidada', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false as const,
        error: errorData.error ?? errorData.message ?? `Error ${response.status}`,
      };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
