// ── SP result interfaces — Reporte de Fraccionamientos Detallado ──

/**
 * Fila del SP Rentas.Rpt_Rentas_General con @BUSC=40 (rama lista_fracc).
 *
 * Las 13 columnas tienen el casing literal del SP (nombre y descrip en
 * minúscula, el resto en mayúsculas); NO normalizar: se accede row.nombre,
 * nunca row.Nombre. El tipo es el contrato del SP, no el de la grilla: las 3
 * columnas fuera de grilla (T_INSOL_CONVENIO, ANIO_SALDO, MES_SALDO) existen
 * en el recordset y hay que poder leerlas (título, decisiones futuras).
 *
 * Orquestado sobre [DATA].[NOTIFICACION_FRACCIONAMIENTOS] (probe T0 verificado
 * contra la BD: 13 columnas reales, semántica real de filtros).
 */
export interface FraccDetalladoRow {
  CODIGO?: string | number | null;
  /** Viene en minúscula (alias del SELECT); NO normalizar a Nombre. */
  nombre?: string | number | null;
  ANIO_CTA?: string | number | null;
  CONVENIO?: string | number | null;
  /** Fecha del convenio en dd/mm/yyyy (CONVERT(VARCHAR(20),F_CONVENIO,103)). */
  FECHA?: string | number | null;
  /** Viene en minúscula (alias del SELECT); NO normalizar a Descrip. */
  descrip?: string | number | null;
  IMP_INSOL?: string | number | null;
  NUM_CUOTAS?: string | number | null;
  CUOTAS_PENDIENTES?: string | number | null;
  /** Fuera de la grilla (Decisión 1 del design); el tipo lo conserva igual. */
  T_INSOL_CONVENIO?: string | number | null;
  SALDO?: string | number | null;
  /** Fuera de la grilla: constante fijada por el filtro ANNO. */
  ANIO_SALDO?: string | number | null;
  /** Solo alimenta el título (Decisión 6). Nombre del mes en mayúsculas. */
  MES_SALDO?: string | number | null;

  /** Columnas extra del SP sin perder. */
  [key: string]: string | number | null | undefined;
}

/**
 * Envelope de respuesta unificado para el endpoint de búsqueda.
 * Éxito:    { success: true, data, total, page, pageSize, totalPages }
 * Error:    { success: false, data: [], total: 0, page, pageSize, totalPages: 0, error }
 */
export interface FraccDetalladoResult {
  success: boolean;
  data: FraccDetalladoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

/** Fila de @BUSC=38: años distintos de ANIO_SALDO (DESC, columna anio_saldo). */
export interface FraccDetalladoAnioRow {
  anio_saldo?: string | number | null;

  [key: string]: string | number | null | undefined;
}

/** Fila de @BUSC=39: meses de un año (ASC, columnas id_mes, nom_mes). */
export interface FraccDetalladoMesRow {
  id_mes?: string | number | null;
  nom_mes?: string | number | null;

  [key: string]: string | number | null | undefined;
}

/**
 * Envelope del endpoint de catálogos (combos Año Corte / Mes Corte).
 * Sin Anno en el body solo se piden los años (meses queda vacío).
 */
export interface FraccDetalladoCatalogos {
  success: boolean;
  anios: string[];
  meses: { id_mes: number; nom_mes: string }[];
  error?: string;
}
