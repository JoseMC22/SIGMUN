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

export interface AreaOption {
  id: string;
  descripcion: string;
}

export interface CajaOption {
  id: string;
  descripcion: string;
}

export interface ReporteIngresosGerenciaRow {
  partida: string;
  descripcion: string;
  monto: number;
  color?: string;
  espacio?: number;
  nivel_suma?: number;
}

export interface SearchReporteIngresosGerenciaParams {
  desde: string;
  hasta: string;
  area?: string;
  cajero?: string;
  tipo_operacion?: string;
  nivel?: number;
}

export interface ReporteIngresosGerenciaData {
  nombreArea: string;
  data: ReporteIngresosGerenciaRow[];
  total: number;
}

export async function getAreasReporteIngresosGerenciaAction(): Promise<
  { success: true; data: AreaOption[] } | { success: false; error: string }
> {
  try {
    const res = await authFetch(
      "/administracion-tributaria/reporte-ingresos-gerencia/combos/areas"
    );
    if (!res.ok) return { success: false, error: "No se pudieron obtener las áreas." };
    const json = await res.json();
    return { success: true, data: json.data ?? [] };
  } catch (error: any) {
    return { success: false, error: error?.message || "Error al conectar con el servidor" };
  }
}

export async function getCajasReporteIngresosGerenciaAction(): Promise<
  { success: true; data: CajaOption[] } | { success: false; error: string }
> {
  try {
    const res = await authFetch(
      "/administracion-tributaria/reporte-ingresos-gerencia/combos/cajas"
    );
    if (!res.ok) return { success: false, error: "No se pudieron obtener las cajas." };
    const json = await res.json();
    return { success: true, data: json.data ?? [] };
  } catch (error: any) {
    return { success: false, error: error?.message || "Error al conectar con el servidor" };
  }
}

export async function searchReporteIngresosGerenciaAction(
  params: SearchReporteIngresosGerenciaParams
): Promise<
  | ({ success: true } & ReporteIngresosGerenciaData)
  | { success: false; error: string }
> {
  try {
    const res = await authFetch(
      "/administracion-tributaria/reporte-ingresos-gerencia/search",
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.message || err.error || `Error ${res.status}: No se pudo consultar el reporte`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      nombreArea: data.nombreArea ?? "",
      data: data.data ?? [],
      total: data.total ?? 0,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Error al conectar con el servidor" };
  }
}
