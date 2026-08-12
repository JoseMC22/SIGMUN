import { z } from 'zod';

export const SearchPredioSchema = z
  .object({
    codigo: z.string().optional().default(''),
    // Query param comes from the frontend as `codpred` (matching the SP
    // parameter name); zod objects strip unknown keys, so the raw key is
    // declared here and renamed to codPred for the DTO via the transform.
    codpred: z.string().optional().default(''),
    anio: z.string().optional().default(''),
    tipoBusqueda: z.string().optional().default('c'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).default(15),
  })
  .transform((val) => ({
    codigo: val.codigo,
    anio: val.anio,
    tipoBusqueda: val.tipoBusqueda,
    page: val.page,
    pageSize: val.pageSize,
    codPred: val.codpred,
  }));

export type SearchPredioDto = z.infer<typeof SearchPredioSchema>;
