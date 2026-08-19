import { z } from 'zod';

// ── Guardar representante (modal Representante) ──
// Replicates the legacy PHP sp_Mrepresentante + sp_Mcontribuyente pairing.

export const GuardarRepresentanteSchema = z.object({
  // @busc for sp_Mrepresentante: '1' = create, '2' = update
  tip: z.string().optional().default('1'),
  // codigo del contribuyente principal (vacío cuando se crea desde un contribuyente nuevo)
  codigo: z.string().optional().default(''),
  // @id del representante (vacío en creación)
  id: z.string().optional().default(''),
  // txtcodrepre — si el representante ya existe como contribuyente
  cod_repre: z.string().optional().default(''),
  id_docu: z.string().optional().default(''),
  num_doc: z.string().optional().default(''),
  nombres: z.string().optional().default(''),
  paterno: z.string().optional().default(''),
  materno: z.string().optional().default(''),
  id_dist: z.string().optional().default(''),
  tipourb: z.string().optional().default(''),
  des_urb: z.string().optional().default(''),
  tipovia: z.string().optional().default(''),
  des_via: z.string().optional().default(''),
  id_zona: z.string().optional().default(''),
  id_urba: z.string().optional().default(''),
  id_via: z.string().optional().default(''),
  referencia: z.string().optional().default(''),
  manzana: z.string().optional().default(''),
  lote: z.string().optional().default(''),
  sub_lote: z.string().optional().default(''),
  numero: z.string().optional().default(''),
  departam: z.string().optional().default(''),
  nestado: z.string().optional().default(''),
  operador: z.string().optional().default(''),
  estacion: z.string().optional().default(''),
  id_tipo_relacion: z.string().optional().default(''),
  letra1: z.string().optional().default(''),
  numero2: z.string().optional().default(''),
  letra2: z.string().optional().default(''),
  piso: z.string().optional().default(''),
  numero_interno: z.string().optional().default(''),
  letra_interno: z.string().optional().default(''),
  tipo_interior_id: z.string().optional().default(''),
  tipo_edificio_id: z.string().optional().default(''),
  tipo_ingreso_id: z.string().optional().default(''),
  tipo_agrupamiento_id: z.string().optional().default(''),
  nombre_edificio: z.string().optional().default(''),
  nombre_ingreso: z.string().optional().default(''),
  nombre_agrupamiento: z.string().optional().default(''),
});

export type GuardarRepresentanteDto = z.infer<typeof GuardarRepresentanteSchema>;
