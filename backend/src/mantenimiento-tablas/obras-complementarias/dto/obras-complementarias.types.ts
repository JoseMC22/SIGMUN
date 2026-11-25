export interface ObraComplementariaRow {
  id_instala: string;
  anno: string;
  instala: string;
  uni_med: string;
  valor: number;
  descri_gener: string;
  nestado: 0 | 1;
  vhostnm: string;
  vusernm: string;
  ddatetm: string | Date;
  categ: string | null;
}

export interface ObrasComplementariasYearsResponse {
  years: string[];
}

export interface ObrasComplementariasSearchResponse {
  data: ObraComplementariaRow[];
}

export interface ObrasComplementariasMutationResponse {
  message: string;
  row: ObraComplementariaRow;
}

export interface ObrasComplementariasDeleteResponse {
  message: string;
}
