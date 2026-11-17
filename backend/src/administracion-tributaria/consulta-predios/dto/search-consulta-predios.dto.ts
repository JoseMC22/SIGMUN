import { z } from 'zod';

/**
 * Reproduce el padding legacy de js_consultapred.js L39-52: un código numérico
 * no vacío se rellena con ceros a la izquierda hasta 7 caracteres; los códigos
 * ya más largos y los no numéricos se dejan intactos.
 */
function padCodigo(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || !/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  const zeros = '0000000';
  if (trimmed.length >= zeros.length) {
    return trimmed;
  }
  return zeros.substring(0, zeros.length - trimmed.length) + trimmed;
}

/** Los 10 filtros compartidos por los branches @busc=19/20 y @busc=21. */
export const ConsultaPrediosFiltersSchema = z.object({
  codigo: z.coerce.string().trim().default('').transform(padCodigo),
  codPred: z.coerce.string().trim().default(''),
  anno: z.coerce.string().trim().default(''),
  codVia: z.coerce.string().trim().default(''),
  urbBus: z.coerce.string().trim().default(''),
  nro: z.coerce.string().trim().default(''),
  dpto: z.coerce.string().trim().default(''),
  mza: z.coerce.string().trim().default(''),
  lte: z.coerce.string().trim().default(''),
  sublote: z.coerce.string().trim().default(''),
});

/** Filtros del branch @busc=19/20 más paginación 1-based. */
export const SearchConsultaPrediosSchema = ConsultaPrediosFiltersSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
});

export type SearchConsultaPrediosDto = z.infer<
  typeof SearchConsultaPrediosSchema
>;
