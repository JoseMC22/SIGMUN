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

export async function searchInfraccionesAction(
  filters: Record<string, string | number | undefined>,
  page: number = 1,
  pageSize: number = 15,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/papeleta-transito/listado-de-infracciones/search', {
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

// ── Acciones de datos para reportes ───────────────────────────────────────────

export async function obtenerDatosReporteEstadoCuentaAction(params: {
  ninfrac: string;
  codigo?: string;
  placa?: string;
  conductor?: string;
  dni?: string;
  estado?: string;
}) {
  try {
    const response = await authFetch('/papeleta-transito/acciones/reporte-estado-cuenta', {
      method: 'POST',
      body: JSON.stringify(params),
    });
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

export async function obtenerDatosReporteCertificadoAction(params: {
  ninfrac: string;
  numingr: string;
  operador?: string;
}) {
  try {
    const response = await authFetch('/papeleta-transito/acciones/reporte-certificado-no-adeudo', {
      method: 'POST',
      body: JSON.stringify(params),
    });
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

export async function obtenerDatosReporteGravamenAction(params: {
  ninfrac: string;
  numingr: string;
  operador?: string;
}) {
  try {
    const response = await authFetch('/papeleta-transito/acciones/reporte-gravamen', {
      method: 'POST',
      body: JSON.stringify(params),
    });
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

export async function obtenerDatosReporteResolucionSancionAction(params: {
  idtramctas: string;
  usuario?: string;
  estacion?: string;
}) {
  try {
    const response = await authFetch('/papeleta-transito/acciones/reporte-resolucion-sancion', {
      method: 'POST',
      body: JSON.stringify(params),
    });
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
