"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// Tipos para el listado de contribuyentes (anular-valor)

export interface AnularValorRow {
  [key: string]: string | number | null; // dynamic columns from the SP
}

export interface AnularValorResult {
  success: boolean;
  data: AnularValorRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export type TipoBusqueda = "C" | "N" | "R" | "D";

export interface AnularValorFilters {
  tipo: TipoBusqueda;
  codigo?: string;
  paterno?: string;
  materno?: string;
  nombres?: string;
  razon?: string;
  numDoc?: string;
}

const BASE = "/cobranza/anular-valor";

// Server Action

export async function searchAnularValorAction(
  filters: AnularValorFilters,
  page: number = 1,
  pageSize: number = 15,
): Promise<AnularValorResult> {
  try {
    const response = await authFetch(`${BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        pageSize,
        // Las claves del body son el contrato del DTO. El backend descarta
        // claves desconocidas en silencio: mandarlas mal devolvería todo sin
        // avisar. Solo viaja lleno lo del criterio elegido.
        TipoBusqueda: filters.tipo,
        Codigo: filters.codigo ?? "",
        Paterno: filters.paterno ?? "",
        Materno: filters.materno ?? "",
        Nombres: filters.nombres ?? "",
        Razon: filters.razon ?? "",
        NumDoc: filters.numDoc ?? "",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: json.error ?? "Error al consultar los contribuyentes",
      };
    }
    return {
      success: true,
      data: json.data ?? [],
      total: json.total ?? 0,
      page: json.page ?? page,
      pageSize: json.pageSize ?? pageSize,
      totalPages: json.totalPages ?? 0,
    };
  } catch {
    return {
      success: false,
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      error: "Error de conexión con el servidor",
    };
  }
}

export interface ValorEmitido {
  [key: string]: string | number | null;
}

export interface ValoresResult {
  success: boolean;
  data: ValorEmitido[];
  total: number;
  error?: string;
}

// Valores emitidos de un contribuyente (modal por fila)

export async function getValoresByCodigoAction(
  codigo: string,
): Promise<ValoresResult> {
  try {
    const response = await authFetch(`${BASE}/valores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Codigo: codigo }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        data: [],
        total: 0,
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        data: [],
        total: 0,
        error: json.error ?? "Error al consultar los valores",
      };
    }
    return {
      success: true,
      data: json.data ?? [],
      total: json.total ?? 0,
    };
  } catch {
    return {
      success: false,
      data: [],
      total: 0,
      error: "Error de conexión con el servidor",
    };
  }
}

// Motivo(s) de anulación de un valor (SP_Mvalores @msquery=14, solo lectura)

/** Llave del valor tal como la espera el backend. */
export interface MotivoAnulacionInput {
  IdValor: string;
  NumVal: string;
  AnoVal: string;
}

export interface MotivoAnulacionResult {
  success: boolean;
  data: string[];
  total: number;
  error?: string;
}

export async function getMotivoAnulacionAction(
  input: MotivoAnulacionInput,
): Promise<MotivoAnulacionResult> {
  try {
    const response = await authFetch(`${BASE}/motivo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        IdValor: input.IdValor,
        NumVal: input.NumVal,
        AnoVal: input.AnoVal,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        data: [],
        total: 0,
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        data: [],
        total: 0,
        error: json.error ?? "Error al consultar el motivo",
      };
    }
    return {
      success: true,
      data: json.data ?? [],
      total: json.total ?? 0,
    };
  } catch {
    return {
      success: false,
      data: [],
      total: 0,
      error: "Error de conexión con el servidor",
    };
  }
}

// Anulación de un valor (fase 2)

/** Llave del valor + motivo y operador, tal como los espera el backend. */
export interface AnularValorInput {
  Codigo: string;
  IdValor: string;
  NumVal: string;
  AnoVal: string;
  Motivo: string;
  Operador?: string;
}

export interface AnularValorActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function anularValorAction(
  input: AnularValorInput,
): Promise<AnularValorActionResult> {
  try {
    const response = await authFetch(`${BASE}/anular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Codigo: input.Codigo,
        IdValor: input.IdValor,
        NumVal: input.NumVal,
        AnoVal: input.AnoVal,
        Motivo: input.Motivo,
        Operador: input.Operador ?? "",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        error: json.error ?? "Error al anular el valor",
      };
    }
    return { success: true, message: json.message };
  } catch {
    return {
      success: false,
      error: "Error de conexión con el servidor",
    };
  }
}
