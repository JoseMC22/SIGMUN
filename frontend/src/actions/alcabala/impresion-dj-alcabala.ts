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

/**
 * Fetches the Orden de Pago (OP) PDF of an Alcabala as a base64 string.
 * Returns null when the backend responds with a non-OK status or the request throws.
 */
export async function getOpPdfBase64Action(idAlcabala: number): Promise<string | null> {
  try {
    const response = await authFetch(
      `/alcabala/impresion-dj-alcabala/op-pdf/${encodeURIComponent(String(idAlcabala))}`,
    );
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString('base64');
  } catch {
    return null;
  }
}

/**
 * Fetches the Declaración de Alcabala HTML for in-browser display/printing.
 * Returns null when the backend responds with a non-OK status or the request throws.
 */
export async function getDeclaracionHtmlAction(idAlcabala: number): Promise<string | null> {
  try {
    const response = await authFetch(
      `/alcabala/impresion-dj-alcabala/declaracion-pdf/${encodeURIComponent(String(idAlcabala))}`,
    );
    if (!response.ok) {
      try {
        const errBody = await response.json();
        console.error('[declaracion-pdf] Backend error:', errBody);
      } catch {
        console.error('[declaracion-pdf] HTTP', response.status, response.statusText);
      }
      return null;
    }
    return await response.text();
  } catch (err) {
    console.error('[declaracion-pdf] Fetch exception:', err);
    return null;
  }
}
