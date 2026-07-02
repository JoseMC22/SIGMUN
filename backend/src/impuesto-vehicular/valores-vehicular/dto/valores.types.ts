export interface ValorRow {
  id: string;
  ejercicio: string;
  categoria: string;
  marca: string;
  modelo: string;
  anio: string;
  monto: number;
  estado: string; // "ACTIVO" | "INACTIVO"
}

export interface ValorDetalle {
  id: string;
  id_anio: string;
  ejercicio: string;
  id_categoria: string;
  categoria: string;
  id_marca: string;
  marca: string;
  id_modelo: string;
  modelo: string;
  anio: string;
  monto: number;
  estado: string;
  xidmod: string;
}

export interface CatalogoOption {
  id: string;
  nombre: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
