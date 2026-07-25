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

// ─── Search Contribuyente ─────────────────────────────────

export interface ContribuyenteItem {
  codigo: string;
  paterno: string;
  materno: string;
  nombres: string;
  numDoc: string;
  direccion: string;
  row: number;
}

export interface ContribuyenteSearchResult {
  success: boolean;
  data: ContribuyenteItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export async function searchContribuyenteAction(
  tipoBusqueda: string,
  busqueda?: string,
  paterno?: string,
  materno?: string,
  nombres?: string,
  page: number = 1,
  pageSize: number = 15,
): Promise<ContribuyenteSearchResult> {
  try {
    const params = new URLSearchParams({
      tipoBusqueda,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (tipoBusqueda === "N") {
      params.set("paterno", paterno ?? "");
      params.set("materno", materno ?? "");
      params.set("nombres", nombres ?? "");
    } else if (busqueda) {
      params.set("busqueda", busqueda);
    }
    const response = await authFetch(`/alcabala/determinar-alcabala/buscar-contribuyente?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: errorData.error ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

// ─── Get Alcabalas by Contribuyente ────────────────────────

export interface AlcabalaItem {
  idAlcabala: number;
  fechaRegistro: string;
  montoAlcabala: number;
  codPred: string;
  anioPred: string;
  codigoVenta: string;
  estado: string;
}

export interface AlcabalasResult {
  success: boolean;
  data: AlcabalaItem[];
  error?: string;
}

export async function getAlcabalasAction(
  codigo: string,
): Promise<AlcabalasResult> {
  try {
    const response = await authFetch(`/alcabala/determinar-alcabala/alcabalas/${encodeURIComponent(codigo)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: [],
        error: errorData.error ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}