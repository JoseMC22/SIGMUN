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

// ── Types ─────────────────────────────────────────────────

export interface DjAlcabalaRow {
  id_alcabala: number;
  codigo_compra: string;
  comprador: string;
  comprador_fiscal: string;
  comprador_dni: string;
  codigo_venta: string;
  vendedor: string;
  vendedor_fiscal: string;
  vendedor_dni: string;
  contrato: string;
  direccion_predio: string;
  fecha_contrato: string;
  tipo_Pred: string;
  base_imponible: number;
  transferencia: number;
  autoavaluo: number;
  monto_inafecto: number;
  monto_afecto: number;
  mora: number;
  monto_alcabala: number;
  total_alcabala: number;
  tasa_impuesto: string;
  observacion: string;
  estado: string;
  monto_letras: string;
}

export interface SearchDeAlcabalaParams {
  codigo?: string;
  anio?: number;
  estado?: string;
}

// ── Search De Alcabala ────────────────────────────────────

export async function searchDeAlcabalaAction(
  filters: SearchDeAlcabalaParams,
  page?: number,
  pageSize?: number,
) {
  try {
    const body: Record<string, unknown> = {
      codigo: filters.codigo ?? "",
      anio: filters.anio ?? new Date().getFullYear(),
      estado: filters.estado ?? "",
    };
    if (page !== undefined) body.page = page;
    if (pageSize !== undefined) body.pageSize = pageSize;

    console.log("[DJ-Alcabala] → ENVIANDO:", JSON.stringify(body));

    const response = await authFetch("/alcabala/reporte-de-alcabala/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log("[DJ-Alcabala] ← Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[DJ-Alcabala] ← Error:", errorData);
      return {
        success: false as const,
        error: errorData.message ?? `Error ${response.status}`,
      };
    }

    const result = await response.json();
    console.log("[DJ-Alcabala] ← Result:", JSON.stringify({
      success: true,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      dataCount: result.data?.length ?? 0,
      firstRow: result.data?.[0] ?? null,
    }));
    return { success: true as const, ...result };
  } catch (error) {
    console.error("[DJ-Alcabala] ← Exception:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}