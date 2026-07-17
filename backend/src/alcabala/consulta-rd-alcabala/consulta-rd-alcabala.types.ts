// ── SP result interfaces ──

// ConsultaRDRow (what frontend receives) — fields match SP output for msquery=2
export interface ConsultaRDRow {
  ROW: number;           // row number from SP
  codigo: string;        // código contribuyente
  nombre: string;        // nombre contribuyente
  nomb_val: string;      // nombre del valor (tipo documento)
  num_val: string;       // número RD
  ano_val: number;       // año del valor
  MontoTotal: number;    // monto total
  fec_val: string;       // fecha de emisión del valor
  estado: string;        // estado
  fpago: string;         // forma de pago
  recibo: string;        // número de recibo
}

export interface ConsultaRDResult {
  success: boolean;
  data: ConsultaRDRow[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

// ── Detalle RD (SP_Mvalores msquery=4) ──

/** A single detail row from SP_Mvalores msquery=4. Columns are flexible
 *  because the SP schema is not documented; we map known fields and
 *  preserve the rest as-is. */
export interface DetalleRDRow {
  concepto: string;      // concepto / descripción
  base: number;          // base imponible
  monto: number;         // monto del concepto
  observaciones: string; // observaciones / notas
  fecha: string;         // fecha asociada
  [key: string]: any;    // preserve any extra SP columns
}

export interface DetalleRDResult {
  success: boolean;
  nombre: string;        // nombre contribuyente (from row context)
  nomb_val: string;      // tipo documento label
  num_val: string;       // número RD
  ano_val: number;       // año
  data: DetalleRDRow[];
  error?: string;
}
