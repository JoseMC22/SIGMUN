import { z } from 'zod';
import {
  authErrorSchema,
  loginRequestSchema,
  loginSuccessSchema,
  logoutSuccessSchema,
  sessionCheckSuccessSchema,
} from '../schemas';

export type LoginDto = z.infer<typeof loginRequestSchema>;
export type LoginSuccessResponse = z.infer<typeof loginSuccessSchema>;
export type LogoutSuccessResponse = z.infer<typeof logoutSuccessSchema>;
export type AuthErrorResponse = z.infer<typeof authErrorSchema>;
export type SessionCheckResponse = z.infer<typeof sessionCheckSuccessSchema>;

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
  sub: string; // id_usuario como subject estándar JWT
  username: string; // vlogin
  name: string; // nombre completo
  roles: string[]; // roles derivados del perfil
  profileId: string; // id_perfil
  profileName: string; // nomb_perfil
  areaName: string; // nomb_area
  areaId: string; // area
}
