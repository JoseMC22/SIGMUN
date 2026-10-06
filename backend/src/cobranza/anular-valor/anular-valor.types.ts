/**
 * Tipos del listado de contribuyentes (fase 1 de anular-valor).
 *
 * Espejo de maestro-contribuyentes: Rentas.sp_Mcontribuyente @busc=28 devuelve
 * 16 columnas desde REPORTS.VW_LISTACONTRIBUYENTE. Texto → '' si null,
 * numéricos → 0 si null, para que el frontend no reciba null.
 */
export interface AnularValorContribuyenteRow {
  codigo: string;
  nombre: string;
  direccion: string;
  junta: string;
  dni: string;
  correo: string;
  idVia: string;
  telefono1: string;
  baseImponible: number;
  inafecto: number;
  categoria: string;
  gestor: string;
  impAnual: number;
  impTrime: number;
  costoEmi: number;
  impTotal: number;
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
