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

// ── Types ─────────────────────────────────────────────────

export interface TipoValorOption {
  id_valor: string;
  nomb_val: string;
}

export interface ReporteCargosRow {
  [key: string]: string | number | null;
}

export interface ReporteCargosResult {
  success: boolean;
  data: ReporteCargosRow[];
  total: number;
  error?: string;
}

export interface TipoValorResult {
  success: boolean;
  data: TipoValorOption[];
  error?: string;
}

export type ReporteCargosMode = "tipo_valor" | "fecha";

export interface ReporteCargosFilters {
  mode: ReporteCargosMode;
  id_valor?: string;
  nom_valor?: string; // display label only (not sent to SP)
  num_valor?: string;
  ano_valor?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

const BASE = "/notificaciones/reporte-cargos";

// ── Server Actions ────────────────────────────────────────

export async function listarTiposValorAction(): Promise<TipoValorResult> {
  try {
    const response = await authFetch(`${BASE}/tipos-valor`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, data: [], error: text || `Error ${response.status}` };
    }
    const json = await response.json();
    if (!json.success) {
      return { success: false, data: [], error: json.error ?? "Error al listar tipos de valor" };
    }
    return { success: true, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}

export async function searchReporteCargosAction(
  filters: ReporteCargosFilters,
): Promise<ReporteCargosResult> {
  try {
    const response = await authFetch(`${BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: filters.mode,
        id_valor: filters.id_valor,
        num_valor: filters.num_valor,
        ano_valor: filters.ano_valor ? Number(filters.ano_valor) : undefined,
        fecha_inicio: filters.fecha_inicio,
        fecha_fin: filters.fecha_fin,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, data: [], total: 0, error: text || `Error ${response.status}` };
    }

    const json = await response.json();
    if (!json.success) {
      return { success: false, data: [], total: 0, error: json.error ?? "Error al consultar el reporte" };
    }
    return { success: true, data: json.data ?? [], total: json.total ?? 0 };
  } catch {
    return { success: false, data: [], total: 0, error: "Error de conexión con el servidor" };
  }
}
