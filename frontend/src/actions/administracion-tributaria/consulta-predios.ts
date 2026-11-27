"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const SEARCH_PATH = "/administracion-tributaria/consulta-predios/search";
const EXPORT_PATH = "/administracion-tributaria/consulta-predios/export";

// ── Contrato del feature (espejo tipado estricto del backend) ────────────

/** Los diez filtros nominales compartidos por search y export. */
export interface ConsultaPrediosFilters {
  codigo: string;
  codPred: string;
  anno: string;
  codVia: string;
  urbBus: string;
  nro: string;
  dpto: string;
  mza: string;
  lte: string;
  sublote: string;
}

/** Fila de dominio de @busc=19: quince campos, sin numeración. */
export interface ConsultaPrediosRow {
  codigo: string;
  nombre: string;
  cod_pred: string;
  anexo: string;
  direccion: string;
  uso: string;
  t_area_const: number;
  area_terreno: number;
  porcen: number;
  val_terreno: number;
  val_constru: number;
  autoavaluo: number;
  id_instalas: string;
  num_pisos: number;
  categoria: string;
}

export interface ConsultaPrediosSearchPayload {
  data: ConsultaPrediosRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Envelope canónico `{code,message,details}` de openspec/standards/API.md. */
export interface ConsultaPrediosApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type SearchConsultaPrediosResult =
  | ({ success: true } & ConsultaPrediosSearchPayload)
  | ({ success: false } & ConsultaPrediosApiError);

/** Definición de columna del XLS; el backend ya incluye la columna `N`. */
export interface ConsultaPrediosExportColumn {
  key: string;
  label: string;
  sourceIndex: number;
}

/** `@busc=21`: 16 columnas sin pisos, 33 con pisos, con `N` ya generada. */
export interface ConsultaPrediosExportPayload {
  title: string;
  mostrarPisos: boolean;
  columns: ConsultaPrediosExportColumn[];
  rows: string[][];
}

export type ExportConsultaPrediosResult =
  | ({ success: true } & ConsultaPrediosExportPayload)
  | ({ success: false } & ConsultaPrediosApiError);

// ── Validación del boundary con type guards estrechos ────────────────────
// Desviación T04/T05 registrada en odd/tasks/consulta-predios.md: zod no es
// resoluble desde frontend/node_modules y el alcance prohíbe agregar
// dependencias, por lo que el boundary valida con predicados de tipo antes de
// mapear al dominio. Los códigos `network_error`/`unknown_error` describen
// fallos de transporte del cliente; el envelope `{code,message,details}` se
// conserva intacto.

const FILTER_FIELDS: readonly (keyof ConsultaPrediosFilters)[] = [
  "codigo",
  "codPred",
  "anno",
  "codVia",
  "urbBus",
  "nro",
  "dpto",
  "mza",
  "lte",
  "sublote",
];

const ROW_TEXT_FIELDS: readonly (keyof ConsultaPrediosRow)[] = [
  "codigo",
  "nombre",
  "cod_pred",
  "anexo",
  "direccion",
  "uso",
  "id_instalas",
  "categoria",
];

const ROW_NUMBER_FIELDS: readonly (keyof ConsultaPrediosRow)[] = [
  "t_area_const",
  "area_terreno",
  "porcen",
  "val_terreno",
  "val_constru",
  "autoavaluo",
  "num_pisos",
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

function isFilters(value: unknown): value is ConsultaPrediosFilters {
  if (!isRecord(value)) return false;
  return FILTER_FIELDS.every((field) => typeof value[field] === "string");
}

function isConsultaPrediosRow(value: unknown): value is ConsultaPrediosRow {
  if (!isRecord(value)) return false;
  for (const field of ROW_TEXT_FIELDS) {
    if (typeof value[field] !== "string") return false;
  }
  for (const field of ROW_NUMBER_FIELDS) {
    if (!isNonNegativeNumber(value[field])) return false;
  }
  return true;
}

function isExportColumn(value: unknown): value is ConsultaPrediosExportColumn {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    typeof value.sourceIndex === "number" &&
    Number.isFinite(value.sourceIndex)
  );
}

function isExportPayload(value: unknown): value is ConsultaPrediosExportPayload {
  if (!isRecord(value)) return false;
  if (typeof value.title !== "string") return false;
  if (typeof value.mostrarPisos !== "boolean") return false;
  if (!Array.isArray(value.columns)) return false;
  if (!value.columns.every(isExportColumn)) return false;
  if (!Array.isArray(value.rows)) return false;
  return value.rows.every(
    (row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"),
  );
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function mapApiError(body: unknown): ConsultaPrediosApiError {
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

function invalidParams(): SearchConsultaPrediosResult {
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

const SCHEMA_MISMATCH: SearchConsultaPrediosResult = {
  success: false,
  code: "schema_mismatch",
  message: "Respuesta inesperada del servidor",
};

const EXPORT_SCHEMA_MISMATCH: ExportConsultaPrediosResult = {
  success: false,
  code: "schema_mismatch",
  message: "Respuesta inesperada del servidor",
};

function invalidExportParams(): ExportConsultaPrediosResult {
  return {
    success: false,
    code: "validation_error",
    message: "Validation failed",
    details: {
      errors: [
        { path: "filters", message: "Invalid filter values" },
        { path: "mostrarPisos", message: "Must be a boolean" },
      ],
    },
  };
}

// ── Server actions ────────────────────────────────────────────────────────

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

export async function searchConsultaPrediosAction(
  filters: ConsultaPrediosFilters,
  page = 1,
  pageSize = 20,
): Promise<SearchConsultaPrediosResult> {
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

    const data: ConsultaPrediosRow[] = [];
    for (const item of body.data) {
      if (!isConsultaPrediosRow(item)) return SCHEMA_MISMATCH;
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

export async function exportarPredios(
  filters: ConsultaPrediosFilters,
  mostrarPisos: boolean,
): Promise<ExportConsultaPrediosResult> {
  if (!isFilters(filters) || typeof mostrarPisos !== "boolean") {
    return invalidExportParams();
  }

  try {
    const headers = await buildAuthHeaders();

    const response = await fetch(`${API_BASE}${EXPORT_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...filters, mostrarPisos }),
    });

    if (!response.ok) {
      const errorBody: unknown = await response.json().catch(() => null);
      return { success: false, ...mapApiError(errorBody) };
    }

    const body: unknown = await response.json();
    if (!isExportPayload(body)) return EXPORT_SCHEMA_MISMATCH;

    return {
      success: true,
      title: body.title,
      mostrarPisos: body.mostrarPisos,
      columns: body.columns,
      rows: body.rows,
    };
  } catch (error) {
    return {
      success: false,
      code: "network_error",
      message: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}
