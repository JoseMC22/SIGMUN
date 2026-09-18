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
  /** true = el valor ya tiene cargo registrado => SP @busc=6 (update). */
  actualizar?: boolean;
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

export async function detalleCargoAction(
  filters: ValidarValorFilters,
): Promise<ValidarValorResult> {
  try {
    const response = await authFetch(`${BASE}/detalle`, {
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
      return { success: false, data: [], error: json.error ?? "Error al consultar el cargo" };
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

/** Mirrors the backend SubirCargoResult shape (backend returns ruta). */
export interface SubirCargoResult {
  success: boolean;
  message?: string;
  error?: string;
  filename?: string;
  ruta?: string;
}

/**
 * Sube el archivo del cargo de notificación al NAS (multipart).
 * El FormData debe incluir:
 *  - file: Blob (PDF/JPG/PNG, máx. 10 MB — keep in sync con
 *    NAS_UPLOAD_MAX_BYTES del backend)
 *  - cargo: string JSON del GrabarCargoPayload
 *  - id_acceso: módulo del submenú (lo valida ObjectAccessGuard)
 */
export async function subirCargoNotificacionAction(
  formData: FormData,
): Promise<SubirCargoResult> {
  try {
    // React serializa los campos del FormData del argumento con prefijos de
    // índice ("_1_file", "_1_cargo", "_1_id_acceso") en el viaje
    // navegador → server action, y el objeto reenviado conserva esos
    // prefijos. Reconstruimos el multipart con los nombres canónicos que
    // espera el backend (file, cargo, id_acceso) antes del fetch.
    const body = new FormData();
    for (const [key, value] of formData.entries()) {
      body.append(key.replace(/^_\d+_/, ""), value);
    }
    // ObjectAccessGuard corre ANTES que multer: en multipart, request.body está
    // vacío cuando el guard lee id_acceso. Por eso el módulo viaja también como
    // header x-id-acceso (los headers existen antes del parsing del body).
    const idAcceso = body.get("id_acceso")?.toString() ?? "";
    const response = await authFetch(`${BASE}/subir-cargo`, {
      method: "POST",
      body,
      headers: idAcceso ? { "x-id-acceso": idAcceso } : undefined,
      cache: "no-store",
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      if (response.status === 413) {
        // keep in sync con NAS_UPLOAD_MAX_BYTES del backend (10 MB)
        return { success: false, error: "El archivo supera el tamaño máximo de 10 MB" };
      }
      return { success: false, error: json?.error ?? `Error ${response.status}` };
    }
    return {
      success: true,
      message: json.message,
      filename: json.filename,
      ruta: json.ruta,
    };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
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
