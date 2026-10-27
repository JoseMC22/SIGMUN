export interface ReporteDeudaUsoRow {
  codigo: string;
  nombre: string;
  anno: string;
  cod_pred: string;
  anexo: string;
  sub_anexo: string;
  uso_predio: string;
  direccion: string;
  area_terreno: string;
  area_construccion: string;
  sector: string;
  insoluto_ip: string;
  insoluto_arb: string;
}

export interface AnnoOption {
  anno: string;
}

export interface UsoOption {
  id_uso: string;
  uso: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
