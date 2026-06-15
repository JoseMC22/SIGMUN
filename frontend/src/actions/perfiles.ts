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

export async function searchPerfilesAction(
  filters: Record<string, string | number | undefined>,
  page: number = 1,
  pageSize: number = 10,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/seguridad/perfiles/search', {
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

// ── Detail ─────────────────────────────────────────────────

export async function fetchPerfilDetailAction(id: string) {
  try {
    const response = await authFetch(`/seguridad/perfiles/${encodeURIComponent(id)}`);
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

// ── Módulos ────────────────────────────────────────────────

export async function fetchModulosAction() {
  try {
    const response = await authFetch('/seguridad/perfiles/catalogos/modulos');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ── Accesos por módulo (con permisos del perfil) ──────────

export async function fetchAccesosPorModuloAction(
  idModulo: string,
  idPerfil: string,
) {
  try {
    const response = await authFetch(
      `/seguridad/perfiles/modulos/${encodeURIComponent(idModulo)}/accesos/${encodeURIComponent(idPerfil)}`,
    );
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
