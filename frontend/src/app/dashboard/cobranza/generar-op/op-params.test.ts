import { describe, it, expect } from "vitest";
import {
  formatFechaDdMmAaaa,
  buildAnnosPack,
  buildPerio,
} from "./op-params";

describe("formatFechaDdMmAaaa", () => {
  it("convierte una fecha ISO a dd/MM/yyyy", () => {
    expect(formatFechaDdMmAaaa("2026-10-21")).toBe("21/10/2026");
  });

  it("devuelve vacío cuando la fecha no viene", () => {
    expect(formatFechaDdMmAaaa("")).toBe("");
  });
});

describe("buildAnnosPack", () => {
  it("empaca un solo año entre comillas", () => {
    expect(buildAnnosPack(2026, 2026)).toBe('"2026"');
  });

  it("empaca un rango de años separado por coma", () => {
    expect(buildAnnosPack(2025, 2026)).toBe('"2025","2026"');
  });
});

describe("buildPerio", () => {
  it("arma exactamente el JSON de 4 elementos que espera el SP", () => {
    const perio = buildPerio({
      codigo: "0308555",
      fecha: "21/10/2026",
      annosPack: '"2026"',
      trimestres: [1, 2, 3, 4],
    });

    expect(perio).toBe(
      '["0308555","21/10/2026","\\"2026\\"","\\"01\\",\\"02\\",\\"03\\",\\"04\\""]',
    );
  });

  it("ordena los trimestres y los rellena a dos dígitos", () => {
    const perio = buildPerio({
      codigo: "0308555",
      fecha: "21/10/2026",
      annosPack: '"2026"',
      trimestres: [3, 1],
    });

    expect(perio).toContain('"\\"01\\",\\"03\\""');
  });
});
