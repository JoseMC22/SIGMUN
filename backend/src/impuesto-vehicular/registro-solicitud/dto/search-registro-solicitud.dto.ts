import { z } from 'zod';

export const SearchRegistroSolicitudSchema = z.object({
  tipo_busqueda: z.enum(['C', 'N', 'D', 'R', 'P', 'V']).optional(),
  codigo: z.string().optional(),
  nombres: z.string().optional(),
  paterno: z.string().optional(),
  materno: z.string().optional(),
  razon: z.string().optional(),
  num_doc: z.string().optional(),
  cod_pred: z.string().optional(),
  checkfrac: z.string().optional(),
  placa: z.string().optional(),
  anno: z.string().optional(),
  cod_via: z.string().optional(),
  urbbus: z.string().optional(),
  nro: z.string().optional(),
  dpto: z.string().optional(),
  mza: z.string().optional(),
  lte: z.string().optional(),
  sublote: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type SearchRegistroSolicitudDto = z.infer<typeof SearchRegistroSolicitudSchema>;
