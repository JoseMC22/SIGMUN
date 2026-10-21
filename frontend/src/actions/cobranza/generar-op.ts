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
