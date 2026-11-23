export interface ValorUnitarioRow {
  region: string;
  anno: string;
  codi: string;
  valor: number;
  operador: string;
  estacion: string;
  fechor_ing: string | Date;
}

export interface SaveValorUnitarioPayload {
  region: string;
  anno: string;
  codi: string;
  valor: number;
}
