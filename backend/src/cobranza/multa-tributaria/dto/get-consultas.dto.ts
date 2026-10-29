import { z } from 'zod';

/** Listado de multas tributarias de un contribuyente. */
export const GetMultasSchema = z.object({
  codigo: z.string().trim().min(1).max(7),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(10), z.literal(100000)]))
    .default(10),
});

export type GetMultasDto = z.infer<typeof GetMultasSchema>;

/** Cabecera del contribuyente (store_caja_framework @msquery=17). */
export const GetContribuyenteSchema = z.object({
  codigo: z.string().trim().min(1).max(7),
});

export type GetContribuyenteDto = z.infer<typeof GetContribuyenteSchema>;

/** Predios del contribuyente para un anio. */
export const GetPrediosSchema = z.object({
  codigo: z.string().trim().min(1).max(7),
  anno: z.string().trim().regex(/^\d{4}$/, 'El anio debe tener 4 digitos'),
});

export type GetPrediosDto = z.infer<typeof GetPrediosSchema>;

/** Anio para UIT / valor de multa. */
export const GetAnnoSchema = z.object({
  anno: z.string().trim().regex(/^\d{4}$/, 'El anio debe tener 4 digitos'),
});

export type GetAnnoDto = z.infer<typeof GetAnnoSchema>;

/** Detalle de una multa para editar. */
export const GetDetalleSchema = z.object({
  codigo: z.string().trim().min(1).max(7),
  idMulta: z.string().trim().min(1).max(20),
});

export type GetDetalleDto = z.infer<typeof GetDetalleSchema>;

/** Grilla de infraccion para editar (incluye anio e id). */
export const GetInfraccionSchema = GetDetalleSchema.extend({
  anno: z.string().trim().regex(/^\d{4}$/, 'El anio debe tener 4 digitos'),
});

export type GetInfraccionDto = z.infer<typeof GetInfraccionSchema>;
