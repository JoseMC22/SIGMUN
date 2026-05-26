"use server";

import { cookies } from "next/headers";
import { login as apiLogin, LoginResponse } from "@/lib/api";

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
      
      // Parseamos la cookie básica (access_token=...; HttpOnly; ...)
      // En un caso real más complejo usaríamos una librería como 'cookie'
      const tokenMatch = setCookie.match(/access_token=([^;]+)/);
      if (tokenMatch) {
        cookieStore.set("access_token", tokenMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
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
 * Server Action para cerrar sesión.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  return { success: true };
}
