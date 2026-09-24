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

export interface PredioContribuyenteRow {
  codigo: string;
  nombre: string;
  categoria: string;
  codPredio: string;
  anexo: string;
  subAnexo: string;
  predio: string;
  junta: string;
}

export type SearchPrediosContribuyentesResult =
  | {
      success: true;
      data: PredioContribuyenteRow[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }
  | { success: false; error: string };

export async function searchPrediosContribuyentesAction(
  page: number = 1,
  pageSize: number = 20,
): Promise<SearchPrediosContribuyentesResult> {
  try {
    const response = await authFetch('/administracion-tributaria/predios-contribuyentes/search', {
      method: 'POST',
      body: JSON.stringify({ page, pageSize }),
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