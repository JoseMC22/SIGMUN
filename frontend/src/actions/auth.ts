"use server";

import { cookies } from "next/headers";
import { login as apiLogin } from "@/lib/api";

const AUTH_COOKIE_NAME = 'SIGMUN_AUTH';
const LEGACY_AUTH_COOKIE_NAME = 'access_token';

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

  // Decodificamos la contraseña que viene ofuscada del cliente
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
          sameSite: "lax",
          maxAge: 8 * 60 * 60, // 8 horas
          path: "/",
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
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '/api';
  const response = await fetch(`${apiBase}/auth/session`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return { authenticated: false, user: null };
  }

  const data = await response.json();
  return {
    authenticated: data?.authenticated === true,
    user: data?.user ?? null,
  };
}

/**
 * Server Action para cerrar sesión.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(LEGACY_AUTH_COOKIE_NAME);
  return { success: true };
}
