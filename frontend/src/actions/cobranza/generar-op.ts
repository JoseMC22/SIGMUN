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

// Tipos para el listado de contribuyentes de "Generar Orden de Pago".
//
// Es el mismo contrato que anular-valor porque el origen de datos es el mismo
// SP (Rentas.sp_Mcontribuyente, @busc=6 COUNT + @busc=5 página). Cuando
// generar-op tenga su propio módulo backend, este archivo es el único que
// cambia: la página consume solo estas funciones.

export interface GenerarOpRow {
  [key: string]: string | number | null; // dynamic columns from the SP
}

export interface GenerarOpResult {
  success: boolean;
  data: GenerarOpRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export type TipoBusqueda = "C" | "N" | "R" | "D";

export interface GenerarOpFilters {
  tipo: TipoBusqueda;
  codigo?: string;
  paterno?: string;
  materno?: string;
  nombres?: string;
  razon?: string;
  numDoc?: string;
}

// Endpoint compartido: todavía no existe /cobranza/generar-op en el backend.
const BASE = "/cobranza/anular-valor";

// Server Action

export async function searchGenerarOpAction(
  filters: GenerarOpFilters,
  page: number = 1,
  pageSize: number = 15,
): Promise<GenerarOpResult> {
  try {
    const response = await authFetch(`${BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        pageSize,
        // Las claves del body son el contrato del DTO. El backend descarta
        // claves desconocidas en silencio: mandarlas mal devolvería todo sin
        // avisar. Solo viaja lleno lo del criterio elegido.
        TipoBusqueda: filters.tipo,
        Codigo: filters.codigo ?? "",
        Paterno: filters.paterno ?? "",
        Materno: filters.materno ?? "",
        Nombres: filters.nombres ?? "",
        Razon: filters.razon ?? "",
        NumDoc: filters.numDoc ?? "",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: json.error ?? "Error al consultar los contribuyentes",
      };
    }
    return {
      success: true,
      data: json.data ?? [],
      total: json.total ?? 0,
      page: json.page ?? page,
      pageSize: json.pageSize ?? pageSize,
      totalPages: json.totalPages ?? 0,
    };
  } catch {
    return {
      success: false,
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      error: "Error de conexión con el servidor",
    };
  }
}

// Proyección de estado de cuenta. El backend elige el SP según el tributo:
// predial (sp_EstCta_Rentasop_proyectado) o vehicular
// (sp_EstCta_Rentasopveh_proyectado). El frontend arma @annos y @perio con
// op-params.ts; el backend solo parsea y enruta.

export type ProcesarOpRow = Record<string, string | number | null>;

export interface ProcesarOpResult {
  success: boolean;
  data: ProcesarOpRow[];
  total: number;
  error?: string;
  /** Mensaje crudo del motor SQL. El backend solo lo envía fuera de producción. */
  detail?: string;
}

export interface ProcesarOpPayload {
  codigo: string;
  fechaProyectada: string;
  annos: string;
  perio: string;
  /** Tributo: el backend elige el SP predial o el vehicular. */
  tipo: "predial" | "vehicular";
}

export async function procesarGenerarOpAction(
  payload: ProcesarOpPayload,
): Promise<ProcesarOpResult> {
  try {
    const response = await authFetch("/cobranza/generar-op/procesar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Tipos y Predio no tienen fuente en la interfaz: viajan vacíos para no
      // inventar filtros.
      body: JSON.stringify({
        Codigo: payload.codigo,
        Tipo: payload.tipo,
        Annos: payload.annos,
        Tipos: "",
        // @estado viaja crudo dentro del SQL dinámico del SP (no se
        // entrecomilla): vacío lo rompe con "syntax near 'and'". '0' es
        // pendiente, el default de la familia sp_EstCta_Rentas*.
        Estado: "0",
        Perio: payload.perio,
        Predio: "",
        FechaProyectada: payload.fechaProyectada,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        data: [],
        total: 0,
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        data: [],
        total: 0,
        error: json.error ?? "Error al procesar la orden de pago",
        detail: json.detail,
      };
    }
    return {
      success: true,
      data: json.data ?? [],
      total: json.total ?? 0,
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

// Generación real de la OP. El backend re-proyecta server-side con estos
// mismos filtros y llama a Rentas.sp_Genera_OP / sp_Genera_OPVEH; el cliente
// nunca manda el nombre del SP ni los importes.

export interface GenerarOpPayload {
  codigo: string;
  nombre: string;
  dirFiscal: string;
  numDoc: string;
  fechaProyectada: string; // DD/MM/YYYY
  annos: string;
  perio: string;
  tipo: "predial" | "vehicular";
  /** Recibos de la proyección que entran en esta OP (una OP por año). */
  idRecibos: number[];
}

export interface GenerarOpActionResult {
  success: boolean;
  id_valor?: string;
  num_val?: string;
  ano_val?: string;
  total?: number;
  error?: string;
  detail?: string;
}

export async function generarGenerarOpAction(
  payload: GenerarOpPayload,
): Promise<GenerarOpActionResult> {
  try {
    const response = await authFetch("/cobranza/generar-op/generar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Codigo: payload.codigo,
        Tipo: payload.tipo,
        Annos: payload.annos,
        Perio: payload.perio,
        Estado: "0",
        FechaProyectada: payload.fechaProyectada,
        Nombre: payload.nombre,
        DirFiscal: payload.dirFiscal,
        NumDoc: payload.numDoc,
        Tipos: "",
        Predio: "",
        IdUsuario: "",
        Operador: "",
        Estacion: "WEB",
        IdRecibos: payload.idRecibos,
      }),
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
        error: json.error ?? "Error al generar la orden de pago",
        detail: json.detail,
      };
    }
    return {
      success: true,
      id_valor: json.id_valor,
      num_val: json.num_val,
      ano_val: json.ano_val,
      total: json.total ?? 0,
    };
  } catch {
    return {
      success: false,
      error: "Error de conexión con el servidor",
    };
  }
}

/**
 * Descarga el PDF de una OP ya generada como base64.
 * Devuelve null si el backend responde con error o la petición falla.
 */
export async function getGenerarOpPdfAction(
  idValor: string,
  numVal: string,
  anoVal: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({ idValor, numVal, anoVal });
    const response = await authFetch(
      `/cobranza/generar-op/pdf?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString("base64");
  } catch {
    return null;
  }
}
