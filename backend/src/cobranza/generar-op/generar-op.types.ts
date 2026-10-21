export type ProcesarOpRow = Record<string, string | number | null>;

export interface ProcesarOpResult {
  success: boolean;
  data: ProcesarOpRow[];
  total: number;
  error?: string;
  /** Mensaje crudo del motor SQL. Solo se adjunta fuera de producción. */
  detail?: string;
}
