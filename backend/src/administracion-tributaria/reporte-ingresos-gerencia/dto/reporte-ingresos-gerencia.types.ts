export interface AreaOption {
  id: string;
  descripcion: string;
}

export interface ReporteIngresosGerenciaRow {
  partida: string;
  descripcion: string;
  monto: number;
  color?: string;
  espacio?: number;
  nivel_suma?: number;
}

export interface ReporteIngresosGerenciaResponse {
  nombreArea: string;
  data: ReporteIngresosGerenciaRow[];
  total: number;
}
