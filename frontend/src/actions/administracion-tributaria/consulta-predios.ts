"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const SEARCH_PATH = "/administracion-tributaria/consulta-predios/search";

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

// ── Validación del boundary con type guards estrechos ────────────────────
// zod no es dependencia del paquete frontend, por lo que aquí se valida en
// runtime con predicados de tipo antes de mapear al dominio.

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
    if (!isCount(value[field]) && !isFiniteNumber(value[field])) return false;
  }
  return true;
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
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

// ── Server action ─────────────────────────────────────────────────────────

export async function searchConsultaPrediosAction(
  filters: ConsultaPrediosFilters,
  page = 1,
  pageSize = 20,
): Promise<SearchConsultaPrediosResult> {
  if (!isFilters(filters) || !isPositiveInt(page) || !isPositiveInt(pageSize)) {
    return invalidParams();
  }

  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authCookie) {
      headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
    }

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
