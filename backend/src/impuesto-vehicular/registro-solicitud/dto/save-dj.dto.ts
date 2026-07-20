import { z } from 'zod';

const normalizeToString = (required = false) => z.union([
  z.string(),
  z.number().transform(val => String(val)),
  z.null().transform(() => ''),
  z.undefined().transform(() => ''),
]).transform(val => {
  const s = String(val ?? '');
  if (s.trim() === '') return '';
  return s;
}).refine(val => !required || val.trim().length > 0, required ? 'Campo requerido' : undefined);

export const SaveDjSchema = z.object({
  id_dj: normalizeToString().optional(),
  num_decla: normalizeToString(true),
  anio_dj: normalizeToString(true),
  id_solicitud: normalizeToString(true),
  idcontrib: normalizeToString(true),
  id_propiedad: normalizeToString(true),
  id_vehiculo: normalizeToString().optional(),
  base_imponible1: z.number().default(0),
  imp_anual1: z.number().default(0),
  anio1: normalizeToString().optional(),
  base_imponible2: z.number().default(0),
  imp_anual2: z.number().default(0),
  anio2: normalizeToString().optional(),
  base_imponible3: z.number().default(0),
  imp_anual3: z.number().default(0),
  anio3: normalizeToString().optional(),
  id_tasa: normalizeToString(true),
  fecha_decla: normalizeToString(true),
  imprimir: normalizeToString().optional(),
});

export type SaveDjDto = z.infer<typeof SaveDjSchema>;
