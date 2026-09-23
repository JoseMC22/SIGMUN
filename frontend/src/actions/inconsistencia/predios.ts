"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ── Tipos ─────────────────────────────────────────────────

export interface PredioInconsistenciaRow {
  codigo: string;
  nombre: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  direcion: string;
  uso: string;
  area_terreno: number;
  porcen_propiedad: number;
  val_total_terreno: number;
  val_total_constru: number;
  total_autoavaluo: number;
  ROW: number;
}

/**
 * Filtros que viajan al SP. El tipo de uso NO se incluye: el combo de uso es
 * solo visual y nunca filtra la búsqueda.
 */
export interface InconsistenciaPrediosFilters {
  idAcceso: string;
  anno: number;
}

export interface TipoInconsistenciaOption {
  id_acceso: string;
  nombre: string;
}

export interface UsoPredioOption {
  id_uso: string;
  uso: string;
}

// ── Combo tipo de inconsistencia ──────────────────────────

export async function getTiposInconsistenciaAction(): Promise<
  | { success: true; data: TipoInconsistenciaOption[] }
  | { success: false; error: string }
> {
  try {
    const response = await authFetch("/inconsistencia/predios/combos/tipos");
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false as const,
        error: errorData.message ?? `Error ${response.status}`,
      };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}

// ── Combo tipo de uso (solo visual) ───────────────────────

export async function getUsosPredioAction(): Promise<
  | { success: true; data: UsoPredioOption[] }
  | { success: false; error: string }
> {
  try {
    const response = await authFetch("/inconsistencia/predios/combos/usos");
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false as const,
        error: errorData.message ?? `Error ${response.status}`,
      };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}

// ── Búsqueda de inconsistencias de predios ────────────────

export async function searchInconsistenciasAction(
  filters: InconsistenciaPrediosFilters,
  page: number = 1,
  pageSize: number = 10,
) {
  try {
    const body = {
      idAcceso: filters.idAcceso,
      anno: filters.anno,
      page,
      pageSize,
    };
    const response = await authFetch("/inconsistencia/predios/search", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false as const,
        error: errorData.message ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}
