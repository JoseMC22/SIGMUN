// ── SP result: [Alcabala].[sp_DJAlcabala] @buscar='11' ──

export interface SpDeAlcabalaRow {
  id_alcabala: number;
  codigo_compra: string;
  comprador: string;
  comprador_fiscal: string;
  comprador_dni: string;
  codigo_venta: string;
  vendedor: string;
  vendedor_fiscal: string;
  vendedor_dni: string;
  contrato: string;
  direccion_predio: string;
  fecha_contrato: string;
  tipo_Pred: string;
  base_imponible: number;
  transferencia: number;
  autoavaluo: number;
  monto_inafecto: number;
  monto_afecto: number;
  mora: number;
  monto_alcabala: number;
  total_alcabala: number;
  tasa_impuesto: string;
  observacion: string;
  estado: string;
  monto_letras: string;
  [key: string]: unknown;
}

// ── Domain types (all 25 SP columns) ──

export interface DeAlcabalaRow {
  id_alcabala: number;
  codigo_compra: string;
  comprador: string;
  comprador_fiscal: string;
  comprador_dni: string;
  codigo_venta: string;
  vendedor: string;
  vendedor_fiscal: string;
  vendedor_dni: string;
  contrato: string;
  direccion_predio: string;
  fecha_contrato: string;
  tipo_Pred: string;
  base_imponible: number;
  transferencia: number;
  autoavaluo: number;
  monto_inafecto: number;
  monto_afecto: number;
  mora: number;
  monto_alcabala: number;
  total_alcabala: number;
  tasa_impuesto: string;
  observacion: string;
  estado: string;
  monto_letras: string;
}

// ── Response envelope ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
