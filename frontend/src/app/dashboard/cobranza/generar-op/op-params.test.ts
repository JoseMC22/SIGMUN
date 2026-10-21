import { describe, it, expect } from "vitest";
import {
  formatFechaDdMmAaaa,
  buildAnnosPack,
  buildTrimestresPack,
} from "./op-params";

describe("formatFechaDdMmAaaa", () => {
  it("convierte una fecha ISO a dd/MM/yyyy", () => {
    expect(formatFechaDdMmAaaa("2026-10-21")).toBe("21/10/2026");
  });

  it("devuelve vacío cuando la fecha no viene", () => {
    expect(formatFechaDdMmAaaa("")).toBe("");
  });
});

// El SP hace replace(@query, '"', '''') al final, así que las comillas dobles
// que mandamos son las que terminan delimitiando los literales del in (...).
// Con asteriscos o con un JSON el SP falla al parsear el SQL dinámico.

describe("buildAnnosPack", () => {
  it("empaca un solo año entre comillas dobles", () => {
    expect(buildAnnosPack(2026, 2026)).toBe('"2026"');
  });

  it("empaca un rango de años separado por coma", () => {
    expect(buildAnnosPack(2025, 2026)).toBe('"2025","2026"');
  });

  it("normaliza un rango invertido en lugar de devolver vacío", () => {
    expect(buildAnnosPack(2026, 2025)).toBe('"2025","2026"');
  });
});

describe("buildTrimestresPack", () => {
  it("empaca los cuatro trimestres ordenados y a dos dígitos", () => {
    expect(buildTrimestresPack([1, 2, 3, 4])).toBe('"01","02","03","04"');
  });

  it("ordena los trimestres antes de empacar", () => {
    expect(buildTrimestresPack([3, 1])).toBe('"01","03"');
  });

  it("empaca un solo trimestre sin coma", () => {
    expect(buildTrimestresPack([2])).toBe('"02"');
  });
});
