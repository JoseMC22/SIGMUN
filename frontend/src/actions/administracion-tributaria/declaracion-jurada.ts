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

export interface SearchContribuyenteFilters {
  tipoBusqueda?: string;
  codigo?: string;
  nombres?: string;
  paterno?: string;
  materno?: string;
  razon?: string;
  numDoc?: string;
  codPred?: string;
  // ── Address/Predio fields (used when tipoBusqueda='P') ──
  anno?: string;
  idVia?: string;
  nro?: string;
  dpto?: string;
  mza?: string;
  lte?: string;
  subLte?: string;
  codUrb?: string;
  checkfrac?: number;
  // ── Placa field (used when tipoBusqueda='V') ──
  placa?: string;
}

export interface ContribuyenteListItem {
  codigo: string;
  tipoDetalle: string;
  gestion: string;
  nombresCompletos: string;
  numDoc: string;
  direFis: string;
  row: number;
}

export interface ContribuyenteDireccionItem {
  codigo: string;
  nombre: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  direccion: string;
  row: number;
}

export interface ContribuyentePlacaItem {
  codigo: string;
  nombresCompletos: string;
  numDoc: string;
  direFis: string;
  placa: string;
  row: number;
}

export type ContribuyenteAnyItem = ContribuyenteListItem | ContribuyenteDireccionItem | ContribuyentePlacaItem;

export interface PaginatedResponse {
  data: ContribuyenteAnyItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchContribuyenteAction(
  filters: SearchContribuyenteFilters,
  page: number = 1,
  pageSize: number = 10,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/declaracion-jurada/search', {
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

// ─── Combos (modal de registro) ────────────────────────────

export interface TipoDocumentoOption {
  value: string;
  maxDigits: number;
  label: string;
}

export interface TipoContribuyenteOption {
  value: string;
  label: string;
}

export interface SubTipoContribuyenteOption {
  value: string;
  label: string;
}

export interface DistritoOption {
  value: string;
  label: string;
}

export async function getTiposDocumentoAction(): Promise<
  { success: true; data: TipoDocumentoOption[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/combos/tipos-documento');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getTiposContribuyenteAction(): Promise<
  { success: true; data: TipoContribuyenteOption[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/combos/tipos-contribuyente');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getSubTiposContribuyenteAction(
  idTipoContri: string,
): Promise<{ success: true; data: SubTipoContribuyenteOption[] } | { success: false; error: string }> {
  try {
    const response = await authFetch(
      `/declaracion-jurada/combos/subtipos-contribuyente?idTipoContri=${encodeURIComponent(idTipoContri)}`,
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getDistritosAction(): Promise<
  { success: true; data: DistritoOption[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/declaracion-jurada/combos/distritos');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
