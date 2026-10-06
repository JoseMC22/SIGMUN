/**
 * Tipos del resultset de Rentas.SP_Consultadocu @msquery=1.
 *
 * El SP devuelve 13 columnas + ROW. Acá se modelan las 12 que se muestran:
 * ROW se descarta (artefacto de paginación, no dato) y nestado se descarta
 * (el SP filtra V.nestado=1 fijo, así que vale 1 en todas las filas).
 *
 * Casing literal del SP. MontoTotal es imp_reaj + costo_emis + mora (decimal,
 * llega como number); fec_val y fec_vence vienen dd/mm/yyyy (convert 103).
 */
export interface ConsultaValoresRow {
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
  fec_vence: string;
  observacion: string;
}

export interface ConsultaValoresResult {
  success: boolean;
  data: ConsultaValoresRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}
