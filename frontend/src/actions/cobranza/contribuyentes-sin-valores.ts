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

export interface ContribuyenteSinValoresRow {
  codigo: string;
  categoria: string;
  nombre: string;
  direccion: string;
  junta: string;
  anno: string;
  periodos: string;
  totalInsol: number;
  totalInteres: number;
  totalCostoEmis: number;
  totalGeneral: number;
}

export type SearchContribuyentesSinValoresResult =
  | {
      success: true;
      data: ContribuyenteSinValoresRow[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }
  | { success: false; error: string };

export async function searchContribuyentesSinValoresAction(
  page: number = 1,
  pageSize: number = 20,
  anoVal: string = '',
): Promise<SearchContribuyentesSinValoresResult> {
  try {
    const response = await authFetch('/cobranza/contribuyentes-sin-valores/search', {
      method: 'POST',
      body: JSON.stringify({ anoVal, page, pageSize }),
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
