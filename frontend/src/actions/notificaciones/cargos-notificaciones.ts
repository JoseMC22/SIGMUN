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

// ── Types ─────────────────────────────────────────────────

export interface TipoValorOption {
  id_valor: string;
  nomb_val: string;
}

export interface NotificadorOption {
  codigo_autoridad: number;
  notificador: string;
}

export interface ParentescoOption {
  tipo_relacion_id: number;
  descripcion: string;
}

export interface TiposValorResult {
  success: boolean;
  data: TipoValorOption[];
  error?: string;
}

export interface NotificadoresResult {
  success: boolean;
  data: NotificadorOption[];
  error?: string;
}

export interface ParentescosResult {
  success: boolean;
  data: ParentescoOption[];
  error?: string;
}

export interface GrabarCargoResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ValidarValorFilters {
  id_valor: string;
  num_valor: string;
  ano_valor?: number;
}

export interface ValidarValorResult {
  success: boolean;
  data: Record<string, unknown>[];
  error?: string;
}

/** Payload completo para registrar un cargo de notificación (SP @busc=2). */
export interface GrabarCargoPayload {
  codigo?: string;
  id_valor?: string;
  num_valor?: string;
  ano_valor?: number;
  num_cargo?: string;
  ano_cargo?: number;
  id_notificador?: number;
  monto?: number;
  c_fachada?: string;
  flg_situacion?: string;
  nro_visita?: string;
  f_visita1?: string;
  f_visita2?: string;
  h_visita1?: string;
  h_visita2?: string;
  f_notifica?: string;
  id_parentesco?: number;
  parentesco_detalle?: string;
  nombre?: string;
  nro_documento?: string;
  id_firma?: number;
  direc_fiscal?: string;
  n_suministro?: string;
  observacion?: string;
  otros?: string;
  fvencimiento?: string;
  n_pisos?: number;
  derivar_drft?: string;
  estado?: string;
  ruta1?: string;
  imagen1?: string;
  ruta2?: string;
  imagen2?: string;
}

const BASE = "/notificaciones/cargos-notificaciones";

// ── Shared POST helper ─────────────────────────────────────

async function postCargo(
  path: string,
  body: unknown,
): Promise<GrabarCargoResult> {
  try {
    const response = await authFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
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

// ── Server Actions ─────────────────────────────────────────

export async function listarTiposValorAction(): Promise<TiposValorResult> {
  try {
    const response = await authFetch(`${BASE}/tipos-valor`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, data: [], error: text || `Error ${response.status}` };
    }
    const json = await response.json();
    if (!json.success) {
      return { success: false, data: [], error: json.error ?? "Error al listar tipos de valor" };
    }
    return { success: true, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}

export async function listarNotificadoresAction(): Promise<NotificadoresResult> {
  try {
    const response = await authFetch(`${BASE}/notificadores`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, data: [], error: text || `Error ${response.status}` };
    }
    const json = await response.json();
    if (!json.success) {
      return { success: false, data: [], error: json.error ?? "Error al listar notificadores" };
    }
    return { success: true, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}

export async function validarValorAction(
  filters: ValidarValorFilters,
): Promise<ValidarValorResult> {
  try {
    const response = await authFetch(`${BASE}/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_valor: filters.id_valor,
        num_valor: filters.num_valor,
        ano_valor: filters.ano_valor,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, data: [], error: text || `Error ${response.status}` };
    }
    const json = await response.json();
    if (!json.success) {
      return { success: false, data: [], error: json.error ?? "Error al validar el valor" };
    }
    return { success: true, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}

export async function listarTributosAction(
  filters: ValidarValorFilters,
): Promise<ValidarValorResult> {
  try {
    const response = await authFetch(`${BASE}/tributos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_valor: filters.id_valor,
        num_valor: filters.num_valor,
        ano_valor: filters.ano_valor,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, data: [], error: text || `Error ${response.status}` };
    }
    const json = await response.json();
    if (!json.success) {
      return { success: false, data: [], error: json.error ?? "Error al consultar los tributos" };
    }
    return { success: true, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}

export async function grabarCargoAction(
  payload: GrabarCargoPayload,
): Promise<GrabarCargoResult> {
  return postCargo(`${BASE}/grabar`, payload);
}

export async function listarParentescosAction(): Promise<ParentescosResult> {
  try {
    const response = await authFetch(`${BASE}/parentescos`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, data: [], error: text || `Error ${response.status}` };
    }
    const json = await response.json();
    if (!json.success) {
      return { success: false, data: [], error: json.error ?? "Error al listar parentescos" };
    }
    return { success: true, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}
