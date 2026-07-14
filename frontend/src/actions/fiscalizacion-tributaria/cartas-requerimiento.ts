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

export async function searchCartasRequerimientoAction(
  filters: Record<string, string | number | undefined>,
  page: number = 1,
  pageSize: number = 10,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/fiscalizacion-tributaria/cartas-requerimiento/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    console.log('[ServerAction] Raw backend response:', JSON.stringify(result, null, 2));
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getContribuyenteAction(codigo: string) {
  try {
    const response = await authFetch('/fiscalizacion-tributaria/cartas-requerimiento/contribuyente', {
      method: 'POST',
      body: JSON.stringify({ codigo }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function searchCartasAction(codigo: string, page: number, pageSize: number) {
  try {
    const response = await authFetch('/fiscalizacion-tributaria/cartas-requerimiento/cartas', {
      method: 'POST',
      body: JSON.stringify({ codigo, page, pageSize }),
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

// ── Nueva Carta Req. supporting actions ──

export async function getTAAnioAction() {
  try {
    const response = await authFetch('/fiscalizacion-tributaria/cartas-requerimiento/t-anio', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const data = await response.json();
    return { success: true as const, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getMotivoAction() {
  try {
    const response = await authFetch('/fiscalizacion-tributaria/cartas-requerimiento/motivo', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const data = await response.json();
    return { success: true as const, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getCartaReqPrediosAction(codigo: string, anno: string, idCarta?: number) {
  try {
    const body: any = { codigo, anno };
    if (idCarta) body.idCarta = idCarta;
    const response = await authFetch('/fiscalizacion-tributaria/cartas-requerimiento/carta-req-predios', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const data = await response.json();
    return { success: true as const, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getCartaByIdAction(idCarta: number) {
  try {
    const response = await authFetch('/fiscalizacion-tributaria/cartas-requerimiento/carta-by-id', {
      method: 'POST',
      body: JSON.stringify({ idCarta }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const data = await response.json();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getFiscalizadoresAction(idCarta?: number) {
  try {
    const body: any = {};
    if (idCarta) body.idCarta = idCarta;
    const response = await authFetch('/fiscalizacion-tributaria/cartas-requerimiento/fiscalizadores', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const data = await response.json();
    return { success: true as const, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
