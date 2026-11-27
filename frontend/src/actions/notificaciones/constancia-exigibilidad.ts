"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const BASE = "/notificaciones/constancia-exigibilidad";

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

// ─── Contrato backend ───────────────────────────────────────────────────────

export interface TipoValorOption {
  id_valor: string;
  nomb_val: string;
}

export interface ValidarConstanciaExigibilidadData {
  administrado: string;
  fecVal: string | null;
  monto: number;
  cargo: string;
  fNotifica: string | null;
  nroExigibilidad: string;
  fExigibilidad: string | null;
  codigo: string;
  idValor: string;
  anoVal: string;
  numVal: string;
  canGenerate: boolean;
  canPrint: boolean;
  message: string;
}

export interface EmitirConstanciaExigibilidadData {
  numexig: string;
  anoexig: string;
}

export interface ImpresionConstanciaExigibilidadData {
  nombre: string;
  constancia: string;
  valor: string;
  fnotifica: string | null;
  cargo: string;
}

export interface ConstanciaExigibilidadFilters {
  tipoValor: string;
  anio: number;
  numero: string;
}

/** Envelope canónico de la familia `notificaciones`. */
export interface ConstanciaExigibilidadEnvelope<T> {
  success: boolean;
  data: T[];
  total: number;
  error?: string;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return `Error ${response.status}`;
  try {
    const json = JSON.parse(text) as { error?: string; message?: string };
    return json.error ?? json.message ?? text;
  } catch {
    return text;
  }
}

async function getEnvelope<T>(
  path: string,
): Promise<ConstanciaExigibilidadEnvelope<T>> {
  try {
    const response = await authFetch(`${BASE}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return {
        success: false,
        data: [],
        total: 0,
        error: await readError(response),
      };
    }
    const json = (await response.json()) as Partial<
      ConstanciaExigibilidadEnvelope<T>
    >;
    return {
      success: json.success === true,
      data: Array.isArray(json.data) ? json.data : [],
      total: typeof json.total === "number" ? json.total : 0,
      ...(json.error ? { error: json.error } : {}),
    };
  } catch {
    return {
      success: false,
      data: [],
      total: 0,
      error: "Error de conexión con el servidor",
    };
  }
}

async function postEnvelope<T>(
  path: string,
  body: unknown,
): Promise<ConstanciaExigibilidadEnvelope<T>> {
  try {
    const response = await authFetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        success: false,
        data: [],
        total: 0,
        error: await readError(response),
      };
    }
    const json = (await response.json()) as Partial<
      ConstanciaExigibilidadEnvelope<T>
    >;
    return {
      success: json.success === true,
      data: Array.isArray(json.data) ? json.data : [],
      total: typeof json.total === "number" ? json.total : 0,
      ...(json.error ? { error: json.error } : {}),
    };
  } catch {
    return {
      success: false,
      data: [],
      total: 0,
      error: "Error de conexión con el servidor",
    };
  }
}

// ─── Actions ────────────────────────────────────────────────────────────────

/** Combo Tipo Valor (S1): `Contenedor.TblTipo_valor` del año en curso. */
export async function listTiposValorAction(): Promise<
  ConstanciaExigibilidadEnvelope<TipoValorOption>
> {
  return getEnvelope<TipoValorOption>("/tipos-valor");
}

/** Validar (S2–S6): `@opcion=2` — estado inline, fechas null-safe. */
export async function validarConstanciaExigibilidadAction(
  filters: ConstanciaExigibilidadFilters,
): Promise<ConstanciaExigibilidadEnvelope<ValidarConstanciaExigibilidadData>> {
  return postEnvelope<ValidarConstanciaExigibilidadData>("/validar", {
    tipoValor: filters.tipoValor,
    anio: filters.anio,
    numero: filters.numero,
  });
}

/** Generar/Grabar (S7): `@opcion=3` — `numexig` lo auto-genera el SP. */
export async function emitirConstanciaExigibilidadAction(
  filters: ConstanciaExigibilidadFilters,
): Promise<ConstanciaExigibilidadEnvelope<EmitirConstanciaExigibilidadData>> {
  return postEnvelope<EmitirConstanciaExigibilidadData>("/emitir", {
    tipoValor: filters.tipoValor,
    anio: filters.anio,
    numero: filters.numero,
  });
}

/** Imprimir (S8): `@opcion=4` — params `NUMEXIG` y `ANOEXIG` únicamente. */
export async function imprimirConstanciaExigibilidadAction(params: {
  numexig: string;
  anoexig: string;
}): Promise<ConstanciaExigibilidadEnvelope<ImpresionConstanciaExigibilidadData>> {
  return postEnvelope<ImpresionConstanciaExigibilidadData>("/impresion", {
    numexig: params.numexig,
    anoexig: params.anoexig,
  });
}

/** Lee `PlantillaConstanciaExigibilidad.html` (S8) desde el disco. */
export async function obtenerPlantillaConstanciaExigibilidadAction(): Promise<
  | { success: true; data: { html: string } }
  | { success: false; error: string }
> {
  try {
    const filePath = path.join(
      process.cwd(),
      "src/app/dashboard/notificaciones/constancia-exigibilidad/PlantillaConstanciaExigibilidad.html",
    );
    const html = await readFile(filePath, "utf8");
    return { success: true, data: { html } };
  } catch (error) {
    console.error(
      "[ConstanciaExigibilidad] Error leyendo plantilla:",
      error,
    );
    return {
      success: false,
      error: "No se pudo cargar la plantilla de la constancia.",
    };
  }
}
