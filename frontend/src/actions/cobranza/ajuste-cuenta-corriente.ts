"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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

// Tipos para el ajuste de cuenta corriente

/** Item del combo de tipos de documento de sustento (id = value, nombre = label). */
export interface TipoDocSustentoItem {
  id: string;
  nombre: string;
}

export interface AjusteTiposDocResult {
  success: boolean;
  data: TipoDocSustentoItem[];
  error?: string;
}

const BASE = "/cobranza/ajuste-cuenta-corriente";

// Server Action

/**
 * Combo de tipos de documento de sustento para el ajuste de cuenta corriente
 * (GET /cobranza/ajuste-cuenta-corriente/tipos-doc-sustento). El backend lee
 * el SP por posición, así que el contrato viaja plano: id/nombre.
 */
export async function getTiposDocSustentoAction(): Promise<AjusteTiposDocResult> {
  try {
    const response = await authFetch(`${BASE}/tipos-doc-sustento`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        data: [],
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        data: [],
        error:
          json.error ??
          "Error al consultar los tipos de documento de sustento",
      };
    }
    return {
      success: true,
      data: json.data ?? [],
    };
  } catch {
    return {
      success: false,
      data: [],
      error: "Error de conexión con el servidor",
    };
  }
}
