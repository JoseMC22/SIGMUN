// ── Resultado crudo del SP [Caja].[pa_liquidacion] ──────────────────────
// Columnas tal como las devuelve SQL Server. El modo 12 (cabecera) es un
// SELECT * sobre CAJA.TBL_LIQUIDACION; el modo 13 (detalle) devuelve columnas
// nombradas (NO leer por posición).

export interface SpLiquidacionCabeceraRow {
  idliquidacion: number | null;
  numero: string | null;
  codigo: string | null;
  Monto: number | null;
  Observacion: string | null;
  estado: string | null;
  usuario: string | null;
  terminal: string | null;
  fregistro: string | Date | null;
  fvencimiento: string | Date | null;
  observacion2: string | null;
}

export interface SpLiquidacionDetalleRow {
  SECUENCIA: number | null;
  tipo: string | null;
  tipo_rec: string | null;
  ANNO: string | null;
  PERIODO: string | null;
  imp_insol: number | null;
  imp_mora: number | null;
  COSTO_EMI: number | null;
  Total: number | null;
  Nombre: string | null;
  // Columna con punto y acento en el SP; se accede por índice string.
  'F.Emisión': string | null;
}

// ── Tipos de dominio (forma limpia en camelCase para el frontend) ────────

export interface LiquidacionCabecera {
  idLiquidacion: number | null;
  numero: string;
  codigo: string;
  monto: number | null;
  observacion: string;
  estado: string;
  usuario: string;
  terminal: string;
  fregistro: string;
  fvencimiento: string;
  observacion2: string;
}

export interface LiquidacionDetalle {
  secuencia: number | null;
  tipo: string;
  tipoRec: string;
  anno: string;
  periodo: string;
  impInsol: number | null;
  impMora: number | null;
  costoEmi: number | null;
  total: number | null;
  nombre: string;
  // `F.Emisión` del SP no es un identificador JS seguro; se expone como
  // `femision`.
  femision: string;
}

export interface LiquidacionComparativoResponse {
  cabecera: LiquidacionCabecera | null;
  detalle: LiquidacionDetalle[];
}
