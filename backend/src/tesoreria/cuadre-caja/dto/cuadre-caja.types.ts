// ── Resultado crudo del SP Data.usp_caja_cuadre (@tipo='cuadre') ──
// Columnas que consume el front fuente (reportes_web): tipo8, tipo9,
// tipo8_06, tipo9_06, costas, sat100, Total, Total_6, ingreso, Fivi.
// Se aceptan variantes de casing por robustez ante el driver (patrón
// mantenimiento-ingresos): el SP devuelve UNA fila con el cuadre del día.

export interface SpCuadreCajaRow {
  tipo8?: number | null;
  Tipo8?: number | null;
  TIPO8?: number | null;
  tipo9?: number | null;
  Tipo9?: number | null;
  TIPO9?: number | null;
  tipo8_06?: number | null;
  Tipo8_06?: number | null;
  TIPO8_06?: number | null;
  tipo9_06?: number | null;
  Tipo9_06?: number | null;
  TIPO9_06?: number | null;
  costas?: number | null;
  Costas?: number | null;
  COSTAS?: number | null;
  sat100?: number | null;
  Sat100?: number | null;
  SAT100?: number | null;
  total?: number | null;
  Total?: number | null;
  TOTAL?: number | null;
  total_6?: number | null;
  Total_6?: number | null;
  TOTAL_6?: number | null;
  ingreso?: number | null;
  Ingreso?: number | null;
  INGRESO?: number | null;
  fivi?: number | null;
  Fivi?: number | null;
  FIVI?: number | null;
}

// ── Tipos de dominio ──

/**
 * Cuadre de caja de una fecha, con importes normalizados (minúsculas).
 * Derivados que calcula el front: otrosIng = sat100 - costas;
 * totalGral = total + sat100; diferencia = totalGral - ingreso.
 */
export interface CuadreCajaRow {
  tipo8: number;
  tipo9: number;
  tipo8_06: number;
  tipo9_06: number;
  costas: number;
  sat100: number;
  total: number;
  total_6: number;
  ingreso: number;
  fivi: number;
}

export interface CuadreCajaResponse {
  success: true;
  data: CuadreCajaRow | null;
}

export interface ErrorResponse {
  success: false;
  error: string;
}
