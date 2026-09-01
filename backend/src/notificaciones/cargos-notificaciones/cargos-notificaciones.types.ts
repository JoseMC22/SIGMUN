// ── SP result interfaces for Cargos de Notificación ──

/** A single Tipo de Valor option for the combo (Contenedor.TblTipo_valor). */
export interface TipoValorOption {
  id_valor: string;
  nomb_val: string;
}

/** A single Notificador option for the combo (SP @busc=11). */
export interface NotificadorOption {
  codigo_autoridad: number;
  notificador: string;
}

/** A single value label from `[Rentas].[ssp_mvalores]` @msquery=9 (dynamically shaped). */
export interface ValorTributarioRow {
  [key: string]: unknown; // dynamic columns — exact SP shape is DB-defined
}

/** Envelope returned by the tipos-valor combo endpoint. */
export interface TipoValorComboResult {
  success: boolean;
  data: TipoValorOption[];
  error?: string;
}

/** Envelope returned by the notificadores combo endpoint. */
export interface NotificadoresComboResult {
  success: boolean;
  data: NotificadorOption[];
  error?: string;
}

/** Envelope returned by the validar-valor endpoint. */
export interface ValidarValorResult {
  success: boolean;
  data: ValorTributarioRow[];
  error?: string;
}

/** Envelope returned by the grabar-cargo endpoint. */
export interface GrabarCargoResult {
  success: boolean;
  message?: string;
  error?: string;
}
