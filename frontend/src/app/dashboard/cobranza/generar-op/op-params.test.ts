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

// La familia Caja.sp_EstCta_Rentas* espera cada ítem de lista envuelto en
// asteriscos y los reescribe como literales entrecomillados. Con comillas
// dobles la cláusula queda vacía y el SQL dinámico del SP se rompe.

describe("buildAnnosPack", () => {
  it("empaca un solo año con asteriscos", () => {
    expect(buildAnnosPack(2026, 2026)).toBe("*2026*");
  });

  it("empaca un rango de años separado por coma", () => {
    expect(buildAnnosPack(2025, 2026)).toBe("*2025*,*2026*");
  });

  it("normaliza un rango invertido en lugar de devolver vacío", () => {
    expect(buildAnnosPack(2026, 2025)).toBe("*2025*,*2026*");
  });
});

describe("buildTrimestresPack", () => {
  it("empaca los cuatro trimestres ordenados y a dos dígitos", () => {
    expect(buildTrimestresPack([1, 2, 3, 4])).toBe("*01*,*02*,*03*,*04*");
  });

  it("ordena los trimestres antes de empacar", () => {
    expect(buildTrimestresPack([3, 1])).toBe("*01*,*03*");
  });

  it("empaca un solo trimestre sin coma", () => {
    expect(buildTrimestresPack([2])).toBe("*02*");
  });
});
