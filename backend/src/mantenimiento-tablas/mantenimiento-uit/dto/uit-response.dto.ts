export interface UitResponse {
  anno: number;
  tipo: string;
  valor_uit: number;
  imp_minimo: number | null;
  imp_maximo: number | null;
  costo_emis: number;
  costo_adic: number;
  estado: string;
  row: number;
}
