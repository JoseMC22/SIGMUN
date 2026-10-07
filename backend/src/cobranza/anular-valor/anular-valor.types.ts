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

export interface SearchAnularValorResult {
  success: boolean;
  data: AnularValorContribuyenteRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

/**
 * Resultado de la anulación de un valor (fase 2).
 * El SP @msquery=10 no devuelve nada: el success lo da el service al
 * re-leer y encontrar nestado='Anulado'.
 */
export interface AnularValorResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Valor emitido de un contribuyente.
 * Fuente: Rentas.ssp_Consultadocu @msquery=3 (16 columnas + ROW).
 *
 * nestado viene con la descripción resuelta (el SP hace el lookup a
 * rentas.estado_valores: 'Pendiente', 'Pagado', ...), no el int.
 * id_mvalores es la PK de la fila (la necesitará la fase 2 para anular);
 * viaja en datos pero no se muestra en la grilla del modal.
 * fecha viene '1900-01-01' cuando no hay registro de motivo (artefacto del
 * isnull(datetime,'') del SP): se mapea a ''.
 */
export interface ValorEmitidoRow {
  codigo: string;
  nombre: string;
  nomb_val: string;
  num_val: string;
  ano_val: string;
  MontoTotal: number;
  fec_val: string;
  id_valor: string;
  num_exp: string;
  ano_exp: string;
  nestado: string;
  fec_vence: string;
  id_mvalores: number;
  motivo: string;
  operador: string;
  fecha: string;
}

export interface ValoresResult {
  success: boolean;
  data: ValorEmitidoRow[];
  total: number;
  error?: string;
}
