export type ProcesarOpRow = Record<string, string | number | null>;

export interface ProcesarOpResult {
  success: boolean;
  data: ProcesarOpRow[];
  total: number;
  error?: string;
}
