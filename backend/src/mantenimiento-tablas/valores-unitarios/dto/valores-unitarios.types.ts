/** Fila expuesta por el CRUD de Calculo.Tblvaluni (sin `idsigma`). */
export interface ValorUnitarioRow {
  region: string;
  anno: string;
  codi: string;
  valor: number;
  operador: string;
  estacion: string;
  fechor_ing: string | Date;
}

export interface ValoresUnitariosYearsResponse {
  years: string[];
}

export interface ValoresUnitariosSearchResponse {
  data: ValorUnitarioRow[];
}

export interface ValoresUnitariosMutationResponse {
  message: string;
  row: ValorUnitarioRow;
}

export interface ValoresUnitariosDeleteResponse {
  message: string;
}
