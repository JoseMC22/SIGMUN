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

export interface ReporteIngresosCajeroRow {
  codigoCajero: string;
  nombreCajero: string;
  numeroOperaciones: number;
  importe: number;
}

export interface SearchReporteIngresosCajeroParams {
  desde: string;
  hasta: string;
}

export interface ReporteIngresosCajeroData {
  data: ReporteIngresosCajeroRow[];
  totalOperaciones: number;
  totalImporte: number;
}

export async function searchReporteIngresosCajeroAction(
  params: SearchReporteIngresosCajeroParams
): Promise<
  | ({ success: true } & ReporteIngresosCajeroData)
  | { success: false; error: string }
> {
  try {
    const res = await authFetch(
      "/administracion-tributaria/reporte-ingresos-cajero/search",
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error:
          err.message ||
          err.error ||
          `Error ${res.status}: No se pudo consultar el reporte`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      data: data.data ?? [],
      totalOperaciones: data.totalOperaciones ?? 0,
      totalImporte: data.totalImporte ?? 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Error al conectar con el servidor",
    };
  }
}
