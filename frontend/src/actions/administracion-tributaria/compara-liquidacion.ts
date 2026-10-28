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

// ─── Comparación de liquidaciones ──────────────────────────

export interface LiquidacionCabecera {
  idLiquidacion: number;
  numero: string;
  codigo: string;
  monto: number;
  observacion: string | null;
  estado: string;
  usuario: string;
  terminal: string;
  fregistro: string;
  fvencimiento: string;
  observacion2: string | null;
}

export interface LiquidacionDetalleRow {
  secuencia: number;
  tipo: string;
  tipoRec: string;
  anno: number;
  periodo: string;
  impInsol: number;
  impMora: number;
  costoEmi: number;
  total: number;
  nombre: string;
  femision: string;
}

export type BuscarLiquidacionResult =
  | { success: true; cabecera: LiquidacionCabecera | null; detalle: LiquidacionDetalleRow[] }
  | { success: false; error: string };

export async function buscarLiquidacionAction(
  numero: string,
): Promise<BuscarLiquidacionResult> {
  try {
    const response = await authFetch('/administracion-tributaria/compara-liquidacion/buscar', {
      method: 'POST',
      body: JSON.stringify({ numero }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.error ?? errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return {
      success: true as const,
      cabecera: result.cabecera ?? null,
      detalle: result.detalle ?? [],
    };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
