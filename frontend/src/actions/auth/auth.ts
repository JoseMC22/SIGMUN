"use server";

import { cookies } from "next/headers";
import { login as apiLogin } from "@/lib/api";

const AUTH_COOKIE_NAME = 'SIGMUN_AUTH';
const LEGACY_AUTH_COOKIE_NAME = 'access_token';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers['Cookie'] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

/**
 * Server Action para manejar la autenticación.
 * Al ejecutarse en el servidor, oculta el payload JSON directo
 * y protege la comunicación con el backend de NestJS.
 */
export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const base64Password = formData.get("password") as string;

  if (!username || !base64Password) {
    return { success: false, error: "Usuario y contraseña son obligatorios." };
  }

  const password = Buffer.from(base64Password, 'base64').toString('utf-8');

  try {
    // Llamamos al backend desde el servidor de Next.js
    // El navegador nunca verá esta petición directa
    const { data, setCookie } = await apiLogin({ username, password });

    // Si el backend nos envió una cookie, la replicamos en el navegador del cliente
    if (setCookie) {
      const cookieStore = await cookies();
      const tokenMatch = setCookie.match(/(?:SIGMUN_AUTH|access_token)=([^;]+)/);
      if (tokenMatch) {
        cookieStore.set(AUTH_COOKIE_NAME, tokenMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
          path: "/",
          maxAge: 8 * 60 * 60, // 8 hours
        });
      }
    }
    
    return { 
      success: true, 
      user: data.user 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Error al iniciar sesión." 
    };
  }
}

/**
 * Action que verifica el estado de sesión en el backend.
 * Devuelve el estado autorizado y los datos de usuario si la sesión es válida.
 */
export async function checkSessionAction() {
  try {
    const response = await authFetch('/auth/session', { method: 'GET', cache: 'no-store' });

    if (!response.ok) {
      return { authenticated: false, user: null };
    }

    const data = await response.json();
    return {
      authenticated: data?.authenticated === true,
      user: data?.user ?? null,
    };
  } catch {
    return { authenticated: false, user: null };
  }
}

/**
 * Server Action para cerrar sesión.
 */
export async function logoutAction() {
  try {
    await authFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Si el backend no responde, igual limpiamos la cookie local
  }
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(LEGACY_AUTH_COOKIE_NAME);
  return { success: true };
}
