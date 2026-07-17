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
