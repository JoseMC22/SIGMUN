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

const BASE = "/cobranza/certificado-no-adeudo";

export type TipoBusqueda = "C" | "N" | "R" | "D";

export interface ContribuyenteRow {
  codigo: string;
  nombres: string;
  paterno: string;
  materno: string;
  documento: string;
  numDoc: string;
  direccion: string;
}

export interface SearchContribuyenteFilters {
  tipo: TipoBusqueda;
  codigo?: string;
  paterno?: string;
  materno?: string;
  nombres?: string;
  razon?: string;
  numDoc?: string;
}

export interface SearchContribuyenteResult {
  success: boolean;
  data: ContribuyenteRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

interface Envelope<T> {
  success?: boolean;
  data?: T;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

async function postJson<T>(
  path: string,
  body: unknown,
): Promise<Envelope<T>> {
  const response = await authFetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await response.json()) as Envelope<T>;
}

export async function searchContribuyentesAction(
  filters: SearchContribuyenteFilters,
  page = 1,
  pageSize = 15,
): Promise<SearchContribuyenteResult> {
  try {
    const json = await postJson<ContribuyenteRow[]>("/search", {
      page,
      pageSize,
      TipoBusqueda: filters.tipo,
      Codigo: filters.codigo ?? "",
      Paterno: filters.paterno ?? "",
      Materno: filters.materno ?? "",
      Nombres: filters.nombres ?? "",
      Razon: filters.razon ?? "",
      NumDoc: filters.numDoc ?? "",
    });
    return {
      success: json.success ?? false,
      data: json.data ?? [],
      total: json.total ?? 0,
      page: json.page ?? page,
      pageSize: json.pageSize ?? pageSize,
      totalPages: json.totalPages ?? 0,
      error: json.error,
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
