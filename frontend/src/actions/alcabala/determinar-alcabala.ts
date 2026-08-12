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

// ─── Search Predio (buscar=3) ──────────────────────────────

export interface PredioItem {
  codigo: string;
  nombres: string;
  codPred: string;
  porcenPropiedad: number;
  numDoc: string;
  direccFiscal: string;
  direccionPredio: string;
  anexo: string;
  subAnexo: string;
  totalAutoavaluo: number;
  tipoPred: string;
  anno: string;
  row: number;
}

export interface PredioSearchResult {
  success: boolean;
  data: PredioItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export async function searchPredioAction(
  codigo?: string,
  anio?: string,
  tipoBusqueda: string = "c",
  codPred?: string,
  page: number = 1,
  pageSize: number = 15,
): Promise<PredioSearchResult> {
  try {
    const params = new URLSearchParams({
      tipoBusqueda,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (codigo) params.set("codigo", codigo);
    if (anio) params.set("anio", anio);
    if (codPred) params.set("codpred", codPred);
    const response = await authFetch(`/alcabala/determinar-alcabala/buscar-predio?${params}`);

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

// ─── Get Tipo de Cambio (SUNAT) by contract date ──────────

export interface TipoCambioResult {
  success: boolean;
  venta?: string;
  error?: string;
}

export async function getTipoCambioAction(fecha: string): Promise<TipoCambioResult> {
  try {
    const response = await authFetch('/alcabala/determinar-alcabala/tipo-cambio', {
      method: 'POST',
      body: JSON.stringify({ fecha }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

// ─── Get UIT by year (buscar=1) ───────────────────────────

export interface UitResult {
  success: boolean;
  uit: string;
  error?: string;
}

export async function getUitAction(anio: string): Promise<UitResult> {
  try {
    const response = await authFetch(
      `/alcabala/determinar-alcabala/uit/${encodeURIComponent(anio)}`,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        uit: '',
        error: errorData.error ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      uit: '',
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}