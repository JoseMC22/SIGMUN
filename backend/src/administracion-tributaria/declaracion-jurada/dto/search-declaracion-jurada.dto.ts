import { z } from 'zod';

export const SearchDeclaracionJuradaSchema = z.object({
  tipoBusqueda: z.enum(['C', 'N', 'R', 'D', 'P', 'V']).default('C'),
  codigo: z.string().optional().default(''),
  nombres: z.string().optional().default(''),
  paterno: z.string().optional().default(''),
  materno: z.string().optional().default(''),
  razon: z.string().optional().default(''),
  numDoc: z.string().optional().default(''),
  codPred: z.string().optional().default(''),
  // ── Address/Predio fields (used when tipoBusqueda='P') ──
  anno: z.string().optional().default(''),
  idVia: z.string().optional().default(''),
  nro: z.string().optional().default(''),
  dpto: z.string().optional().default(''),
  mza: z.string().optional().default(''),
  lte: z.string().optional().default(''),
  subLte: z.string().optional().default(''),
  codUrb: z.string().optional().default(''),
  checkfrac: z.coerce.number().int().min(0).max(1).default(0),
  // ── Placa field (used when tipoBusqueda='V') ──
  placa: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type SearchDeclaracionJuradaDto = z.infer<typeof SearchDeclaracionJuradaSchema>;
