import { z } from 'zod';

export const SearchCartasRequerimientoSchema = z.object({
  searchType: z.enum(['codigo', 'nombre']),
  searchValue: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type SearchCartasRequerimientoDto = z.infer<typeof SearchCartasRequerimientoSchema>;

// ── Contribuyente lookup DTO ──

export const GetContribuyenteSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
});

export type GetContribuyenteDto = z.infer<typeof GetContribuyenteSchema>;

// ── Cartas search DTO (by contribuyente code) ──

export const SearchCartasSchema = z.object({
  codigo: z.string().min(1, 'Código de contribuyente es requerido'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type SearchCartasDto = z.infer<typeof SearchCartasSchema>;

// ── Carta Req predios DTO (by codigo + anno) ──

export const GetCartaReqPrediosSchema = z.object({
  codigo: z.string().min(1, 'Código de contribuyente es requerido'),
  anno: z.string().min(1, 'Año es requerido'),
  idCarta: z.coerce.number().int().optional(),
});

export type GetCartaReqPrediosDto = z.infer<typeof GetCartaReqPrediosSchema>;

// ── Fiscalizadores DTO (optional idCarta) ──

export const GetFiscalizadoresSchema = z.object({
  idCarta: z.coerce.number().int().optional(),
});

export type GetFiscalizadoresDto = z.infer<typeof GetFiscalizadoresSchema>;

// ── Carta by ID DTO ──

export const GetCartaByIdSchema = z.object({
  idCarta: z.coerce.number().int().min(1, 'ID de carta es requerido'),
});

export type GetCartaByIdDto = z.infer<typeof GetCartaByIdSchema>;
