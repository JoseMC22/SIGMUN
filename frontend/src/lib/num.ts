/**
 * Sanea y parsea un valor numérico que puede venir del SP como string
 * con separador de miles por coma / espacios, ej: "355,376.32".
 * - string con comas/espacios → limpia y Number()
 * - number válido → pasa igual
 * - cualquier cosa no convertible → 0 (NUNCA NaN)
 */
export function toNum(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").replace(/[,\s]/g, "").trim();
  if (raw === "" || raw === "-" || raw === "." || raw === "-.") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formatea un monto con 2 decimales y separador de miles, saneando el input.
 * NUNCA devuelve "NaN" — si no es convertible devuelve "0.00".
 */
export function fmtMonto(value: unknown): string {
  return toNum(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}