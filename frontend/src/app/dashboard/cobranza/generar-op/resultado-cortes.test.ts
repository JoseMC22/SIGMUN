import { describe, it, expect } from "vitest";
import { agruparPorAnio, subtotalizar, totalFila } from "./resultado-cortes";

// Los factores (fact_reaj, fact_mora) NO se suman entre recibos: son
// coeficientes, no importes. Solo se acumulan insoluto, reajuste, interés y
// costo de emisión.

const fila = (over: Record<string, unknown> = {}) => ({
  anno: "2026",
  imp_insol: 100,
  imp_reaj: 10,
  mora: 5,
  costo_emis: 2,
  fact_reaj: 1.5,
  fact_mora: 1.1,
  ...over,
});

describe("subtotalizar", () => {
  it("suma solo los importes y deja los factores fuera", () => {
    const st = subtotalizar([
      fila({ imp_insol: 100, imp_reaj: 10, mora: 5, costo_emis: 2 }),
      fila({ imp_insol: 200, imp_reaj: 20, mora: 7, costo_emis: 3 }),
    ]);

    expect(st).toEqual({
      imp_insol: 300,
      imp_reaj: 30,
      mora: 12,
      costo_emis: 5,
      total: 47,
    });
    expect(Object.keys(st)).not.toContain("fact_reaj");
    expect(Object.keys(st)).not.toContain("fact_mora");
  });

  it("tolera importes que llegan como string", () => {
    const st = subtotalizar([fila({ imp_insol: "100.50", mora: "1.25" })]);
    expect(st.imp_insol).toBe(100.5);
    expect(st.mora).toBe(1.25);
  });

  it("trata null y valores no numericos como cero", () => {
    const st = subtotalizar([
      fila({ imp_insol: null, imp_reaj: "abc", mora: undefined }),
    ]);
    expect(st.imp_insol).toBe(0);
    expect(st.imp_reaj).toBe(0);
    expect(st.mora).toBe(0);
  });

  it("devuelve ceros con una lista vacia", () => {
    expect(subtotalizar([])).toEqual({
      imp_insol: 0,
      imp_reaj: 0,
      mora: 0,
      costo_emis: 0,
      total: 0,
    });
  });
});

describe("totalFila", () => {
  // Misma formula que el resto de la familia (rd-alcabala).
  it("suma reajuste, interes y costo de emision, sin el insoluto", () => {
    expect(totalFila(fila({ imp_insol: 999, imp_reaj: 10, mora: 5, costo_emis: 2 }))).toBe(17);
  });
});

describe("agruparPorAnio", () => {
  it("agrupa por año y ordena ascendente", () => {
    const grupos = agruparPorAnio([
      fila({ anno: "2026" }),
      fila({ anno: "2024" }),
      fila({ anno: "2025" }),
      fila({ anno: "2026" }),
    ]);

    expect(grupos.map((g) => g.anno)).toEqual(["2024", "2025", "2026"]);
    expect(grupos.map((g) => g.rows.length)).toEqual([1, 1, 2]);
  });

  it("calcula el subtotal de cada corte", () => {
    const grupos = agruparPorAnio([
      fila({ anno: "2024", imp_insol: 10, imp_reaj: 1, mora: 1, costo_emis: 1 }),
      fila({ anno: "2025", imp_insol: 20, imp_reaj: 2, mora: 2, costo_emis: 2 }),
      fila({ anno: "2025", imp_insol: 30, imp_reaj: 3, mora: 3, costo_emis: 3 }),
    ]);

    expect(grupos[0].subtotal.imp_insol).toBe(10);
    expect(grupos[1].subtotal.imp_insol).toBe(50);
    // Por fila: 2+2+2 = 6 y 3+3+3 = 9.
    expect(grupos[1].subtotal.total).toBe(15);
  });

  it("deja el año vacio al final en lugar de al principio", () => {
    const grupos = agruparPorAnio([
      fila({ anno: "" }),
      fila({ anno: "2019" }),
      fila({ anno: null }),
    ]);

    expect(grupos.map((g) => g.anno)).toEqual(["2019", ""]);
    expect(grupos[1].rows.length).toBe(2);
  });

  it("preserva el orden relativo dentro de cada corte", () => {
    const grupos = agruparPorAnio([
      fila({ anno: "2026", cod_pred: "A" }),
      fila({ anno: "2026", cod_pred: "B" }),
      fila({ anno: "2026", cod_pred: "C" }),
    ]);

    expect(grupos[0].rows.map((r) => r.cod_pred)).toEqual(["A", "B", "C"]);
  });

  it("devuelve una lista vacia sin filas", () => {
    expect(agruparPorAnio([])).toEqual([]);
  });
});
