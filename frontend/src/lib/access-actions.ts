"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

interface ObjectPermission {
  id_objeto: string;
  bacceso: 0 | 1;
}

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

export async function fetchObjectPermissionsAction(
  id_acceso: string,
): Promise<{ success: boolean; data?: ObjectPermission[]; error?: string }> {
  try {
    const response = await authFetch(
      `/seguridad/object-access/${encodeURIComponent(id_acceso)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error: body.message ?? "Error fetching permissions",
      };
    }
    const body = await response.json();
    return { success: true, data: body.objects };
  } catch (error: any) {
    return { success: false, error: error.message ?? "Unknown error" };
  }
}

export async function invalidateObjectPermissionsAction(
  id_acceso: string,
  usernames: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch("/seguridad/object-access/invalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_acceso, usernames }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error: body.message ?? "Error invalidating permissions",
      };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message ?? "Unknown error" };
  }
}
