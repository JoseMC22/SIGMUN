"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const SEARCH_PATH =
  "/administracion-tributaria/estado-cuenta-proyectado/contribuyentes";

// ── Contrato del feature (espejo tipado estricto del backend) ────────────

export type TipoBusquedaProyectado = "C" | "N" | "D" | "R";

/** Los seis filtros heredados de mantcontriproyec/index. */
export interface ContribuyentesProyectadosFilters {
  tipoBusqueda: TipoBusquedaProyectado;
  codigo: string;
  criterioNombre: string;
  criterioPaterno: string;
  criterioMaterno: string;
  criterioRazon: string;
  documento: string;
}

/** Fila de dominio de @busc=5: cuatro columnas de la grilla legacy. */
export interface ContribuyenteProyectadoRow {
  codigo: string;
  nombres: string;
  documento: string;
  direccion: string;
}

export interface ContribuyentesProyectadosSearchPayload {
  data: ContribuyenteProyectadoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Envelope canónico `{code,message,details}` de openspec/standards/API.md. */
export interface ProyectadoApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type SearchContribuyentesProyectadosResult =
  | ({ success: true } & ContribuyentesProyectadosSearchPayload)
  | ({ success: false } & ProyectadoApiError);

// ── Validación del boundary con type guards estrechos ────────────────────
// zod no es resoluble desde frontend/node_modules (misma restricción ya
// documentada en consulta-predios), así que el boundary valida con predicados
// de tipo antes de mapear al dominio. El envelope del servidor se conserva.

const FILTER_TEXT_FIELDS: readonly (keyof ContribuyentesProyectadosFilters)[] = [
  "codigo",
  "criterioNombre",
  "criterioPaterno",
  "criterioMaterno",
  "criterioRazon",
  "documento",
];

const ROW_FIELDS: readonly (keyof ContribuyenteProyectadoRow)[] = [
  "codigo",
  "nombres",
  "documento",
  "direccion",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isTipoBusqueda(value: unknown): value is TipoBusquedaProyectado {
  return value === "C" || value === "N" || value === "D" || value === "R";
}

function isFilters(value: unknown): value is ContribuyentesProyectadosFilters {
  if (!isRecord(value) || !isTipoBusqueda(value.tipoBusqueda)) return false;
  return FILTER_TEXT_FIELDS.every((field) => typeof value[field] === "string");
}

function isRow(value: unknown): value is ContribuyenteProyectadoRow {
  if (!isRecord(value)) return false;
  return ROW_FIELDS.every((field) => typeof value[field] === "string");
}

function mapApiError(body: unknown): ProyectadoApiError {
  if (!isRecord(body)) {
    return { code: "unknown_error", message: "Error inesperado del servidor" };
  }
  const code = typeof body.code === "string" ? body.code : "unknown_error";
  const message =
    typeof body.message === "string"
      ? body.message
      : "Error inesperado del servidor";
  const details = isRecord(body.details) ? body.details : undefined;
  return details ? { code, message, details } : { code, message };
}

function invalidParams(): SearchContribuyentesProyectadosResult {
  return {
    success: false,
    code: "validation_error",
    message: "Validation failed",
    details: {
      errors: [
        { path: "filters", message: "Invalid filter values" },
        { path: "page", message: "Must be an integer greater than zero" },
        { path: "pageSize", message: "Must be an integer greater than zero" },
      ],
    },
  };
}

const SCHEMA_MISMATCH: SearchContribuyentesProyectadosResult = {
  success: false,
  code: "schema_mismatch",
  message: "Respuesta inesperada del servidor",
};

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authCookie) {
    headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return headers;
}

export async function searchContribuyentesProyectadosAction(
  filters: ContribuyentesProyectadosFilters,
  page = 1,
  pageSize = 20,
): Promise<SearchContribuyentesProyectadosResult> {
  if (!isFilters(filters) || !isPositiveInt(page) || !isPositiveInt(pageSize)) {
    return invalidParams();
  }

  try {
    const headers = await buildAuthHeaders();

    const response = await fetch(`${API_BASE}${SEARCH_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...filters, page, pageSize }),
    });

    if (!response.ok) {
      const errorBody: unknown = await response.json().catch(() => null);
      return { success: false, ...mapApiError(errorBody) };
    }

    const body: unknown = await response.json();
    if (
      !isRecord(body) ||
      !Array.isArray(body.data) ||
      !isCount(body.total) ||
      !isPositiveInt(body.page) ||
      !isPositiveInt(body.pageSize) ||
      !isCount(body.totalPages)
    ) {
      return SCHEMA_MISMATCH;
    }

    const data: ContribuyenteProyectadoRow[] = [];
    for (const item of body.data) {
      if (!isRow(item)) return SCHEMA_MISMATCH;
      data.push(item);
    }

    return {
      success: true,
      data,
      total: body.total,
      page: body.page,
      pageSize: body.pageSize,
      totalPages: body.totalPages,
    };
  } catch (error) {
    return {
      success: false,
      code: "network_error",
      message: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}

// ── Detalle del estado de cuenta (child 02) ─────────────────────────────────
// Espejo del contrato validado de los SP: mapeo por nombre de columna, nunca
// por posición. Los parámetros compuestos se unen con coma antes de enlazarse.

export type EstadoDetalleProyectado = "0" | "1" | "%";

/** Selection owned by the detail view; the action maps it to the SP body. */
export interface DetalleEstadoCuentaFilters {
  annos: string[];
  tipos: string[];
  tiporec: string[];
  perio: string[];
  predio: string[];
  estado: EstadoDetalleProyectado;
  fecha_proyectada: string;
}

export interface CabeceraProyectado {
  codigo: string;
  nombre: string;
  dirfiscal: string;
  num_doc: string;
  flag_fraccionamiento: string;
}

export interface RangoProyectado {
  minimo: string;
  maximo: string;
}

export interface PredioProyectado {
  cod_pred: string;
  anexo1: string;
  direccion: string;
  anno: string;
}

export interface CatalogosProyectado {
  periodos: RangoProyectado;
  annos: RangoProyectado;
  predios: PredioProyectado[];
  fechaProyectada: string;
}

export interface ReciboEmitidoProyectado {
  num_ingr: string;
  codigo: string;
  caja: string;
  fec_pago: string;
  monto: string;
  estado: string;
  operador: string;
}

export interface DetalleReciboProyectado {
  idrecibo: string;
  codigo: string;
  tipo: string;
  anno: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  tipo_rec: string;
  periodo: string;
  imp_insol: string;
  imp_reaj: string;
  mora: string;
  costo_emis: string;
  des_tipo: string;
  des_cabecera: string;
  det_anexo: string;
  total: number;
  benefic: number;
  tot_pagado: number;
  ubica: string;
}

export type DetalleActionResult<T> =
  | ({ success: true } & { data: T })
  | ({ success: false } & ProyectadoApiError);

const DETALLE_BASE_PATH =
  "/administracion-tributaria/estado-cuenta-proyectado";
const CODIGO_LENGTH = 7;

const CABECERA_FIELDS: readonly string[] = [
  "codigo",
  "nombre",
  "dirfiscal",
  "num_doc",
  "flag_fraccionamiento",
];
const RECIBO_FIELDS: readonly string[] = [
  "num_ingr",
  "codigo",
  "caja",
  "fec_pago",
  "monto",
  "estado",
  "operador",
];
const PREDIO_FIELDS: readonly string[] = [
  "cod_pred",
  "anexo1",
  "direccion",
  "anno",
];
const DETALLE_STRING_FIELDS: readonly string[] = [
  "idrecibo",
  "codigo",
  "tipo",
  "anno",
  "cod_pred",
  "anexo",
  "sub_anexo",
  "tipo_rec",
  "periodo",
  "imp_insol",
  "imp_reaj",
  "mora",
  "costo_emis",
  "des_tipo",
  "des_cabecera",
  "det_anexo",
  "ubica",
];
const FILTER_ARRAY_FIELDS: readonly string[] = [
  "annos",
  "tipos",
  "tiporec",
  "perio",
  "predio",
];

const DETALLE_SCHEMA_MISMATCH: DetalleActionResult<never> = {
  success: false,
  code: "schema_mismatch",
  message: "Respuesta inesperada del servidor",
};

function hasStringFields(
  value: unknown,
  fields: readonly string[],
): value is Record<string, string> {
  if (!isRecord(value)) return false;
  return fields.every((field) => typeof value[field] === "string");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(itemGuard);
}

function isCodigo(value: unknown): value is string {
  return typeof value === "string" && /^\d{1,7}$/.test(value.trim());
}

function normalizeCodigo(value: string): string {
  return value.trim().padStart(CODIGO_LENGTH, "0");
}

function isEstado(value: unknown): value is EstadoDetalleProyectado {
  return value === "0" || value === "1" || value === "%";
}

function isDetalleFilters(value: unknown): value is DetalleEstadoCuentaFilters {
  if (!isRecord(value)) return false;
  if (!isEstado(value.estado) || typeof value.fecha_proyectada !== "string") {
    return false;
  }
  return FILTER_ARRAY_FIELDS.every((field) => isStringArray(value[field]));
}

function isCabecera(value: unknown): value is CabeceraProyectado {
  return hasStringFields(value, CABECERA_FIELDS);
}

function isRango(value: unknown): value is RangoProyectado {
  return hasStringFields(value, ["minimo", "maximo"]);
}

function isCatalogos(value: unknown): value is CatalogosProyectado {
  if (!isRecord(value)) return false;
  if (!isRango(value.periodos) || !isRango(value.annos)) return false;
  if (typeof value.fechaProyectada !== "string" || !Array.isArray(value.predios)) {
    return false;
  }
  return value.predios.every((predio) =>
    hasStringFields(predio, PREDIO_FIELDS),
  );
}

function isRecibo(value: unknown): value is ReciboEmitidoProyectado {
  return hasStringFields(value, RECIBO_FIELDS);
}

function toAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isDetalleRow(value: unknown): value is DetalleReciboProyectado {
  if (!hasStringFields(value, DETALLE_STRING_FIELDS)) return false;
  return (
    toAmount(value.total) !== null &&
    toAmount(value.benefic) !== null &&
    toAmount(value.tot_pagado) !== null
  );
}

function mapDetalleRow(value: DetalleReciboProyectado): DetalleReciboProyectado {
  return {
    ...value,
    total: toAmount(value.total) ?? 0,
    benefic: toAmount(value.benefic) ?? 0,
    tot_pagado: toAmount(value.tot_pagado) ?? 0,
  };
}

function invalidCodigo<T>(): DetalleActionResult<T> {
  return {
    success: false,
    code: "validation_error",
    message: "Validation failed",
    details: {
      errors: [{ path: "codigo", message: "Codigo must be 1 to 7 digits" }],
    },
  };
}

interface DetalleRequest {
  method: "GET" | "POST";
  body?: string;
}

async function requestDetalle<T>(
  suffix: string,
  request: DetalleRequest,
  guard: (body: unknown) => body is T,
): Promise<DetalleActionResult<T>> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch(`${API_BASE}${DETALLE_BASE_PATH}${suffix}`, {
      method: request.method,
      headers,
      ...(request.body ? { body: request.body } : {}),
    });
    if (!response.ok) {
      const errorBody: unknown = await response.json().catch(() => null);
      return { success: false, ...mapApiError(errorBody) };
    }
    const body: unknown = await response.json();
    if (!guard(body)) return DETALLE_SCHEMA_MISMATCH;
    return { success: true, data: body };
  } catch (error) {
    return {
      success: false,
      code: "network_error",
      message: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}

export async function getCabeceraProyectadaAction(
  codigo: string,
): Promise<DetalleActionResult<CabeceraProyectado>> {
  if (!isCodigo(codigo)) return invalidCodigo();
  const suffix = `/cabecera?codigo=${encodeURIComponent(normalizeCodigo(codigo))}`;
  return requestDetalle(suffix, { method: "GET" }, isCabecera);
}

export async function getCatalogosProyectadoAction(
  codigo: string,
): Promise<DetalleActionResult<CatalogosProyectado>> {
  if (!isCodigo(codigo)) return invalidCodigo();
  const suffix = `/catalogos?codigo=${encodeURIComponent(normalizeCodigo(codigo))}`;
  return requestDetalle(suffix, { method: "GET" }, isCatalogos);
}

export async function getRecibosProyectadoAction(
  codigo: string,
): Promise<DetalleActionResult<ReciboEmitidoProyectado[]>> {
  if (!isCodigo(codigo)) return invalidCodigo();
  const suffix = `/recibos?codigo=${encodeURIComponent(normalizeCodigo(codigo))}`;
  return requestDetalle(suffix, { method: "GET" }, (body) =>
    isArrayOf(body, isRecibo),
  );
}

export async function consultarDetalleProyectadoAction(
  codigo: string,
  filters: DetalleEstadoCuentaFilters,
): Promise<DetalleActionResult<DetalleReciboProyectado[]>> {
  if (!isCodigo(codigo) || !isDetalleFilters(filters)) return invalidCodigo();
  const body = {
    codigo: normalizeCodigo(codigo),
    annos: filters.annos,
    tipos: filters.tipos,
    tiporec: filters.tiporec.join(","),
    perio: filters.perio.join(","),
    predio: filters.predio.join(","),
    estado: filters.estado,
    fecha_proyectada: filters.fecha_proyectada,
  };
  const result = await requestDetalle<DetalleReciboProyectado[]>(
    "/consulta",
    { method: "POST", body: JSON.stringify(body) },
    (value) => isArrayOf(value, isDetalleRow),
  );
  if (!result.success) return result;
  return { success: true, data: result.data.map(mapDetalleRow) };
}
