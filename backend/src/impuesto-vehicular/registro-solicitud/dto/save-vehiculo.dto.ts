import { z } from 'zod';

// Helper para normalizar cualquier valor a string
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

export const SaveVehiculoSchema = z.object({
  id_vehiculo: normalizeToString().optional(),
  idcontrib: normalizeToString(true),
  placa: normalizeToString().optional(),
  tarjeta_propiedad: normalizeToString().optional(),
  num_motor: normalizeToString().optional(),
  id_motor: normalizeToString().optional(),
  id_carroceria: normalizeToString().optional(),
  id_color: normalizeToString().optional(),
  id_adquisicion: normalizeToString().optional(),
  fecha_adqui: normalizeToString().optional(),
  fecha_boleta: normalizeToString().optional(),
  id_categoria: normalizeToString().optional(),
  categoria: normalizeToString().optional(),
  id_marca: normalizeToString().optional(),
  marca: normalizeToString().optional(),
  id_modelo: normalizeToString().optional(),
  modelo: normalizeToString().optional(),
  id_combustible: normalizeToString().optional(),
  id_traccion: normalizeToString().optional(),
  id_origen: normalizeToString().optional(),
  anio_fabrica: normalizeToString().optional(),
  cilindros: normalizeToString().optional(),
  peso_vehicular: normalizeToString().optional(),
  valor_vehiculo: normalizeToString().optional(),
  desmodelalt: normalizeToString().optional(),
  valor_dol: normalizeToString().optional(),
  tipoc: normalizeToString().optional(),
  cilindrada: normalizeToString().optional(),
  inscrip: normalizeToString().optional(),
  clase: normalizeToString().optional(),
  nasientos: normalizeToString().optional(),
  nruedas: normalizeToString().optional(),
  neje: normalizeToString().optional(),
  transmi: normalizeToString().optional(),
  nserie: normalizeToString().optional(),
  inafecto: normalizeToString().optional(),
  nestado: normalizeToString().optional(),
});

export type SaveVehiculoDto = z.infer<typeof SaveVehiculoSchema>;
