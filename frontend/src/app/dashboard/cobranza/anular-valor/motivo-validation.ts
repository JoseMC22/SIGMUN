export const MOTIVO_MIN = 20;
export const MOTIVO_MAX = 250;

export interface MotivoValidation {
  valid: boolean;
  error: string | null;
}

/**
 * Validación pura del motivo de anulación, espejo del DTO del backend
 * (trim + min 20 + max 250). Vive en un módulo aparte porque los archivos
 * "use server" solo pueden exportar funciones asíncronas.
 */
export function validateMotivo(value: string): MotivoValidation {
  const trimmed = value.trim();
  if (trimmed.length < MOTIVO_MIN) {
    return { valid: false, error: "El motivo debe tener al menos 20 caracteres" };
  }
  if (trimmed.length > MOTIVO_MAX) {
    return { valid: false, error: "El motivo no puede superar los 250 caracteres" };
  }
  return { valid: true, error: null };
}
