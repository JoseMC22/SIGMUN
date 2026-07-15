import { z } from 'zod';

// ─── Raw row from SP ───────────────────────────────────────────────
export interface SpConvenioEstadoRow {
  id: string;           // uniqueidentifier
  codigo: string;       // varchar(10) - unique code
  descripcion: string;  // varchar(255)
  activo: boolean;      // bit
  createdAt: Date;      // datetime2
  updatedAt: Date;      // datetime2
}

// ─── Public response shape ─────────────────────────────────────────
export interface ConvenioEstado {
  id: string;
  codigo: string;
  descripcion: string;
  activo: boolean;
  createdAt: string;    // ISO string
  updatedAt: string;    // ISO string
}

// ─── Paginated response ────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Zod schemas for validation ───────────────────────────────────
export const CreateConvenioEstadoSchema = z.object({
  codigo: z.string()
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(10, 'El código no puede exceder 10 caracteres')
    .regex(/^[A-Z0-9]+$/, 'El código solo puede contener letras mayúsculas y números'),
  descripcion: z.string()
    .min(1, 'La descripción es requerida')
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .regex(/^[^<>]*$/, 'No se permiten caracteres HTML'),
  activo: z.union([z.boolean(), z.string()]).transform((v) => {
    if (typeof v === 'boolean') return v ? '1' : '0';
    return v || '1';
  }).default('1'),
});

export type CreateConvenioEstadoDto = z.infer<typeof CreateConvenioEstadoSchema>;

export const UpdateConvenioEstadoSchema = z.object({
  codigo: z.string()
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(10, 'El código no puede exceder 10 caracteres')
    .regex(/^[A-Z0-9]+$/, 'El código solo puede contener letras mayúsculas y números')
    .optional(),
  descripcion: z.string()
    .min(1, 'La descripción es requerida')
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .regex(/^[^<>]*$/, 'No se permiten caracteres HTML')
    .optional(),
  activo: z.union([z.boolean(), z.string()]).transform((v) => {
    if (typeof v === 'boolean') return v ? '1' : '0';
    return v || '1';
  }).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Al menos un campo debe ser proporcionado para actualizar',
});

export type UpdateConvenioEstadoDto = z.infer<typeof UpdateConvenioEstadoSchema>;

export const SearchConvenioEstadoSchema = z.object({
  codigo: z.string().optional(),
  descripcion: z.string().optional(),
  activo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type SearchConvenioEstadoDto = z.infer<typeof SearchConvenioEstadoSchema>;