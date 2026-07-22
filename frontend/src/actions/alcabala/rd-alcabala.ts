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

// ─── Types ─────────────────────────────────────────────────

export interface ContribuyenteSearchItem {
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
  data: ContribuyenteSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

// Raw SP row (matches backend SpPendienteAlcabalaRow)
export interface SpPendienteAlcabalaRow {
  idrecibo: string;
  codigo: string;
  tipo: string;
  anno: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  tipo_docu: string;
  num_docu: string;
  tipo_rec: string;
  periodo: string;
  imp_insol: number;
  costo_emis: number;
  fact_reaj: number;
  imp_reaj: number;
  fact_mora: number;
  mora: number;
  observacion: string;
  estado: string;
  ubica: string;
  fec_venc: string;
  num_ingr: string;
  operador: string;
  estacion: string;
  fech_ing: string;
  fec_pago: string;
  des_tipo: string;
}

// Frontend domain type (includes ALL raw fields for dataxml)
export interface PendienteAlcabalaItem extends SpPendienteAlcabalaRow {
  // Computed/renamed fields
  tributo: string;
  anio: string;
  predio: string;
  subanexo: string;
  impInsol: number;
  impReaj: number;
  factorMora: number;
  interes: number;
  costoEmis: number;
  total: number;
}

export interface PendienteAlcabalaResult {
  success: boolean;
  data: PendienteAlcabalaItem[];
  total: number;
  error?: string;
}

export interface GenerarRdResult {
  success: boolean;
  message?: string;
  data?: any[];
  error?: string;
}

// ─── Server Actions ────────────────────────────────────────

export async function searchContribuyenteAction(
  filters: {
    tipoBusqueda?: 'C' | 'N' | 'R' | 'D';
    codigo?: string;
    nombres?: string;
    paterno?: string;
    materno?: string;
    razonSocial?: string;
    numDoc?: string;
  },
  page: number,
  pageSize: number,
): Promise<ContribuyenteSearchResult> {
  try {
    const params = new URLSearchParams();
    if (filters.tipoBusqueda) params.set("tipoBusqueda", filters.tipoBusqueda);
    if (filters.codigo) params.set("codigo", filters.codigo);
    if (filters.nombres) params.set("nombres", filters.nombres);
    if (filters.paterno) params.set("paterno", filters.paterno);
    if (filters.materno) params.set("materno", filters.materno);
    if (filters.razonSocial) params.set("razonSocial", filters.razonSocial);
    if (filters.numDoc) params.set("numDoc", filters.numDoc);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const response = await authFetch(
      `/alcabala/rd-alcabala/contribuyentes?${params.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
        error: text || "Error al consultar contribuyentes",
      };
    }

    const json = await response.json();
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
      page: 1,
      pageSize,
      totalPages: 0,
      error: "Error de conexión con el servidor",
    };
  }
}

export async function searchPendientesAction(
  filters: {
    codigo?: string;
    annos?: string;
    tipos?: string;
    tiporec?: string;
    perio?: string;
    predio?: string;
    estado?: string;
    fechaProyectada?: string;
  } = {},
): Promise<PendienteAlcabalaResult> {
  try {
    const params = new URLSearchParams();
    if (filters.codigo) params.set("codigo", filters.codigo);
    if (filters.annos) params.set("annos", filters.annos);
    if (filters.tipos) params.set("tipos", filters.tipos);
    if (filters.tiporec) params.set("tiporec", filters.tiporec);
    if (filters.perio) params.set("perio", filters.perio);
    if (filters.predio) params.set("predio", filters.predio);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.fechaProyectada) params.set("fechaProyectada", filters.fechaProyectada);

    const response = await authFetch(
      `/alcabala/rd-alcabala/pendientes?${params.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        data: [],
        total: 0,
        error: text || "Error al consultar pendientes",
      };
    }

    const json = await response.json();
    return {
      success: true,
      data: json.data ?? [],
      total: json.total ?? 0,
      error: json.error,
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