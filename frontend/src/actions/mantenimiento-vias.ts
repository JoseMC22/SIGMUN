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

export interface SearchViasFilters {
  cod_via?: string;
  nom_zona?: string;
  nom_urba?: string;
  nombre_via?: string;
  nestado?: string;
}

export async function searchViasAction(
  filters: SearchViasFilters,
  page: number = 1,
  pageSize: number = 20,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/mantenimiento-vias/search', {
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

// ─── Get one (for edit) ────────────────────────────────────

export interface TipoViaOption {
  id_tipo: string;
  nombre: string;
}

export interface UrbanizacionOption {
  id_urba: string;
  nombres: string;
}

export interface ZonaOption {
  id_zona: string;
  nombres: string;
}

export async function getTiposViaAction(): Promise<{ success: true; data: TipoViaOption[] } | { success: false; error: string }> {
  try {
    const response = await authFetch('/mantenimiento-vias/combos/tipos-via');
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

export async function getUrbanizacionesAction(): Promise<{ success: true; data: UrbanizacionOption[] } | { success: false; error: string }> {
  try {
    const response = await authFetch('/mantenimiento-vias/combos/urbanizaciones');
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

export async function getZonasAction(): Promise<{ success: true; data: ZonaOption[] } | { success: false; error: string }> {
  try {
    const response = await authFetch('/mantenimiento-vias/combos/zonas');
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

export async function getViaAction(cod_via: string) {
  try {
    const response = await authFetch(`/mantenimiento-vias/${encodeURIComponent(cod_via)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    console.error('[getViaAction] fech_ing:', result.data?.fech_ing);
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Create ────────────────────────────────────────────────

export interface CreateViaPayload {
  id_urba: string;
  tipovia: string;
  vcuadra: string;
  id_zona: string;
  nombre_via: string;
  id_tipozona: string;
  nestado: string;
  vlado: string;
  operador?: string;
  estacion?: string;
}

export async function createViaAction(payload: CreateViaPayload) {
  try {
    const response = await authFetch('/mantenimiento-vias', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, message: result.message };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Aranceles ──────────────────────────────────────────────

export interface ArancelRow {
  id_tbl: string;
  cod_via: string;
  anno: string;
  arancel: string;
  estado: string;
}

export interface ArancelDetalleRow {
  anno: string;
  arancel: number;
  nestado: number;
}

export async function getArancelesAction(cod_via: string) {
  try {
    const response = await authFetch(`/mantenimiento-vias/${encodeURIComponent(cod_via)}/aranceles`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data as ArancelRow[] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getArancelDetalleAction(cod_via: string, id_tbl: string) {
  try {
    const response = await authFetch(`/mantenimiento-vias/${encodeURIComponent(cod_via)}/aranceles/${encodeURIComponent(id_tbl)}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data as ArancelDetalleRow };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export interface SaveArancelPayload {
  id_tbl?: string;
  anno: string;
  arancel: string;
  nestado: string;
}

export async function saveArancelAction(cod_via: string, payload: SaveArancelPayload) {
  try {
    const response = await authFetch(`/mantenimiento-vias/${encodeURIComponent(cod_via)}/aranceles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.message ?? errorData.error ?? `Error ${response.status}`;
      return { success: false as const, error: msg };
    }

    const result = await response.json();
    return { success: true as const, message: result.message };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Update ────────────────────────────────────────────────

export interface UpdateViaPayload {
  id_urba: string;
  tipovia: string;
  vcuadra: string;
  id_zona: string;
  nombre_via: string;
  id_tipozona: string;
  nestado: string;
  vlado: string;
  estacion?: string;
}

export async function updateViaAction(cod_via: string, payload: UpdateViaPayload) {
  try {
    const url = `/mantenimiento-vias/${encodeURIComponent(cod_via)}`;
    const body = JSON.stringify(payload);
    console.error('[updateViaAction] URL:', url);
    console.error('[updateViaAction] BODY:', body);
    const response = await authFetch(url, {
      method: 'PUT',
      body,
    });

    if (!response.ok) {
      const rawText = await response.text().catch(() => '(no text)');
      const statusInfo = `status=${response.status} body=${rawText}`;
      console.error('[updateViaAction] RESPONSE:', statusInfo);
      return { success: false as const, error: `Error ${response.status}: ${rawText.substring(0, 200)}` };
    }

    const result = await response.json();
    return { success: true as const, message: result.message };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error de conexión';
    console.error('[updateViaAction] CATCH:', msg);
    return { success: false as const, error: msg };
  }
}

// ─── Urbanizaciones CRUD ────────────────────────────────────

export interface TipoUrbanizacionOption {
  id: string;
  abrev: string;
  nombre: string;
}

export interface CreateUrbanizacionPayload {
  id_urba: string;
  tipourb: string;
  nombre: string;
  nestado?: string;
  operador?: string;
  estacion?: string;
}

export interface UpdateUrbanizacionPayload {
  tipourb: string;
  nombre: string;
  nestado: string;
  operador?: string;
  estacion?: string;
}

export interface UrbanizacionDetail {
  id_urba: string;
  tipourb: string;
  nombre: string;
  nestado: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

export async function getTiposUrbanizacionAction(): Promise<
  { success: true; data: TipoUrbanizacionOption[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch('/mantenimiento-vias/combos/tipos-urbanizacion');
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

export async function createUrbanizacionAction(
  payload: CreateUrbanizacionPayload,
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const response = await authFetch('/mantenimiento-vias/urbanizaciones', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? errorData.error ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, message: result.message };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getUrbanizacionAction(
  id_urba: string,
): Promise<{ success: true; data: UrbanizacionDetail } | { success: false; error: string }> {
  try {
    const response = await authFetch(`/mantenimiento-vias/urbanizaciones/${encodeURIComponent(id_urba)}`);
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

export async function updateUrbanizacionAction(
  id_urba: string,
  payload: UpdateUrbanizacionPayload,
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const response = await authFetch(`/mantenimiento-vias/urbanizaciones/${encodeURIComponent(id_urba)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? errorData.error ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, message: result.message };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Urbanizaciones (consulta) ─────────────────────────────

export interface UrbanizacionRow {
  id_urba: string;
  tipourb: string;
  nombabr: string;
  nombre: string;
  estado: string;
}

export async function buscarUrbanizacionesAction(params: {
  tipo?: string;
  nombre?: string;
  nestado?: string;
}) {
  try {
    const qs = new URLSearchParams();
    if (params.tipo) qs.set('tipo', params.tipo);
    if (params.nombre) qs.set('nombre', params.nombre);
    if (params.nestado) qs.set('nestado', params.nestado);
    const query = qs.toString();
    const url = `/mantenimiento-vias/urbanizaciones${query ? `?${query}` : ''}`;

    const response = await authFetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data as UrbanizacionRow[] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error de conexión';
    return { success: false as const, error: msg };
  }
}

