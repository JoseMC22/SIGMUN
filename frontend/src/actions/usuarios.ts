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

export async function searchUsuariosAction(
  filters: Record<string, string | number | undefined>,
  page: number = 1,
  pageSize: number = 20,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/seguridad/usuarios/search', {
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

export async function fetchAreasAction() {
  try {
    const response = await authFetch('/seguridad/usuarios/areas');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchPerfilesAction() {
  try {
    const response = await authFetch('/seguridad/usuarios/perfiles');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchUsuarioDetailAction(id_usuario: string) {
  try {
    const response = await authFetch(`/seguridad/usuarios/${encodeURIComponent(id_usuario)}`);
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

export async function fetchTiposDocumentoAction() {
  try {
    const response = await authFetch('/seguridad/usuarios/catalogos/tipos-documento');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchCajerosAction() {
  try {
    const response = await authFetch('/seguridad/usuarios/catalogos/cajeros');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function updateUsuarioAction(data: {
  busc?: string;       // "1" for create, "2" for edit (default)
  id_usuario: string;
  nombres: string;
  apellidos: string;
  area: string;
  id_doc: string;
  num_doc: string;
  vlogin: string;
  password?: string;
  confir?: string;
  cargo: string;
  cajero: string;     // "1" or "0" flag
  caja: string;       // cajero code when enabled
  id_perfil: string;
  nestado: string;    // "0" | "1"
}) {
  try {
    const response = await authFetch('/seguridad/usuarios/update', {
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

export async function eliminarUsuarioAction(id_usuario: string) {
  try {
    const response = await authFetch('/seguridad/usuarios/eliminar', {
      method: 'POST',
      body: JSON.stringify({ id_usuario }),
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

export async function crearCajaAction(caja: string) {
  try {
    const response = await authFetch('/seguridad/usuarios/catalogos/crear-caja', {
      method: 'POST',
      body: JSON.stringify({ caja }),
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

export async function cambiarClaveAction(data: {
  id_usuario: string;
  password: string;
  confir: string;
}) {
  try {
    const response = await authFetch('/seguridad/usuarios/cambiar-clave', {
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
