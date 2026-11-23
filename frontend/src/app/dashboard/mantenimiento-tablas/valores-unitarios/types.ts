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

/** Espejo de VALORES_UNITARIOS_CODES del backend (A1..J7, 70 códigos). */
export const VALORES_UNITARIOS_CODES: string[] = Array.from(
  { length: 10 },
  (_, letterIndex) =>
    Array.from(
      { length: 7 },
      (_, numberIndex) =>
        `${String.fromCharCode("A".charCodeAt(0) + letterIndex)}${numberIndex + 1}`,
    ),
).flat();

export interface SaveValoresUnitariosBulkPayload {
  region: string;
  anno: string;
  items: Array<{ codi: string; valor: number }>;
}
