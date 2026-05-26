import { z } from 'zod';

/**
 * Esquema de validación Zod para el cuerpo del request de login.
 * Aplica reglas mínimas de seguridad antes de invocar el SP.
 */
export const loginSchema = z.object({
  username: z
    .string({ message: 'El usuario es obligatorio.' })
    .min(3, 'El usuario debe tener al menos 3 caracteres.')
    .max(100),
  password: z
    .string({ message: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña no puede estar vacía.')
    .max(200),
});

/** Tipo inferido del esquema de login */
export type LoginDto = z.infer<typeof loginSchema>;

/**
 * Interfaz que tipifica estrictamente las columnas devueltas
 * por el SP [Acceso].[sp_LogOut] cuando las credenciales son correctas.
 * Columnas identificadas en la imagen del resultado del SP.
 */
export interface SpLoginResult {
  id_usuario: string;
  vlogin: string;
  area: string;
  cajero: string;
  id_doc: string;
  num_doc: string;
  nombre: string;
  caja: string;
  nestado: string;
  id_perfil: string;
  nomb_perfil: string;
  nomb_area: string;
  encargado: string;
  remoto: boolean | null;
}

/**
 * Interfaz del payload que se firmará dentro del token JWT.
 * Solo incluye los datos necesarios (principio de mínimo privilegio).
 */
export interface JwtPayload {
  sub: string;       // id_usuario como subject estándar JWT
  username: string;  // vlogin
  profileId: string; // id_perfil
  profileName: string; // nomb_perfil
  areaName: string;  // nomb_area
  areaId: string;    // area
}

/**
 * Interfaz de la respuesta exitosa del endpoint POST /auth/login
 * El token se envía vía HttpOnly cookie por seguridad.
 */
export interface LoginResponse {
  user: {
    id: string;
    username: string;
    fullName: string;
    profileId: string;
    profileName: string;
    areaId: string;
    areaName: string;
    isEncargado: string;
    isRemoto: boolean | null;
  };
}
