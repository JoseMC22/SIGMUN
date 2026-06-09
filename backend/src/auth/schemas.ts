import { z } from 'zod';

export const loginRequestSchema = z.object({
  username: z
    .string({ message: 'El usuario es obligatorio.' })
    .trim()
    .min(1, 'El usuario no puede estar vacío.'),
  password: z
    .string({ message: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña no puede estar vacía.')
    .max(200),
});

export const loginSuccessSchema = z.object({
  authenticated: z.literal(true),
  user: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string(),
    profileId: z.string(),
    profileName: z.string(),
    areaId: z.string(),
    areaName: z.string(),
    isEncargado: z.string(),
    isRemoto: z.boolean().nullable(),
  }),
  sessionExpiresAt: z.string(),
  message: z.string().optional(),
});

export const logoutSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

export const authErrorSchema = z.object({
  authenticated: z.literal(false),
  errorCode: z.string(),
  message: z.string(),
});

export const sessionCheckSuccessSchema = z.object({
  authenticated: z.literal(true),
  user: z.object({
    id: z.string(),
    name: z.string(),
    roles: z.array(z.string()),
  }),
});
