"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface UploadResultFrontend {
  success: boolean;
  cNombreArchivo?: string;
  cRutaArchivo?: string;
  cUrl?: string;
  error?: string;
}

export async function uploadArchivoNasAction(formData: FormData): Promise<UploadResultFrontend> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

    const headers: Record<string, string> = {};
    if (authCookie) {
      headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
    }

    const res = await fetch(`${API_BASE}/storage/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Error al subir el archivo al NAS" }));
      return { success: false, error: err.message || "Error al subir archivo" };
    }

    const data = await res.json();
    return {
      success: true,
      cNombreArchivo: data.cNombreArchivo,
      cRutaArchivo: data.cRutaArchivo,
      cUrl: data.cUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de red al subir archivo";
    return { success: false, error: message };
  }
}
