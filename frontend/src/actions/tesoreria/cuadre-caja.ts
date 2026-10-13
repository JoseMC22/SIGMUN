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

export interface CuadreCajaRow {
  tipo8: number;
  tipo9: number;
  tipo8_06: number;
  tipo9_06: number;
  costas: number;
  sat100: number;
  total: number;
  total_6: number;
  ingreso: number;
  fivi: number;
}

export type SearchCuadreCajaResult =
  | { success: true; data: CuadreCajaRow | null }
  | { success: false; error: string };

export interface SearchCuadreCajaParams {
  fecha: string;
}

export async function searchCuadreCajaAction(
  params: SearchCuadreCajaParams,
): Promise<SearchCuadreCajaResult> {
  const { fecha } = params;
  try {
    const response = await authFetch('/tesoreria/cuadre-caja/search', {
      method: 'POST',
      body: JSON.stringify({ fecha }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, data: result.data ?? null };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
