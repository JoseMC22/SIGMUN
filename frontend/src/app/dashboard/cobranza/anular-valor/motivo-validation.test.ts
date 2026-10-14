import { describe, it, expect } from "vitest";
import { validateMotivo, MOTIVO_MIN, MOTIVO_MAX } from "./motivo-validation";

/**
 * Validación pura del motivo de anulación (min 20 / max 250 sobre el texto
 * recortado), espejo del DTO del backend.
 */
describe("validateMotivo", () => {
  it("acepta 20 caracteres exactos", () => {
    expect(validateMotivo("a".repeat(MOTIVO_MIN)).valid).toBe(true);
    expect(validateMotivo("a".repeat(MOTIVO_MIN)).error).toBeNull();
  });

  it("rechaza menos de 20 con el mensaje del contrato", () => {
    const res = validateMotivo("a".repeat(MOTIVO_MIN - 1));
    expect(res.valid).toBe(false);
    expect(res.error).toBe("El motivo debe tener al menos 20 caracteres");
  });

  it("rechaza vacio con el mismo mensaje", () => {
    const res = validateMotivo("");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("El motivo debe tener al menos 20 caracteres");
  });

  it("valida sobre el texto recortado", () => {
    expect(validateMotivo(`  ${"a".repeat(MOTIVO_MIN)}  `).valid).toBe(true);
    expect(validateMotivo(" ".repeat(MOTIVO_MIN)).valid).toBe(false);
  });

  it("acepta hasta 250 y rechaza 251", () => {
    expect(validateMotivo("a".repeat(MOTIVO_MAX)).valid).toBe(true);
    const res = validateMotivo("a".repeat(MOTIVO_MAX + 1));
    expect(res.valid).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
