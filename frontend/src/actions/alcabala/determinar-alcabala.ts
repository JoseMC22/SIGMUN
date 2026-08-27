"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = 'SIGMUN_AUTH';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers['Cookie'] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ─── Search Contribuyente ─────────────────────────────────

export interface ContribuyenteItem {
  codigo: string;
  paterno: string;
  materno: string;
  nombres: string;
  numDoc: string;
  direccion: string;
  row: number;
}

export interface ContribuyenteSearchResult {
  success: boolean;
  data: ContribuyenteItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export async function searchContribuyenteAction(
  tipoBusqueda: string,
  busqueda?: string,
  paterno?: string,
  materno?: string,
  nombres?: string,
  page: number = 1,
  pageSize: number = 15,
): Promise<ContribuyenteSearchResult> {
  try {
    const params = new URLSearchParams({
      tipoBusqueda,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (tipoBusqueda === "N") {
      params.set("paterno", paterno ?? "");
      params.set("materno", materno ?? "");
      params.set("nombres", nombres ?? "");
    } else if (busqueda) {
      params.set("busqueda", busqueda);
    }
    const response = await authFetch(`/alcabala/determinar-alcabala/buscar-contribuyente?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: errorData.error ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

// ─── Get Alcabalas by Contribuyente ────────────────────────

export interface AlcabalaItem {
  idAlcabala: number;
  fechaRegistro: string;
  montoAlcabala: number;
  codPred: string;
  anioPred: string;
  codigoVenta: string;
  estado: string;
  /** Receipt id used by the baja (dar de baja) flow. */
  idRecibo?: string;
}

export interface AlcabalasResult {
  success: boolean;
  data: AlcabalaItem[];
  error?: string;
}

export async function getAlcabalasAction(
  codigo: string,
): Promise<AlcabalasResult> {
  try {
    const response = await authFetch(`/alcabala/determinar-alcabala/alcabalas/${encodeURIComponent(codigo)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: [],
        error: errorData.error ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

// ─── Dar de baja (Baja) Alcabala ─────────────────────────

export interface BajaAlcabalaDto {
  codigo: string;
  idAlcabala: number;
  idrecibo: number;
  observacion: string;
}

export interface BajaAlcabalaResult {
  success: boolean;
  error?: string;
}

export async function bajaAlcabalaAction(
  dto: BajaAlcabalaDto,
): Promise<BajaAlcabalaResult> {
  try {
    const response = await authFetch("/alcabala/determinar-alcabala/baja", {
      method: "POST",
      body: JSON.stringify(dto),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error ?? `Error ${response.status}`,
      };
    }

    return result;
  } catch {
    return {
      success: false,
      error: "Error de conexión",
    };
  }
}

// ─── Search Predios (Buscar Predio) ──────────────────────

export interface PredioItem {
  codigo: string;
  nombres: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  porcenPropiedad: string;
  predial: string;
  totalAutoavaluo: string;
  tipoPred: string;
  anno: string;
  valTerreno: string;
}

export interface PredioSearchResult {
  success: boolean;
  data: PredioItem[];
  error?: string;
}

export async function searchPrediosAction(
  codigo: string,      // comprador code (always sent)
  anio: string,         // year (always sent)
  tipoBusqueda: string, // 'c' | 'n' | 'd' | 'r'
  options?: {
    codPred?: string;      // for tipoBusqueda='c'
    paterno?: string;      // for tipoBusqueda='n'
    materno?: string;      // for tipoBusqueda='n'
    nombres?: string;      // for tipoBusqueda='n'
    numDoc?: string;       // for tipoBusqueda='d'
    razon?: string;        // for tipoBusqueda='r'
  },
): Promise<PredioSearchResult> {
  try {
    const params: Record<string, string> = {
      codigo,
      anio,
      tipoBusqueda,
      // Always send empty defaults for unused params
      codpred: options?.codPred ?? '',
      nombres: options?.nombres ?? '',
      paterno: options?.paterno ?? '',
      materno: options?.materno ?? '',
      num_doc: options?.numDoc ?? '',
      razon: options?.razon ?? '',
    };
    const response = await authFetch(
      `/alcabala/determinar-alcabala/predios?${new URLSearchParams(params)}`,
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, data: [], error: errorData.error ?? `Error ${response.status}` };
    }
    return await response.json();
  } catch (error) {
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ─── Get UIT (valor de la UIT por año) ────────────────────

export interface GetUitResult {
  success: boolean;
  valorUit?: number;
  error?: string;
}

export async function getUitAction(
  anno: string,
): Promise<GetUitResult> {
  try {
    const response = await authFetch(
      `/mantenimiento-tablas/mantenimiento-uit?anno=${encodeURIComponent(anno)}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: "No se encontró la UIT para el año",
        };
      }
      return {
        success: false,
        error: "Error al obtener la UIT",
      };
    }

    const result = await response.json();
    const data = result?.data;
    if (Array.isArray(data) && data.length > 0) {
      return { success: true, valorUit: data[0].valor_uit };
    }

    // 200 but empty payload → treat as not found; let the caller keep the current value.
    return {
      success: false,
      error: "No se encontró la UIT para el año",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener la UIT",
    };
  }
}

// ─── Get Detalle Alcabala ─────────────────────────────────

export interface DetalleAlcabalaItem {
  codigoCompra: string;
  anio: string;
  nombres: string;
  documento: string;
  numDoc: string;
  direccFiscal: string;
  distrito: string;
  provincia: string;
  departamento: string;
  codigoVenta: string;
  nombres1: string;
  documento1: string;
  numDoc1: string;
  direccFiscal1: string;
  distrito1: string;
  provincia1: string;
  departamento1: string;
  codPred: string;
  anioPred: string;
  fechaContrato: string;
  transferencia: string;
  porcTransferencia: number;
  observacion: string;
  contrato: string;
  montoAlcabala: number;
  autoavaluo: number;
  direccionPredio: string;
  montoInafecto: number;
  montoAfecto: number;
  anexo: string;
  subAnexo: string;
  flagCheck: string;
  observacionFlag: string;
  nombre: string;
  direccion: string;
  dni: string;
  tipodoc: string;
  usuario: string;
  estacion: string;
  fechaIng: string;
  flagInafecto: string;
  tipoPred: string;
}

export interface DetalleAlcabalaResult {
  success: boolean;
  data: DetalleAlcabalaItem | null;
  error?: string;
}

export async function getDetalleAlcabalaAction(
  idAlcabala: number,
): Promise<DetalleAlcabalaResult> {
  try {
    const response = await authFetch(`/alcabala/determinar-alcabala/detalle/${idAlcabala}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: null,
        error: errorData.error ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}