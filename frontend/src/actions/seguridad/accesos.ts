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

// ── Tipos ─────────────────────────────────────────────────

export interface AccesosSearchFilters {
  id_acceso?: string;
  nombre?: string;
  menu?: string;
  pantalla?: string;
  orden?: string;
}

export interface AccesoRow {
  id_acceso: string;
  orden: string;
  nombre: string;
  id_objeto: string;
  icono: string;
  doform: string;
  nestado: string;
}

export interface MenuOption {
  id_acceso: string;
  nommenu: string;
}

export interface ModuloOption {
  id_acceso: string;
  nommenu: string;
}

// ── Búsqueda de accesos ───────────────────────────────────

export async function searchAccesosAction(
  filters: AccesosSearchFilters,
  page: number = 1,
  pageSize: number = 10,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/seguridad/accesos/search', {
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

// ── Menús (catálogo) ──────────────────────────────────────

export async function fetchMenusAction() {
  try {
    const response = await authFetch('/seguridad/accesos/menus');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data as MenuOption[] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ── Módulos por menú (catálogo) ───────────────────────────

export async function fetchModulosAction(menuId: string) {
  try {
    const response = await authFetch(`/seguridad/accesos/modulos?menuId=${encodeURIComponent(menuId)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data as ModuloOption[] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ── Acceso por ID ──────────────────────────────────────────

export async function fetchAccesoAction(id: string) {
  try {
    const response = await authFetch(`/seguridad/accesos/${encodeURIComponent(id)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data as AccesoRow };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ── Guardar acceso ─────────────────────────────────────────

export interface SaveAccesoData {
  id_acceso: string;
  id_acceso_old?: string;
  orden: string;
  menu?: string;
  pantalla?: string;
  nombre: string;
  icono?: string;
  doform?: string;
  id_objeto?: string;
  nestado: boolean | string;
}

export async function saveAccesoAction(data: SaveAccesoData) {
  try {
    const response = await authFetch('/seguridad/accesos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result.data as { id_acceso: string } };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
