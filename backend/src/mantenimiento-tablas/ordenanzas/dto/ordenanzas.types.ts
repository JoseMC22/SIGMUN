// ── Resultado crudo del SP caja.sp_ordenanzas (@msquery=3) ──
// SELECT * FROM CAJA.MORDENANZAS (fuente verificada en vivo, 13/10):
// idordenanza, criterio (char con padding), descripcion, fec_desde
// (datetime), fec_hasta (datetime), observacion, estado (char),
// operador (char con padding), estacion (char con padding),
// fech_ing (datetime). El driver mssql entrega datetime como Date.

export interface SpOrdenanzaRow {
  idordenanza?: number | null;
  criterio?: string | null;
  descripcion?: string | null;
  fec_desde?: string | Date | null;
  fec_hasta?: string | Date | null;
  observacion?: string | null;
  estado?: string | null;
  operador?: string | null;
  estacion?: string | null;
  fech_ing?: string | Date | null;
}

// ── Tipos de dominio ──

/**
 * Ordenanza (master) normalizada para el listado: campos char recortados
 * (sin padding, null → '') y fechas en passthrough ISO (el front formatea).
 */
export interface OrdenanzaRow {
  idordenanza: number;
  criterio: string;
  descripcion: string;
  fec_desde: string;
  fec_hasta: string;
  observacion: string;
  estado: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

/**
 * Contrato del endpoint GET /api/mantenimiento-tablas/ordenanzas (S3):
 * lista completa sin paginación (25 filas); lista vacía → { data: [] }
 * SIN excepción (distinto de mantenimiento-uit, que lanza por año).
 */
export interface OrdenanzasResponse {
  data: OrdenanzaRow[];
}

// ── Detalle (iteración 4, @msquery=4 re-modelado) ──

// Resultado crudo del SP caja.sp_ordenanzas (@msquery=4) tras el cambio de
// SP re-verificado por DBA (re-lectura en vivo 13/10 ~16:32): SELECT con JOIN a
// CAJA.TIPO_INGRESOS_DET:
// `do.ANNO [Año], do.TIPO_REC, det.CONCEPTO, do.IMP_INSOL, do.IMP_REAJ,
// do.MORA, do.COSTO_EMIS` WHERE CIDORDENANZA = @idordenanza
// ORDER BY IDORDENANZA.
// Claves exactas del recordset: `Año` (alias entre corchetes, char 4, con ñ),
// TIPO_REC (char 5, padding), CONCEPTO (varchar) e IMP_INSOL/IMP_REAJ/MORA/
// COSTO_EMIS (decimal(18,2), llegan como número). El SP AHORA SÍ filtra
// server-side por @idordenanza (volumen real: idordenanza=1 → 115 filas,
// idordenanza=2 → 5): NO vuelve idordenanza/cidordenanza ni estado/fec_venc/
// observacion/tipo de la forma vieja.
// (T3/detalle-editar): el DBA agregó las llaves al SELECT — `IDORDENANZA`
// (PK del detalle, number) y `CIDORDENANZA` (master, number).
// (T7): el DBA agregó `tipo`, `observacion` y `estado` al SELECT del modo 4
// (llaves reales en MINÚSCULAS, verificadas en vivo 15/10: fila 1
// tipo='02.01', observacion='', estado='1'). Sin ellas el modo 8 las
// pisaría en blanco (trampa mortal del Diagnóstico modo 8).
export interface SpOrdenanzaDetalleRow {
  IDORDENANZA?: number | null;
  CIDORDENANZA?: number | null;
  'Año'?: string | null;
  TIPO_REC?: string | null;
  CONCEPTO?: string | null;
  IMP_INSOL?: number | string | null;
  IMP_REAJ?: number | string | null;
  MORA?: number | string | null;
  COSTO_EMIS?: number | string | null;
  tipo?: string | null;
  observacion?: string | null;
  estado?: string | null;
}

/**
 * Fila de detalle de ordenanza normalizada (7 campos del SP re-modelado +
 * llaves T3 + 3 preservadas T7): campos char/varchar recortados (null →
 * ''), montos numéricos. `idDetalle` es la PK del detalle (WHERE del modo
 * 8) y `cidordenanza` el master al que pertenece. `tipo`/`observacion`/
 * `estado` viajan preservados al modo 8 (el front los devuelve tal cual,
 * no editables).
 */
export interface OrdenanzaDetalleRow {
  idDetalle: number;
  cidordenanza: number;
  anno: string;
  tipoRec: string;
  concepto: string;
  impInsol: number;
  impReaj: number;
  mora: number;
  costoEmis: number;
  tipo: string;
  observacion: string;
  estado: string;
}

/**
 * Input del update del detalle (T3, @msquery=8 + T7 con los 19 params):
 * `tipo`/`observacion`/`estado` preservados del modo 4 (el front los
 * devuelve tal cual, NO editables). `estacion` viaja aparte del body HTTP
 * (header x-estacion) porque el SP la exige sin default.
 */
export interface EditarDetalleInput {
  cidordenanza: number;
  anno: string;
  tipoRec: string;
  impInsol: number;
  impReaj: number;
  mora: number;
  costoEmis: number;
  estacion: string;
  tipo: string;
  observacion: string;
  estado: string;
}

/**
 * Contrato del endpoint GET /api/mantenimiento-tablas/ordenanzas/detalle
 * (T9): filas que el SP ya filtró por idordenanza; sin filas → { data: [] }
 * SIN excepción.
 */
export interface OrdenanzasDetalleResponse {
  data: OrdenanzaDetalleRow[];
}
