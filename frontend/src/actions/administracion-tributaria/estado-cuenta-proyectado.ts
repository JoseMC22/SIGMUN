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
