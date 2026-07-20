import { z } from 'zod';

// Helper para normalizar cualquier valor a string
const normalizeToString = (required = false) => z.union([
  z.string(),
  z.number().transform(val => String(val)),
  z.array(z.union([z.string(), z.number()])).transform(arr => {
    const first = arr[0];
    return first !== null && first !== undefined ? String(first) : '';
  }),
  z.null().transform(() => ''),
  z.undefined().transform(() => ''),
]).transform(val => {
  const s = String(val ?? '').trim();
  // Si la cadena es solo espacios o comas, devolver vacío
  if (s === '' || s.replace(/,/g, '') === '') return '';
  return s;
})
  .refine(val => !required || val.trim().length > 0, required ? 'Campo requerido' : undefined);

export const SaveRegistroSolicitudSchema = z.object({
  codigo: normalizeToString().optional(),
  id_pers: normalizeToString().optional(),
  id_docu: normalizeToString(true).refine(val => val.trim().length > 0, 'Tipo documento requerido'),
  num_doc: normalizeToString(true).refine(val => val.trim().length > 0, 'Número documento requerido'),
  nombres: normalizeToString().optional(),
  paterno: normalizeToString().optional(),
  materno: normalizeToString().optional(),
  id_dist: normalizeToString().optional(),
  tipourb: normalizeToString().optional(),
  des_urb: normalizeToString().optional(),
  tipovia: normalizeToString().optional(),
  des_via: normalizeToString().optional(),
  id_zona: normalizeToString().optional(),
  id_urba: normalizeToString().optional(),
  id_via: normalizeToString().optional(),
  referencia: normalizeToString().optional(),
  manzana: normalizeToString().optional(),
  lote: normalizeToString().optional(),
  sub_lote: normalizeToString().optional(),
  numero: normalizeToString().optional(),
  departam: normalizeToString().optional(),
  nestado: normalizeToString().optional(),
  id_tipocontri: normalizeToString().optional(),
  id_subtipocontri: normalizeToString().optional(),
  id_motivo_actualizacion: normalizeToString().optional(),
  telefono1: normalizeToString().optional(),
  anexo1: normalizeToString().optional(),
  telefono2: normalizeToString().optional(),
  anexo2: normalizeToString().optional(),
  letra1: normalizeToString().optional(),
  numero2: normalizeToString().optional(),
  letra2: normalizeToString().optional(),
  tipo_interior_id: normalizeToString().optional(),
  tipo_agrupamiento_id: normalizeToString().optional(),
  tipo_ingreso_id: normalizeToString().optional(),
  tipo_edificio_id: normalizeToString().optional(),
  nombre_edificio: normalizeToString().optional(),
  nombre_ingreso: normalizeToString().optional(),
  nombre_agrupamiento: normalizeToString().optional(),
  piso: normalizeToString().optional(),
  letra_interno: normalizeToString().optional(),
  numero_interno: normalizeToString().optional(),
  correo_e: normalizeToString().refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      return z.string().email().safeParse(val).success;
    },
    'Correo electrónico inválido'
  ).optional(),
  partida_defuncion: normalizeToString().optional(),
  fecha_defuncion: normalizeToString().optional(),
  flag_notificar: normalizeToString().optional(),
});

export type SaveRegistroSolicitudDto = z.infer<typeof SaveRegistroSolicitudSchema>;
