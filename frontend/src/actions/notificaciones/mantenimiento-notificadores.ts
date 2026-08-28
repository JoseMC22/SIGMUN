"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ─── Types ─────────────────────────────────────────────────

export interface NotificadorRow {
  codigo_autoridad: number;
  iniciales: string;
  notificador: string;
  estado: "Activado" | "Desactivado";
}

export interface MantenimientoNotificadorResult {
  success: boolean;
  data?: NotificadorRow[];
  message?: string;
  error?: string;
}

export interface GuardarNotificadorInput {
  iniciales: string;
  notificador: string;
}

export interface ActualizarNotificadorInput {
  id_notificador: number;
  notificador: string;
}

const BASE = "/notificaciones/mantenimiento-notificadores";

// Shared POST helper: returns the unified envelope, parsing json.error on
// failure. Keeps the three write actions free of duplicated fetch/parse logic.
async function postMantenimiento(
  path: string,
  body: unknown,
): Promise<MantenimientoNotificadorResult> {
  try {
    const response = await authFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      return { success: false, error: json?.error ?? `Error ${response.status}` };
    }
    return { success: true, message: json.message };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

// ─── Server Actions ─────────────────────────────────────────

export async function listarNotificadoresAction(): Promise<MantenimientoNotificadorResult> {
  try {
    const response = await authFetch(BASE, { cache: "no-store" });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, error: text || `Error ${response.status}` };
    }

    const json = await response.json();
    if (!json.success) {
      return { success: false, error: json.error ?? "Error al listar notificadores" };
    }
    return { success: true, data: json.data ?? [] };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function guardarNotificadorAction(
  input: GuardarNotificadorInput,
): Promise<MantenimientoNotificadorResult> {
  return postMantenimiento(`${BASE}/guardar`, {
    iniciales: input.iniciales,
    notificador: input.notificador,
  });
}

export async function actualizarNotificadorAction(
  input: ActualizarNotificadorInput,
): Promise<MantenimientoNotificadorResult> {
  return postMantenimiento(`${BASE}/actualizar`, {
    id_notificador: input.id_notificador,
    notificador: input.notificador,
  });
}

export async function activarEliminarNotificadorAction(
  id_notificador: number,
  estado: 0 | 1,
): Promise<MantenimientoNotificadorResult> {
  return postMantenimiento(`${BASE}/activar-eliminar`, {
    id_notificador,
    estado,
  });
}
