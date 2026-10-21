export type ProcesarOpRow = Record<string, string | number | null>;

export interface ProcesarOpResult {
  success: boolean;
  data: ProcesarOpRow[];
  total: number;
  error?: string;
  /** Mensaje crudo del motor SQL. Solo se adjunta fuera de producción. */
  detail?: string;
}

/** Resultado de la generación real de la OP (Rentas.sp_Genera_OP[VEH]). */
export interface GenerarOpResult {
  success: boolean;
  /** '01' predial, '11' vehicular. */
  id_valor?: string;
  /** Correlativo que devuelve el SP; vacío nunca se reporta como éxito. */
  num_val?: string;
  ano_val?: string;
  /** Cantidad de recibos incluidos en la OP. */
  total?: number;
  imp_insol?: number;
  imp_reaj?: number;
  mora?: number;
  costo_emis?: number;
  error?: string;
  /** Mensaje crudo del motor SQL. Solo se adjunta fuera de producción. */
  detail?: string;
}
