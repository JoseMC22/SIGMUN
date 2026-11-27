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

// Tipos para el reporte de fraccionamientos detallados (contrato del SP:
// Rentas.Rpt_Rentas_General @BUSC=40 devuelve 13 columnas con casing literal).

export interface FraccDetalladoRow {
  CODIGO?: string | number | null;
  /** Viene en minúscula (alias del SELECT); NO normalizar a Nombre. */
  nombre?: string | number | null;
  ANIO_CTA?: string | number | null;
  CONVENIO?: string | number | null;
  /** Fecha del convenio en dd/mm/yyyy (CONVERT(VARCHAR(20),F_CONVENIO,103)). */
  FECHA?: string | number | null;
  /** Viene en minúscula (alias del SELECT); NO normalizar a Descrip. */
  descrip?: string | number | null;
  IMP_INSOL?: string | number | null;
  NUM_CUOTAS?: string | number | null;
  CUOTAS_PENDIENTES?: string | number | null;
  /** Fuera de la grilla (Decisión 1 del design); el tipo lo conserva igual. */
  T_INSOL_CONVENIO?: string | number | null;
  SALDO?: string | number | null;
  /** Fuera de la grilla: constante fijada por el filtro Anno. */
  ANIO_SALDO?: string | number | null;
  /**
   * Fuera de la grilla. El título del reporte se deriva de los filtros (R6),
   * no de esta columna: queda solo como parte del contrato del SP.
   */
  MES_SALDO?: string | number | null;

  /** Columnas extra del SP sin perder. */
  [key: string]: string | number | null | undefined;
}

export interface FraccDetalladoResult {
  success: boolean;
  data: FraccDetalladoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export interface FraccDetalladoFilters {
  /**
   * LIKE contiene; vacío/undefined = sin acotar. NO se rellena con ceros a la
   * izquierda: un código parcial es una búsqueda válida (Decisión 8).
   */
  codigo?: string;
  /** Igualdad exacta sobre ANIO_SALDO; 4 dígitos. Obligatorio. */
  anno: string;
  /** Igualdad exacta sobre MES_SALDO; 1-12, sin ceros a la izquierda. */
  idMes: number;
}

export interface FraccDetalladoCatalogos {
  success: boolean;
  /** Col anio_saldo (@BUSC=38), DESC. */
  anios: string[];
  /** Cols id_mes, nom_mes (@BUSC=39), ASC. id_mes sin ceros a la izquierda. */
  meses: { id_mes: number; nom_mes: string }[];
  error?: string;
}

const BASE = "/cobranza/reporte-fracc-detallado";

// Server Actions

export async function searchFraccDetalladoAction(
  filters: FraccDetalladoFilters,
  page: number = 1,
  pageSize: number = 15,
): Promise<FraccDetalladoResult> {
  try {
    const response = await authFetch(`${BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        pageSize,
        // Las claves del body son el contrato del DTO: 'Codigo', 'Anno' e
        // 'IdMes' con el casing literal de los parámetros del SP. El backend
        // descarta claves desconocidas en silencio, así que un casing errado
        // ('codigo') devolvería el universo completo sin ningún error visible
        // (trampa documentada en el spec del DTO).
        Codigo: filters.codigo ?? "",
        Anno: filters.anno,
        IdMes: filters.idMes,
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
        error: json.error ?? "Error al consultar el reporte",
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

export async function fetchFraccDetalladoCatalogosAction(
  anno?: string,
): Promise<FraccDetalladoCatalogos> {
  try {
    const response = await authFetch(`${BASE}/catalogos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Anno es opcional: sin Anno el backend devuelve solo los años
      // (@BUSC=38); con Anno agrega los meses de ese año (@BUSC=39). El combo
      // Mes Corte se refresca con esta llamada al cambiar el año (Decisión 5).
      body: JSON.stringify(anno ? { Anno: anno } : {}),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        anios: [],
        meses: [],
        error: text || `Error ${response.status}`,
      };
    }

    const json = await response.json();
    if (!json.success) {
      return {
        success: false,
        anios: [],
        meses: [],
        error: json.error ?? "Error al consultar los catálogos",
      };
    }
    return {
      success: true,
      anios: json.anios ?? [],
      meses: json.meses ?? [],
    };
  } catch {
    return {
      success: false,
      anios: [],
      meses: [],
      error: "Error de conexión con el servidor",
    };
  }
}
