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

// Tipos para el reporte de Constancia de No Adeudos

export interface ConstanciaNoAdeudoRow {
  [key: string]: string | number | null; // dynamic columns from the SP
}

export interface ConstanciaNoAdeudoResult {
  success: boolean;
  data: ConstanciaNoAdeudoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export interface ConstanciaNoAdeudoFilters {
  codigo?: string;
  fdesde?: string;
  fhasta?: string;
}

const BASE = "/notificaciones/reporte-constancia-no-adeudos";

// Server Action

export async function searchConstanciaNoAdeudosAction(
  filters: ConstanciaNoAdeudoFilters,
  page: number = 1,
  pageSize: number = 10,
): Promise<ConstanciaNoAdeudoResult> {
  try {
    const response = await authFetch(`${BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        pageSize,
        Codigo: filters.codigo ?? "",
        fini: filters.fdesde ?? "",
        ffin: filters.fhasta ?? "",
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
        error: json.error ?? "Error al consultar el reporte",
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
