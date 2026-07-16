import { z } from 'zod';

// ── Raw SP row (columnas que devuelve [Rentas].[CondicionConvenio] busc=3) ──
// La tabla Rentas.estado_convenio usa `estado` (char(1)) como PK lógica.
// El SP NO devuelve id/codigo por separado: `estado` ES el código.
export interface SpConvenioEstadoRow {
  estado: string | number; // PK lógica (código del estado: '1','2','3'...)
  descripcion: string;
  nestado: string | number; // '1'=activo, '2'=eliminado (soft delete)
}

// ── Public API entity ───────────────────────────────────────────
export interface ConvenioEstado {
  id: string;
  codigo: string;
  descripcion: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Pagination ──────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Zod schemas ─────────────────────────────────────────────────

export const SearchConvenioEstadoSchema = z.object({
  codigo: z.string().optional(),
  descripcion: z.string().optional(),
  activo: z.string().optional(), // '1' | '0' | undefined
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchConvenioEstadoDto = z.infer<typeof SearchConvenioEstadoSchema>;

export const CreateConvenioEstadoSchema = z.object({
  codigo: z.string().min(3, 'El código debe tener al menos 3 caracteres')
    .max(10, 'El código no puede exceder 10 caracteres')
    .regex(/^[A-Za-z0-9]+$/, 'El código solo puede contener letras y números'),
  descripcion: z.string().min(1, 'La descripción es requerida')
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .regex(/^[^<>]*$/, 'No se permiten etiquetas HTML'),
  activo: z.union([z.literal('1'), z.literal('0')]).default('1'),
});

export type CreateConvenioEstadoDto = z.infer<typeof CreateConvenioEstadoSchema>;

export const UpdateConvenioEstadoSchema = z.object({
  codigo: z.string().optional(),
  descripcion: z.string().min(1).max(255).regex(/^[^<>]*$/).optional(),
  activo: z.union([z.literal('1'), z.literal('0')]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Al menos un campo debe ser proporcionado para actualizar',
});

export type UpdateConvenioEstadoDto = z.infer<typeof UpdateConvenioEstadoSchema>;