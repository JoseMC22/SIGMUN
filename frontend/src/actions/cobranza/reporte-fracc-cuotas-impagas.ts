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

// Tipos para el reporte de fraccionamientos con cuotas impagadas

export interface FraccCuotasImpagasRow {
  [key: string]: string | number | null; // dynamic columns from the SP
}

export interface FraccCuotasImpagasResult {
  success: boolean;
  data: FraccCuotasImpagasRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export interface FraccCuotasImpagasFilters {
  codigo?: string;
  fechaCorte?: string;
}

const BASE = "/cobranza/reporte-fracc-cuotas-impagas";

// Server Action

export async function searchFraccCuotasImpagasAction(
  filters: FraccCuotasImpagasFilters,
  page: number = 1,
  pageSize: number = 15,
): Promise<FraccCuotasImpagasResult> {
  try {
    const response = await authFetch(`${BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        pageSize,
        // Las claves del body son el contrato del DTO: 'Codigo' con C mayúscula y
        // 'FechCorte'. El backend descarta claves desconocidas en silencio, asi que
        // mandarlas en minúscula devolvería el listado completo sin avisar.
        Codigo: filters.codigo ?? "",
        FechCorte: filters.fechaCorte ?? "",
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