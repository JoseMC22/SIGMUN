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

// ── Types ─────────────────────────────────────────────────

export interface ReportePagoRow {
  recibo: string;
  fecha_pago: string;
  clasificacion: string;
  codigo: string;
  contribuyente: string;
  tributo: string;
  monto: number;
  tipo_pago: string;
  estado: string;
  /** Id del tipo de operación ('1' Sismuni, '2' Tupa, '4' Entrada). */
  tipo_operacion: string;
  /** Marca de recibo especial ('12.23'); define el color de fila. */
  tipo_rec: string;
  caja: string;
}

export interface ReportePagosResult {
  success: boolean;
  /** Solo la página pedida. */
  data: ReportePagoRow[];
  /** Cantidad total de filas del filtro (todas las páginas). */
  total: number;
  /** Suma de `monto` de todo el filtro, redondeada a 2 decimales. */
  monto_total: number;
  page: number;
  page_size: number;
  total_pages: number;
  error?: string;
}

export interface ReportePagosFilters {
  fecha_inicio: string;
  fecha_fin: string;
  recibo?: string;
  codigo?: string;
  contribuyente?: string;
  placa?: string;
  papeleta?: string;
  talonario?: string;
  anio?: string;
  page?: number;
  page_size?: number;
}

// ── Server Action ─────────────────────────────────────────

export async function searchReportePagosAction(
  filters: ReportePagosFilters,
): Promise<ReportePagosResult> {
  try {
    const response = await authFetch("/tesoreria/reporte-pagos/search", {
      method: "POST",
      body: JSON.stringify(filters),
      cache: "no-store",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error =
        data?.error ??
        data?.message ??
        (typeof data === "string" ? data : `Error ${response.status}`);
      return {
        success: false,
        data: [],
        total: 0,
        monto_total: 0,
        page: filters.page ?? 1,
        page_size: filters.page_size ?? 100,
        total_pages: 1,
        error: Array.isArray(error) ? error.join(", ") : String(error),
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        data: [],
        total: 0,
        monto_total: 0,
        page: filters.page ?? 1,
        page_size: filters.page_size ?? 100,
        total_pages: 1,
        error: json.error ?? "Error al consultar el reporte de pagos",
      };
    }

    return {
      success: true,
      data: json.data ?? [],
      total: json.total ?? 0,
      monto_total: json.monto_total ?? 0,
      page: json.page ?? filters.page ?? 1,
      page_size: json.page_size ?? filters.page_size ?? 100,
      total_pages: json.total_pages ?? 1,
    };
  } catch {
    return {
      success: false,
      data: [],
      total: 0,
      monto_total: 0,
      page: filters.page ?? 1,
      page_size: filters.page_size ?? 100,
      total_pages: 1,
      error: "Error de conexión con el servidor",
    };
  }
}

/** Obtiene el HTML del recibo (reimpresión interna) para abrirlo en una ventana nueva. */
export async function fetchReciboHtml(
  numIngr: string,
  tipo: string,
  reimp: boolean = true,
): Promise<string> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {};
  if (authCookie) {
    headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  const url = `${API_BASE}/tesoreria/reporte-pagos/recibo/${encodeURIComponent(numIngr)}?tipo=${encodeURIComponent(tipo)}&reimp=${reimp ? "1" : "0"}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Error al obtener el recibo (${response.status})`);
  }
  return response.text();
}
