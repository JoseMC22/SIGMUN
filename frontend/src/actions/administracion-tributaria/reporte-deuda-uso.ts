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

export interface ReporteDeudaUsoRow {
  codigo: string;
  nombre: string;
  anno: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  uso_predio: string;
  direccion: string;
  area_terreno: string;
  area_construccion: string;
  sector: string;
  insoluto_ip: string;
  insoluto_arb: string;
}

export interface AnnoOption {
  anno: string;
}

export interface UsoOption {
  id_uso: string;
  uso: string;
}

export interface SearchReporteDeudaUsoParams {
  anno: string;
  id_uso?: string;
  page?: number;
  pageSize?: number;
}

export async function getAniosReporteDeudaUsoAction(): Promise<
  { success: true; data: AnnoOption[] } | { success: false; error: string }
> {
  try {
    const res = await authFetch(
      "/administracion-tributaria/reporte-deuda-uso/combos/anios"
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Error ${res.status}` };
    }
    const result = await res.json();
    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de conexión",
    };
  }
}

export async function getUsosReporteDeudaUsoAction(): Promise<
  { success: true; data: UsoOption[] } | { success: false; error: string }
> {
  try {
    const res = await authFetch(
      "/administracion-tributaria/reporte-deuda-uso/combos/usos"
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Error ${res.status}` };
    }
    const result = await res.json();
    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de conexión",
    };
  }
}

export async function searchReporteDeudaUsoAction(
  params: SearchReporteDeudaUsoParams
): Promise<
  | {
      success: true;
      data: ReporteDeudaUsoRow[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }
  | { success: false; error: string }
> {
  try {
    const res = await authFetch(
      "/administracion-tributaria/reporte-deuda-uso/search",
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Error ${res.status}` };
    }
    const result = await res.json();
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de conexión",
    };
  }
}

export async function exportReporteDeudaUsoAction(
  anno: string,
  id_uso?: string
): Promise<
  { success: true; data: ReporteDeudaUsoRow[] } | { success: false; error: string }
> {
  try {
    const query = new URLSearchParams({
      anno,
      ...(id_uso ? { id_uso } : {}),
    });
    const res = await authFetch(
      `/administracion-tributaria/reporte-deuda-uso/export?${query.toString()}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Error ${res.status}` };
    }
    const result = await res.json();
    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de conexión",
    };
  }
}
