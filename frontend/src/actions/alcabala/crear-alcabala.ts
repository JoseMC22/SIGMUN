"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ─── Types ─────────────────────────────────────────────────

export interface CrearAlcabalaDto {
  codigoCompra: string;
  nombres: string;
  numDoc: string;
  direccFiscal?: string;
  codigoVenta?: string;
  nombres1?: string;
  numDoc1?: string;
  direccFiscal1?: string;
  codPred: string;
  anioPred: string;
  tipoPred?: string;
  direccionPredio?: string;
  fechaContrato?: string;
  contrato?: string;
  transferencia?: string;
  observacion?: string;
  montoInafecto: number;
  montoAfecto: number;
  montoAlcabala: number;
  autoavaluo?: number;
  anexo?: string;
  subAnexo?: string;
}

export interface CrearAlcabalaResult {
  success: boolean;
  idAlcabala?: number;
  error?: string;
}

// ─── Helper ─────────────────────────────────────────────────

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ─── Action ─────────────────────────────────────────────────

export async function crearAlcabalaAction(
  dto: CrearAlcabalaDto,
): Promise<CrearAlcabalaResult> {
  try {
    const response = await authFetch("/alcabala/determinar-alcabala/crear", {
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
