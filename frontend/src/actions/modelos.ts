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

export async function searchModelosAction(
  filters: Record<string, string | number | undefined>,
  page: number = 1,
  pageSize: number = 15,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/impuesto-vehicular/modelos/search', {
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

export async function fetchModeloDetailAction(id: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/modelos/${encodeURIComponent(id)}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.error ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchMarcasAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/modelos/catalogos/marcas');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchCategoriasAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/modelos/catalogos/categorias');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function saveModeloAction(data: {
  id?: string;
  nombre: string;
  id_categoria: string;
  id_marca: string;
  estado: string;
}) {
  try {
    const response = await authFetch('/impuesto-vehicular/modelos/save', {
      method: 'POST',
      body: JSON.stringify(data),
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

export async function eliminarModeloAction(id: string) {
  try {
    const response = await authFetch('/impuesto-vehicular/modelos/eliminar', {
      method: 'POST',
      body: JSON.stringify({ id }),
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
