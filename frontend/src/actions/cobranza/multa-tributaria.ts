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

const BASE = "/cobranza/multa-tributaria";

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

export interface ContribuyenteHeader {
  codigo: string;
  nombres: string;
  numDoc: string;
  direccion: string;
}

export interface MultaRow {
  codigo: string;
  nroMulta: string;
  anio: string;
  fecMulta: string;
  motivo: string;
  monto: number;
  estadoMulta: string;
  estadoRecibo: string;
  obligacion: string;
  frac: string;
  idMulta: string;
}

export interface MultasResult {
  success: boolean;
  data: MultaRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

export interface PredioRow {
  codigo: string;
  anno: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  anexos: string;
  direccion: string;
  areaTerreno: number;
  porcenPropiedad: number;
  totalAutoavaluo: number;
  tipo: string;
  flagPredio: string;
}

export interface TributoRow {
  tipo: string;
  tipoRec: string;
  id: string;
  concepto: string;
}

export interface GradualidadRow {
  idTable: number;
  concepto: string;
}

export interface UitRow {
  anno: string;
  valorUit: number;
  impMinimo: number;
  impMaximo: number;
  costoEmis: number;
  costoAdic: number;
}

export interface MultaDetalle {
  codigo: string;
  anno: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  uit: number;
  tributo: string;
  gradualidad: number;
  insoluto: number;
  derechoEmision: number;
  fechaEmision: string;
  fechaVencimiento: string;
  glosa: string;
}

export interface InfraccionRow {
  anno: string;
  tributoConcepto: string;
  gradualidadConcepto: string;
  periodos: string;
  fechaVencimiento: string;
  importe: number;
  emision: number;
  subTotal: number;
  glosa: string;
  fechaRegistro: string;
  tributo: string;
  subTributo: string;
  tipo: string;
}

export interface WriteResult {
  success: boolean;
  message?: string;
  error?: string;
  created?: Array<{ idMulta: number; idRecibo: number }>;
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
  created?: Array<{ idMulta: number; idRecibo: number }>;
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

export async function getContribuyenteAction(
  codigo: string,
): Promise<{ success: boolean; data?: ContribuyenteHeader; error?: string }> {
  try {
    const json = await postJson<ContribuyenteHeader>("/contribuyente", {
      codigo,
    });
    return { success: json.success ?? false, data: json.data, error: json.error };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function getMultasAction(
  codigo: string,
  page = 1,
  pageSize = 10,
): Promise<MultasResult> {
  try {
    const json = await postJson<MultaRow[]>("/multas", {
      codigo,
      page,
      pageSize,
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

export async function getPrediosAction(
  codigo: string,
  anno: string,
): Promise<{ success: boolean; data: PredioRow[]; error?: string }> {
  try {
    const json = await postJson<PredioRow[]>("/predios", { codigo, anno });
    return { success: json.success ?? false, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}

export async function getTributosAction(): Promise<{
  success: boolean;
  data: TributoRow[];
  error?: string;
}> {
  try {
    const json = await postJson<TributoRow[]>("/tributos", {});
    return { success: json.success ?? false, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}

export async function getGradualidadAction(): Promise<{
  success: boolean;
  data: GradualidadRow[];
  error?: string;
}> {
  try {
    const json = await postJson<GradualidadRow[]>("/gradualidad", {});
    return { success: json.success ?? false, data: json.data ?? [] };
  } catch {
    return { success: false, data: [], error: "Error de conexión con el servidor" };
  }
}

export async function getUitAction(
  anno: string,
): Promise<{ success: boolean; data?: UitRow | null; error?: string }> {
  try {
    const json = await postJson<UitRow | null>("/uit", { anno });
    return { success: json.success ?? false, data: json.data ?? null };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function getValorMultaAction(
  anno: string,
): Promise<{ success: boolean; data?: UitRow | null; error?: string }> {
  try {
    const json = await postJson<UitRow | null>("/valor", { anno });
    return { success: json.success ?? false, data: json.data ?? null };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function getDetalleMultaAction(
  codigo: string,
  idMulta: string,
): Promise<{ success: boolean; data?: MultaDetalle | null; error?: string }> {
  try {
    const json = await postJson<MultaDetalle | null>("/detalle", {
      codigo,
      idMulta,
    });
    return { success: json.success ?? false, data: json.data ?? null };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function getInfraccionAction(
  codigo: string,
  anno: string,
  idMulta: string,
): Promise<{ success: boolean; data?: InfraccionRow | null; error?: string }> {
  try {
    const json = await postJson<InfraccionRow | null>("/infraccion", {
      codigo,
      anno,
      idMulta,
    });
    return { success: json.success ?? false, data: json.data ?? null };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export interface GrabarMultaItem {
  tipo: string;
  tipoRec: string;
  periodo: string;
  importeOriginal: number;
  insoluto: number;
  derechoEmision: number;
  glosa: string;
  fechaVencimiento: string;
  gradualidad: number;
}

export interface GrabarMultaInput {
  idMulta?: string;
  codigo: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
  anno: string;
  operador?: string;
  estacion?: string;
  multas: GrabarMultaItem[];
}

export async function grabarMultaAction(
  input: GrabarMultaInput,
): Promise<WriteResult> {
  try {
    const json = await postJson<unknown>("/grabar", input);
    return {
      success: json.success ?? false,
      message: json.message,
      error: json.error,
      created: json.created,
    };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function eliminarMultaAction(
  codigo: string,
  idMulta: string,
): Promise<WriteResult> {
  try {
    const json = await postJson<unknown>("/eliminar", { codigo, idMulta });
    return {
      success: json.success ?? false,
      message: json.message,
      error: json.error,
    };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function getFechaAction(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const response = await authFetch(`${BASE}/fecha`, { cache: "no-store" });
    const json = (await response.json()) as Envelope<string>;
    return { success: json.success ?? false, data: json.data };
  } catch {
    return { success: false, error: "Error de conexión con el servidor" };
  }
}
