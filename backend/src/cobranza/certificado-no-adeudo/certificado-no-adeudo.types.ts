/**
 * Contratos del modulo cobranza/certificado-no-adeudo.
 *
 * Origen legacy: certificado/index (busqueda de contribuyentes).
 * La grilla reutiliza el mismo contrato de contribuyentes que
 * cobranza/multa-tributaria: Rentas.sp_Mcontribuyente @busc=6 (conteo) +
 * @busc=5 (pagina).
 */

export interface ContribuyenteRow {
  codigo: string;
  nombres: string;
  paterno: string;
  materno: string;
  documento: string;
  numDoc: string;
  direccion: string;
}

export interface SearchContribuyenteResult {
  success: boolean;
  data: ContribuyenteRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}
