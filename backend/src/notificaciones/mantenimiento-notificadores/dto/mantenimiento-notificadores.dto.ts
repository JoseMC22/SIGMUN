import { z } from 'zod';

// Crear (Nuevo) notificador → SP @busc=12.
// iniciales = código de área (máx 5), notificador = descripción/nombre (máx 220).
export const GuardarNotificadorSchema = z.object({
  iniciales: z
    .string()
    .trim()
    .min(1, 'Las iniciales son obligatorias')
    .max(5, 'Las iniciales no deben superar 5 caracteres'),
  notificador: z
    .string()
    .trim()
    .min(1, 'El notificador es obligatorio')
    .max(220, 'El notificador no debe superar 220 caracteres'),
});

export type GuardarNotificadorDto = z.infer<typeof GuardarNotificadorSchema>;

// Modificar notificador → SP @busc=14 (solo nombre; iniciales inmutable).
export const ActualizarNotificadorSchema = z.object({
  id_notificador: z.coerce.number().int('El id_notificador debe ser entero'),
  notificador: z
    .string()
    .trim()
    .min(1, 'El notificador es obligatorio')
    .max(220, 'El notificador no debe superar 220 caracteres'),
});

export type ActualizarNotificadorDto = z.infer<typeof ActualizarNotificadorSchema>;

// Activar / Eliminar (toggle flag) → SP @busc=13.
export const ActivarEliminarNotificadorSchema = z.object({
  id_notificador: z.coerce.number().int('El id_notificador debe ser entero'),
  estado: z.coerce
    .number()
    .int('El estado debe ser entero')
    .min(0, 'El estado debe ser 0 o 1')
    .max(1, 'El estado debe ser 0 o 1'),
});

export type ActivarEliminarNotificadorDto = z.infer<
  typeof ActivarEliminarNotificadorSchema
>;
