import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { COLUMNAS } from "./page";
import {
  WS_COLUMNS,
  buildTituloFraccDetallado,
  useFraccDetalladoExport,
} from "./export-utils";
import { searchFraccDetalladoAction } from "@/actions/cobranza/reporte-fracc-detallado";
import type {
  FraccDetalladoResult,
} from "@/actions/cobranza/reporte-fracc-detallado";
import * as XLSX from "xlsx";

vi.mock("@/actions/cobranza/reporte-fracc-detallado", () => ({
  searchFraccDetalladoAction: vi.fn(),
}));

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: vi.fn((rows: unknown) => ({ rows })),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

const mockSearch = vi.mocked(searchFraccDetalladoAction);
const mockAoaToSheet = vi.mocked(XLSX.utils.aoa_to_sheet);
const mockWriteFile = vi.mocked(XLSX.writeFile);

// ── Fixtures ──────────────────────────────────────────────

const filtros = { codigo: "02002", anno: "2026", idMes: 8 };
const titulo = "LISTADO DE FRACCIONAMIENTOS AGOSTO - 2026";

const fila = {
  CODIGO: "0200274",
  nombre: "PEREZ JUAN",
  ANIO_CTA: "2024",
  CONVENIO: "C-001",
  FECHA: "05/03/2026",
  descrip: "CONVENIO DE PAGO",
  IMP_INSOL: 1234.5,
  NUM_CUOTAS: 12,
  CUOTAS_PENDIENTES: 7,
  T_INSOL_CONVENIO: 9999,
  SALDO: 800.25,
  ANIO_SALDO: "2026",
  MES_SALDO: "AGOSTO",
};

const resultadoConFilas: FraccDetalladoResult = {
  success: true,
  data: [fila],
  total: 1,
  page: 1,
  pageSize: 100000,
  totalPages: 1,
};

function renderExport() {
  const setExporting = vi.fn();
  const setError = vi.fn();
  const hook = renderHook(() =>
    useFraccDetalladoExport({ filters: filtros, titulo, setExporting, setError }),
  );
  return { ...hook, setExporting, setError };
}

// ── Tests ─────────────────────────────────────────────────

describe("espejo WS_COLUMNS ↔ COLUMNAS", () => {
  it("mismo largo, mismos headers y mismos keys en el mismo orden", () => {
    // Este espejo se rompió dos veces en el repo: ahora es un assert, no una
    // promesa. Si alguien agrega una columna a la grilla sin agregarla al
    // Excel (o al revés), este test falla.
    expect(WS_COLUMNS).toHaveLength(COLUMNAS.length);
    expect(WS_COLUMNS.map((c) => c.header)).toEqual(
      COLUMNAS.map((c) => c.header),
    );
    expect(WS_COLUMNS.map((c) => c.key)).toEqual(COLUMNAS.map((c) => c.key));
  });
});

describe("buildTituloFraccDetallado", () => {
  it("arma el título R6 desde los filtros, con el mes en mayúsculas", () => {
    expect(buildTituloFraccDetallado("Noviembre", "2026")).toBe(
      "LISTADO DE FRACCIONAMIENTOS NOVIEMBRE - 2026",
    );
    expect(buildTituloFraccDetallado("AGOSTO", "2025")).toBe(
      "LISTADO DE FRACCIONAMIENTOS AGOSTO - 2025",
    );
  });
});

describe("useFraccDetalladoExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exporta el dataset completo (pageSize 100000) con título, headers y montos a 2 decimales", async () => {
    mockSearch.mockResolvedValue(resultadoConFilas);
    const { result, setExporting, setError } = renderExport();

    await act(async () => {
      await result.current.exportToExcel();
    });

    // El export re-pide TODAS las filas del filtro, no la página visible.
    expect(mockSearch).toHaveBeenCalledWith(filtros, 1, 100000);

    const hoja = mockAoaToSheet.mock.calls[0][0] as (string | number)[][];
    // Fila 1: título del reporte (R6). Fila 2: headers de WS_COLUMNS.
    expect(hoja[0]).toEqual([titulo]);
    expect(hoja[1]).toEqual(WS_COLUMNS.map((c) => c.header));
    // Fila 3+: datos; los montos con 2 decimales.
    const idxInsoluto = WS_COLUMNS.findIndex((c) => c.key === "IMP_INSOL");
    const idxSaldo = WS_COLUMNS.findIndex((c) => c.key === "SALDO");
    expect(hoja[2][idxInsoluto]).toBe("1234.50");
    expect(hoja[2][idxSaldo]).toBe("800.25");
    // FECHA queda como texto dd/mm/yyyy.
    expect(hoja[2][WS_COLUMNS.findIndex((c) => c.key === "FECHA")]).toBe(
      "05/03/2026",
    );

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.anything(),
      "reporte-fracc-detallado.xlsx",
    );
    // Solo limpia mensajes previos (null); nunca setea un mensaje de error.
    expect(setError).toHaveBeenCalledWith(null);
    expect(setError).not.toHaveBeenCalledWith(expect.any(String));
    expect(setExporting).toHaveBeenCalledWith(true);
    expect(setExporting).toHaveBeenLastCalledWith(false);
  });

  it("sin registros: muestra 'No hay registros para exportar' y no descarga archivo", async () => {
    mockSearch.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 100000,
      totalPages: 0,
    });
    const { result, setError } = renderExport();

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(setError).toHaveBeenCalledWith("No hay registros para exportar");
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("error del backend: muestra el error sin descargar archivo", async () => {
    mockSearch.mockResolvedValue({
      success: false,
      data: [],
      total: 0,
      page: 1,
      pageSize: 100000,
      totalPages: 0,
      error: "Error al consultar el reporte",
    });
    const { result, setError } = renderExport();

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(setError).toHaveBeenCalledWith("Error al exportar Excel");
    expect(mockWriteFile).not.toHaveBeenCalled();
  });
});
