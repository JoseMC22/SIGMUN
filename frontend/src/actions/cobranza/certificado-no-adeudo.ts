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
  message?: string;
  error?: string;
  code?: "DEUDA";
  montoDeuda?: number;
  estado?: "REGISTRADO";
}

interface AccionEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const ERROR_CONEXION = "Error de conexion con el servidor";

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

export interface CertificadoRow {
  idTbl: string;
  idRecibo: string;
  codigo: string;
  certNro: string;
  certAnio: string;
  tipoDeuda: string;
  tipoDeudaDescripcion: string;
  tipoPeriodo: string;
  tipoPeriodoDescripcion: string;
  observacion: string;
  cantImpresion: string;
  impresion: string;
  fechaImpresion: string;
  estado: string;
  estImprime: string;
  numCertif: string;
}

export interface CertificadoDetalle {
  idTbl: string;
  idRecibo: string;
  codigo: string;
  certNro: string;
  certAnio: string;
  tipoDeuda: string;
  tipoPeriodo: string;
  observacion: string;
  cantImpresion: string;
  impresion: string;
  fechaImpresion: string;
  estado: string;
  anioDeuda: string;
  numCertif: string;
}

export interface ContribuyenteHeader {
  codigo: string;
  nombres: string;
  numDoc: string;
  direccion: string;
}

export interface TipoDeudaRow {
  tipo: string;
  detalle: string;
}

export interface TipoPeriodoRow {
  idTbl: number;
  detalle: string;
}

export interface DetalleRow {
  codigo: string;
  anio: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  anexos: string;
  direccion: string;
  detalles: string;
  tipo: string;
  areaTerreno: number;
  porcenPropiedad: number;
  totalAutoavaluo: number;
  chekeado: string;
}

function toAccionEnvelope<T>(json: Envelope<T>): AccionEnvelope<T> {
  const success = json.success ?? false;
  const result: AccionEnvelope<T> = { success };
  if (success && json.data !== undefined) result.data = json.data;
  if (json.error) result.error = json.error;
  return result;
}

export async function getCertificadosAction(
  codigo: string,
): Promise<AccionEnvelope<CertificadoRow[]>> {
  try {
    const json = await postJson<CertificadoRow[]>("/certificados", { codigo });
    return toAccionEnvelope(json);
  } catch {
    return { success: false, error: ERROR_CONEXION };
  }
}

export async function getDetalleCertificadoAction(
  certNro: string | number,
  certAnio: string,
): Promise<AccionEnvelope<CertificadoDetalle>> {
  try {
    const json = await postJson<CertificadoDetalle>("/detalle", {
      certNro: Number(certNro),
      certAnio,
    });
    return toAccionEnvelope(json);
  } catch {
    return { success: false, error: ERROR_CONEXION };
  }
}

export async function getContribuyenteAction(
  codigo: string,
): Promise<AccionEnvelope<ContribuyenteHeader>> {
  try {
    const json = await postJson<ContribuyenteHeader>("/contribuyente", {
      codigo,
    });
    return toAccionEnvelope(json);
  } catch {
    return { success: false, error: ERROR_CONEXION };
  }
}

export async function getTiposDeudaAction(): Promise<
  AccionEnvelope<TipoDeudaRow[]>
> {
  try {
    const json = await postJson<TipoDeudaRow[]>("/tipos-deuda", {});
    return toAccionEnvelope(json);
  } catch {
    return { success: false, error: ERROR_CONEXION };
  }
}

export async function getTiposPeriodoAction(): Promise<
  AccionEnvelope<TipoPeriodoRow[]>
> {
  try {
    const json = await postJson<TipoPeriodoRow[]>("/tipos-periodo", {});
    return toAccionEnvelope(json);
  } catch {
    return { success: false, error: ERROR_CONEXION };
  }
}

export async function getAniosDeudaAction(): Promise<
  AccionEnvelope<string[]>
> {
  try {
    const json = await postJson<string[]>("/anios-deuda", {});
    return toAccionEnvelope(json);
  } catch {
    return { success: false, error: ERROR_CONEXION };
  }
}
