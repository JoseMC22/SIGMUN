import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

import {
  buildPrediosWorkbook,
  downloadPrediosWorkbook,
  EXPORT_FILENAME,
} from "./export-utils";

vi.mock("xlsx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("xlsx")>();
  return { ...actual, writeFile: vi.fn() };
});

const BASE_LABELS = [
  "N",
  "CODIGO",
  "NOMBRE",
  "PREDIO",
  "ANEXO",
  "DIRECCIÓN",
  "USO",
  "Area Terreno",
  "% Propiedad",
  "T. Area Const.",
  "Val. Terreno",
  "Val. Construccion",
  "Autoavaluo",
  "Instalaciones",
  "N° Pisos",
  "Categoria",
];

const PISO_LABELS = [
  "Item Piso",
  "Nivel Piso",
  "Mes Const.",
  "Anio Const.",
  "Clasificacion",
  "Material",
  "Estado",
  "Cat. Muros",
  "Cat. Techo",
  "Cat. Pisos",
  "Cat. Puerta",
  "Cat. Revés",
  "Cat. Baño",
  "Cat. Insel",
  "Val. Uni",
  "Area. Const.",
  "Val. Const.",
];

function makePayload(mostrarPisos: boolean) {
  const labels = mostrarPisos ? [...BASE_LABELS, ...PISO_LABELS] : BASE_LABELS;
  const columns = labels.map((label, index) => ({
    key: `col${index}`,
    label,
    sourceIndex: index - 1,
  }));
  const rows = [1, 2].map((rowNumber) =>
    columns.map((_, index) =>
      index === 0 ? String(rowNumber) : `r${rowNumber}c${index}`,
    ),
  );
  return { title: "TITULO DEL SP", mostrarPisos, columns, rows };
}

function matrixOf(payload: unknown): string[][] {
  const workbook = buildPrediosWorkbook(payload);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
}

describe("buildPrediosWorkbook", () => {
  beforeEach(() => {
    vi.mocked(XLSX.writeFile).mockClear();
  });

  it("construye 16 columnas sin pisos con una sola N", () => {
    const matrix = matrixOf(makePayload(false));

    expect(matrix[0][0]).toBe("REPORTE DE PREDIOS - TITULO DEL SP");
    expect(matrix[0].slice(1).every((cell) => cell === "")).toBe(true);
    expect(matrix[1]).toEqual(BASE_LABELS);
    expect(matrix[1].filter((label) => label === "N")).toHaveLength(1);
    expect(matrix[2]).toHaveLength(16);
    expect(matrix[2][0]).toBe("1");
    expect(matrix[3]).toHaveLength(16);
    expect(matrix[3][0]).toBe("2");
  });

  it("construye 33 columnas con pisos sin agregar una segunda N", () => {
    const matrix = matrixOf(makePayload(true));

    expect(matrix[1]).toEqual([...BASE_LABELS, ...PISO_LABELS]);
    expect(matrix[1]).toHaveLength(33);
    expect(matrix[1].filter((label) => label === "N")).toHaveLength(1);
    expect(matrix[2]).toHaveLength(33);
    expect(matrix[2][0]).toBe("1");
  });

  it("usa las etiquetas del backend textualmente", () => {
    const matrix = matrixOf(makePayload(true));

    for (const label of [
      "DIRECCIÓN",
      "% Propiedad",
      "Val. Construccion",
      "Autoavaluo",
      "Categoria",
      "N° Pisos",
      "Cat. Revés",
      "Cat. Baño",
      "Val. Const.",
    ]) {
      expect(matrix[1]).toContain(label);
    }
  });

  it("emite el titulo solo en la primera fila, nunca como celda de dato", () => {
    const matrix = matrixOf(makePayload(false));

    expect(matrix[0][0]).toBe("REPORTE DE PREDIOS - TITULO DEL SP");
    expect(matrix.slice(1).flat()).not.toContain(
      "REPORTE DE PREDIOS - TITULO DEL SP",
    );
    expect(matrix.slice(1).flat()).not.toContain("TITULO DEL SP");
  });

  it("tolera titulo nulo y filas nulas sin lanzar", () => {
    const payload = makePayload(false);
    const matrix = matrixOf({ ...payload, title: null, rows: null });

    expect(matrix[0][0]).toBe("REPORTE DE PREDIOS");
    expect(matrix[1]).toEqual(BASE_LABELS);
    expect(matrix).toHaveLength(2);
  });

  it("convierte celdas nulas en vacio sin inventar la columna N", () => {
    const payload = makePayload(false);
    const unsafeRows = payload.rows.map((row, rowIndex) =>
      row.map((cell, cellIndex) =>
        rowIndex === 0 && cellIndex === 1 ? null : cell,
      ),
    );

    const matrix = matrixOf({ ...payload, rows: unsafeRows });

    expect(matrix[2][0]).toBe("1");
    expect(matrix[2][1]).toBe("");
    expect(matrix[2]).toHaveLength(16);
    expect(matrix[1].filter((label) => label === "N")).toHaveLength(1);
  });

  it("rechaza un payload sin columnas con un TypeError", () => {
    expect(() => buildPrediosWorkbook(null)).toThrow(TypeError);
    expect(() => buildPrediosWorkbook({ title: "x", columns: "no" })).toThrow(
      TypeError,
    );
  });
});

describe("downloadPrediosWorkbook", () => {
  it("descarga con el nombre legacy Reporte de predios.xls", () => {
    expect(EXPORT_FILENAME).toBe("Reporte de predios.xls");

    downloadPrediosWorkbook(makePayload(false));

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      EXPORT_FILENAME,
    );
  });
});
