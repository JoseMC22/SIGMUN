// ── Dominio: Listado de Infracciones ──

export interface InfraccionRow {
  id: string;
  placa: string;
  propietario: string;
  conductor: string;
  tipoVehiculo: string;
  codigoInfraccion: string;
  numeroInfraccion: string;
  codigo: string;
  estadoImpresion: string;
  estImpresion1: string;
  codigoInfra: string;
  fecha: string;
  monto: string;
  estado: string;
  edt: string;
  imp: string;
  gnr: string;
  cmb: string;
  codigoPropietario: string;
  idRecibo: string;
  tipo: string;
  tipoRec: string;
}

// ── Response envelopes ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
