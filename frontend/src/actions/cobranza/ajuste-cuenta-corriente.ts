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

// Tipos de la imputación de monto (botón "Imputar Monto")

/**
 * Recibo seleccionado de la grilla del Estado de Cuenta con las claves
 * EXACTAS que consumía el legacy sp_Compensarrecibosjson (@dataxml): el
 * PHP armaba este array desde las filas marcadas y lo mandaba como JSON.
 */
export interface ReciboCompensarItem {
  idrecibo: string | number;
  codigo: string | number;
  anno: string | number;
  cod_pred: string | number;
  anexo: string | number;
  sub_anexo: string | number;
  tipo: string | number;
  tipo_rec: string | number;
  periodo: string | number;
  imp_insol: string | number;
  fact_reaj: string | number;
  imp_reaj: string | number;
  fact_mora: string | number;
  imp_mora: string | number;
  costo_emis: string | number;
  estado: string | number;
  ubica: string | number;
  fec_venc: string | number;
  fec_pago: string | number;
  num_ingr: string | number;
  fech_ing: string | number;
  montotal: string | number;
}

/** Payload del POST /imputar-monto: el backend deriva la estación de la IP. */
export interface ImputarMontoPayload {
  codigo: string;
  nroDocSustento: string;
  docSustento: string;
  tipoDocSustento: string;
  /** "Total a Ajustar" (legacy txtMontoajustar → @montoacuenta). */
  montoAjustar: number;
  /** Total de las filas seleccionadas (legacy txt_total → @monto). */
  montoTotal: number;
  operador: string;
  recibos: ReciboCompensarItem[];
}

export interface ImputarMontoResult {
  success: boolean;
  error?: string;
}

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

/**
 * Imputación de monto del ajuste de cuenta corriente
 * (POST /cobranza/ajuste-cuenta-corriente/imputar-monto →
 * Rentas.sp_Compensarrecibosjson). El backend arma la estación con el
 * primer octeto de la IP del cliente; acá solo viaja el formulario y los
 * recibos seleccionados.
 */
export async function imputarMontoAction(
  payload: ImputarMontoPayload,
): Promise<ImputarMontoResult> {
  try {
    const response = await authFetch(`${BASE}/imputar-monto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        error:
          json.error ?? "No se pudo registrar la imputación.",
      };
    }
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Error de conexión con el servidor",
    };
  }
}
