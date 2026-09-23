/** Placeholder row for the predios inconsistency report (real SP pending). */
export interface PredioInconsistenciaRow {
  codigo: string;
}

/** Envelope de respuesta del scaffold de inconsistencia de predios. */
export interface PrediosInconsistenciaResult {
  success: boolean;
  data: PredioInconsistenciaRow[];
  message?: string;
  error?: string;
}
