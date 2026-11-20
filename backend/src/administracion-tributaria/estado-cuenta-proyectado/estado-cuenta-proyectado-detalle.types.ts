// `mssql` returns recordsets as objects keyed by column/alias. All detail
// mapping is by name; the legacy positional indexes are never reproduced.
export type SpNamedRow = Readonly<Record<string, unknown>>;
export type SpDetalleReciboProyectadoRow = SpNamedRow;
export type SpReciboEmitidoProyectadoRow = SpNamedRow;

/** store_caja_framework @msquery=1 (codigo, nombre, dirfiscal, num_doc, flag). */
export interface CabeceraProyectado {
  codigo: string;
  nombre: string;
  dirfiscal: string;
  num_doc: string;
  flag_fraccionamiento: string;
}

/** store_caja_framework @msquery=5/6 return a single minimo/maximo row. */
export interface RangoProyectado {
  minimo: string;
  maximo: string;
}

/** store_caja_framework @msquery=15: only these four aliases may be read. */
export interface PredioProyectado {
  cod_pred: string;
  anexo1: string;
  direccion: string;
  anno: string;
}

export interface CatalogosProyectado {
  periodos: RangoProyectado;
  annos: RangoProyectado;
  predios: PredioProyectado[];
  fechaProyectada: string;
}

/** sp_Recibos_emitidos @buscar=1 with the duplicated estado normalized. */
export interface ReciboEmitidoProyectado {
  num_ingr: string;
  codigo: string;
  caja: string;
  fec_pago: string;
  monto: string;
  estado: string;
  operador: string;
}

/** sp_EstCta_Rentas_proyectado_2022 row plus the legacy derived fields. */
export interface DetalleReciboProyectado {
  idrecibo: string;
  codigo: string;
  tipo: string;
  anno: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  tipo_rec: string;
  periodo: string;
  imp_insol: string;
  imp_reaj: string;
  mora: string;
  costo_emis: string;
  des_tipo: string;
  des_cabecera: string;
  det_anexo: string;
  total: number;
  benefic: number;
  tot_pagado: number;
  ubica: string;
}
