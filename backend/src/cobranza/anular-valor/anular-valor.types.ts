/**
 * Tipos del listado de contribuyentes para anular-valor.
 *
 * Fuente: Rentas.ssp_Mcontribuyente @busc=5 (rama msconsulta), que devuelve
 * ~29 columnas + ROW. Acá se modelan las 8 identificatorias que muestra la
 * grilla; el resto (códigos internos, partes de dirección, auditoría) no se
 * expone porque DireFis ya trae la dirección armada y documento el tipo.
 */
export interface AnularValorContribuyenteRow {
  codigo: string;
  nombres: string;
  paterno: string;
  materno: string;
  documento: string;
  num_doc: string;
  DireFis: string;
  TipoPersona: string;
}

export interface AnularValorResult {
  success: boolean;
  data: AnularValorContribuyenteRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}
