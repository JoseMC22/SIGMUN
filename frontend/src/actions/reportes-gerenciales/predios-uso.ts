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

// ── Types ─────────────────────────────────────────────────

export interface PredioUsoRow {
  tipo: string;
  uso: string;
  predios: number;
  condicion: string;
  count: number;
  anno: number;
  id_uso: string;
}

export interface PrediosUsoSearchFilters {
  codigo?: string;
  anno?: number;
  uso?: string;
}

export interface UsoOption {
  value: string;
  label: string;
}

export interface DetallePredioUsoParams {
  codigo?: string;
  anno: number;
  id_uso: string;
  flag: string;
}

// ── Búsqueda de predios por uso ────────────────────────────

export async function searchPrediosUsoAction(
  filters: PrediosUsoSearchFilters,
  page: number = 1,
  pageSize: number = 15,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/reportes-gerenciales/predios-uso/search', {
      method: 'POST',
      body: JSON.stringify(body),
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

// ── Detalle de predio por uso (@BUSC=9) ─────────────────────

export async function getDetallePredioUsoAction(params: DetallePredioUsoParams) {
  try {
    const response = await authFetch('/reportes-gerenciales/predios-uso/detail', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, data: result.data as Record<string, any>[] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ── Opciones de Uso (combo) ─────────────────────────────────

export async function getUsoOptionsAction() {
  try {
    const response = await authFetch('/reportes-gerenciales/predios-uso/uso-options');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, options: result.options as UsoOption[] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
