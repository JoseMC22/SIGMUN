export interface ReporteIngresosCajeroRow {
  codigoCajero: string;
  nombreCajero: string;
  numeroOperaciones: number;
  importe: number;
}

export interface ReporteIngresosCajeroResponse {
  data: ReporteIngresosCajeroRow[];
  totalOperaciones: number;
  totalImporte: number;
}
