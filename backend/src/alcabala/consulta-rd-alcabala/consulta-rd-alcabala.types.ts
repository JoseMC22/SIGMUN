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

// ── Detalle RD (SP_Dvalores msquery=1) ──

/** A single detail row from SP_Dvalores msquery=1.
 *  Header rows have a 4-digit `anio` (e.g. 2025).
 *  Detail rows have a non-4-digit `anio` (e.g. 05) and belong to
 *  the most recent header row above them. */
export interface DetalleRDRow {
  row_num: number;       // [no_name_1] — sequential row number from SP
  id: number;            // id — row id within the group
  anno: string;          // anno — sub-period identifier
  imp_insol: number;     // imp_insol — importe insoluto
  imp_reaj: number;      // imp_reaj — importe reajustado
  costo_emis: number;    // costo_emis — costo de emisión
  mora: number;          // mora — intereses moratorios
  total: number;         // total — total del renglón
  anio: string;          // anio — 4-digit = header, else detail
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
