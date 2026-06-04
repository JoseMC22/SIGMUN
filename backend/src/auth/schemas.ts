import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z
    .string({ message: 'El correo electrónico es obligatorio.' })
    .trim()
    .email('El correo electrónico debe ser válido.'),
  password: z
    .string({ message: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña no puede estar vacía.')
    .max(200),
});

export const loginSuccessSchema = z.object({
  authenticated: z.literal(true),
  userId: z.string(),
  email: z.string().email(),
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
