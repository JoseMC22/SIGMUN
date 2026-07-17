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

export interface ConsultaRDFilters {
  codigo?: string;
  contribuyente?: string;
  estado?: string;
}

export interface ConsultaRDRow {
  ROW: number;
  codigo: string;
  nombre: string;
  nomb_val: string;
  num_val: string;
  ano_val: number;
  MontoTotal: number;
  fec_val: string;
  estado: string;
  fpago: string;
  recibo: string;
}

export interface ConsultaRDResult {
  success: boolean;
  data: ConsultaRDRow[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export interface DetalleRDRow {
  concepto: string;
  base: number;
  monto: number;
  observaciones: string;
  fecha: string;
  [key: string]: any;
}

export interface DetalleRDResult {
  success: boolean;
  nombre: string;
  nomb_val: string;
  num_val: string;
  ano_val: number;
  data: DetalleRDRow[];
  error?: string;
}

// ─── Server Actions ────────────────────────────────────────

export async function searchConsultaRDAction(
  filters: ConsultaRDFilters,
  page: number,
  pageSize: number,
): Promise<ConsultaRDResult> {
  try {
    const params = new URLSearchParams();
    if (filters.codigo) params.set("codigo", filters.codigo);
    if (filters.contribuyente) params.set("contribuyente", filters.contribuyente);
    if (filters.estado) params.set("estado", filters.estado);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const response = await authFetch(
      `/alcabala/consulta-rd?${params.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: text || "Error al consultar registro de deuda",
      };
    }

    const json = await response.json();
    return {
      success: true,
      data: json.data ?? [],
      total: json.total ?? 0,
      page: json.page ?? page,
      totalPages: json.totalPages ?? 0,
    };
  } catch {
    return {
      success: false,
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
      error: "Error de conexión con el servidor",
    };
  }
}

export async function getDetailConsultaRDAction(params: {
  id_valor?: string;
  num_val: string;
  ano_val: string;
  nombre?: string;
  nomb_val?: string;
}): Promise<DetalleRDResult> {
  try {
    const query = new URLSearchParams();
    if (params.id_valor) query.set("id_valor", params.id_valor);
    query.set("num_val", params.num_val);
    query.set("ano_val", params.ano_val);
    if (params.nombre) query.set("nombre", params.nombre);
    if (params.nomb_val) query.set("nomb_val", params.nomb_val);

    const response = await authFetch(
      `/alcabala/consulta-rd/detail?${query.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        nombre: params.nombre || "",
        nomb_val: params.nomb_val || "",
        num_val: params.num_val,
        ano_val: Number(params.ano_val) || 0,
        data: [],
        error: text || "Error al consultar detalle del RD",
      };
    }

    const json = await response.json();
    return {
      success: json.success ?? false,
      nombre: json.nombre ?? params.nombre ?? "",
      nomb_val: json.nomb_val ?? params.nomb_val ?? "",
      num_val: json.num_val ?? params.num_val,
      ano_val: json.ano_val ?? Number(params.ano_val) ?? 0,
      data: json.data ?? [],
      error: json.error,
    };
  } catch {
    return {
      success: false,
      nombre: params.nombre || "",
      nomb_val: params.nomb_val || "",
      num_val: params.num_val,
      ano_val: Number(params.ano_val) || 0,
      data: [],
      error: "Error de conexión con el servidor",
    };
  }
}
