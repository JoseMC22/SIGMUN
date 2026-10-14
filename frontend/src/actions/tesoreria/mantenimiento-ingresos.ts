"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = 'SIGMUN_AUTH';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers['Cookie'] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ─── Search ────────────────────────────────────────────────

export interface MantenimientoIngresoRow {
  codigo: string;
  concepto: string;
  partida: string;
  nombre: string;
  ftefin: string;
  valor: number;
}

export type SearchMantenimientoIngresosResult =
  | {
      success: true;
      data: MantenimientoIngresoRow[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }
  | { success: false; error: string };

export type CriterioBusqueda = "C" | "N";

export interface SearchMantenimientoIngresosParams {
  criterio?: CriterioBusqueda;
  valor?: string;
  page?: number;
  pageSize?: number;
}

export async function searchMantenimientoIngresosAction(
  params: SearchMantenimientoIngresosParams = {},
): Promise<SearchMantenimientoIngresosResult> {
  const {
    criterio = "C",
    valor = "",
    page = 1,
    pageSize = 15,
  } = params;
  try {
    const response = await authFetch('/tesoreria/mantenimiento-ingresos/search', {
      method: 'POST',
      body: JSON.stringify({ criterio, valor, page, pageSize }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
