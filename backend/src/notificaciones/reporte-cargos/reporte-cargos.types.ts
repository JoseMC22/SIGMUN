// ── SP result interfaces for Reporte de Cargos ──

/** A single Tipo de Valor option for the combo (Contenedor.TblTipo_valor). */
export interface TipoValorOption {
  id_valor: string;
  nomb_val: string;
}

/** A single charge row from SP `[notificacion].[ssp_cargos_notificacion]`. */
export interface CargoNotificacionRow {
  [key: string]: any; // dynamic columns — exact SP shape is DB-defined
}

/** Unified envelope returned by the search endpoint. */
export interface ReporteCargosResult {
  success: boolean;
  data: CargoNotificacionRow[];
  total: number;
  error?: string;
}

/** Unified envelope returned by the value-types (combo) endpoint. */
export interface TipoValorResult {
  success: boolean;
  data: TipoValorOption[];
  error?: string;
}
