import { z } from 'zod';

/** Default tipo_busqueda for SP DJAlcabala buscar=3 — lowercase 'c' matches SP convention (unlike contribuyente SP which uses uppercase 'C'). */
export const DEFAULT_TIPO_BUSQUEDA = 'c';

// The SP is invoked with the raw query param `codpred` (lowercase). The rest of
// the app uses camelCase (`codPred`), so we normalize the raw key at the door
// with a preprocess step before validating the canonical shape.
export const SearchPredioSchema = z.preprocess(
  (input: unknown) => {
    const obj = (input ?? {}) as Record<string, unknown>;
    return {
      codigo: typeof obj.codigo === 'string' ? obj.codigo : '',
      anio: typeof obj.anio === 'string' ? obj.anio : '',
      tipoBusqueda: typeof obj.tipoBusqueda === 'string' ? obj.tipoBusqueda : DEFAULT_TIPO_BUSQUEDA,
      page: obj.page ?? 1,
      pageSize: obj.pageSize ?? 15,
      codPred: typeof obj.codpred === 'string' ? obj.codpred : '',
      // Extra search criteria forwarded to the SP for buscar=3 (vendedor N/D/R search).
      nombres: typeof obj.nombres === 'string' ? obj.nombres : '',
      paterno: typeof obj.paterno === 'string' ? obj.paterno : '',
      materno: typeof obj.materno === 'string' ? obj.materno : '',
      numDoc: typeof obj.num_doc === 'string' ? obj.num_doc : '',
      razon: typeof obj.razon === 'string' ? obj.razon : '',
    };
  },
  z.object({
    codigo: z.string(),
    anio: z.string(),
    tipoBusqueda: z.string(),
    page: z.coerce.number().int().min(1),
    pageSize: z.coerce.number().int().min(1),
    codPred: z.string(),
    nombres: z.string(),
    paterno: z.string(),
    materno: z.string(),
    numDoc: z.string(),
    razon: z.string(),
  }),
);

export type SearchPredioDto = z.infer<typeof SearchPredioSchema>;
