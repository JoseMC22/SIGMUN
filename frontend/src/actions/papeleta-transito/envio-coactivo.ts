"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? "http://localhost:3003/api";

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export interface FiltrosEnvioCoactivo {
  placa?: string;
  propie?: string;
  infrac?: string;
  infracanio?: string;
  conductor?: string;
  dniconduc?: string;
  page?: number;
  limit?: number;
}

export async function consultarInfractorCoacAction(filtros: FiltrosEnvioCoactivo) {
  try {
    console.log("➡️ [Frontend Action] consultarInfractorCoacAction enviando a:", `${API_BASE}/papeleta-transito/envio-a-coactivo/consultar`);

    const res = await authFetch("/papeleta-transito/envio-a-coactivo/consultar", {
      method: "POST",
      body: JSON.stringify(filtros),
      cache: "no-store",
    });

    console.log("⬅️ [Frontend Action] Status:", res.status);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log("❌ [Frontend Action] Error:", err);
      return { success: false, error: err.message || `Error ${res.status}` };
    }

    const data = await res.json();
    console.log("✅ [Frontend Action] Éxito data:", data);
    return { success: true, data };
  } catch (error: any) {
    console.log("💥 [Frontend Action] Catch error:", error);
    return { success: false, error: error.message || "Error de conexión" };
  }
}

export async function buscarEnvioCoactivoAction(ninfrac: string) {
  try {
    const res = await authFetch("/papeleta-transito/envio-a-coactivo/buscar", {
      method: "POST",
      body: JSON.stringify({ ninfrac }),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || "Error al buscar datos de envío" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Error de conexión" };
  }
}

export async function grabarEnvioCoactivoAction(payload: { ninfrac: string; observacion?: string }) {
  try {
    const res = await authFetch("/papeleta-transito/envio-a-coactivo/grabar", {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || "Error al grabar envío a coactivo" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Error de conexión" };
  }
}
