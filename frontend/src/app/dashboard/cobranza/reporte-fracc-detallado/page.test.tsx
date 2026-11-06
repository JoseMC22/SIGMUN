import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import ReporteFraccDetalladoPage from "./page";
import {
  searchFraccDetalladoAction,
  fetchFraccDetalladoCatalogosAction,
} from "@/actions/cobranza/reporte-fracc-detallado";
import type { FraccDetalladoResult } from "@/actions/cobranza/reporte-fracc-detallado";

// El page es "use client" y consume los server actions; se mockean para no
// depender de next/headers (cookies) en jsdom.
vi.mock("@/actions/cobranza/reporte-fracc-detallado", () => ({
  searchFraccDetalladoAction: vi.fn(),
  fetchFraccDetalladoCatalogosAction: vi.fn(),
}));

const mockSearch = vi.mocked(searchFraccDetalladoAction);
const mockCatalogos = vi.mocked(fetchFraccDetalladoCatalogosAction);

// ── Fixtures ──────────────────────────────────────────────

const anios = ["2026", "2025"];
const meses2026 = [
  { id_mes: 8, nom_mes: "AGOSTO" },
  { id_mes: 11, nom_mes: "NOVIEMBRE" },
];
const meses2025 = [
  { id_mes: 3, nom_mes: "MARZO" },
  { id_mes: 7, nom_mes: "JULIO" },
];

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

const emptyResult: FraccDetalladoResult = {
  success: true,
  data: [],
  total: 0,
  page: 1,
  pageSize: 15,
  totalPages: 0,
};

/** Catálogos por defecto: sin Anno solo años; con Anno los meses de ese año. */
function catalogos(anno?: string) {
  if (anno === "2025") return { success: true, anios, meses: meses2025 };
  if (anno) return { success: true, anios, meses: meses2026 };
  return { success: true, anios, meses: [] };
}

// ── Helpers ───────────────────────────────────────────────

function grid() {
  return screen.getByTestId("reporte-fracc-detallado-grid");
}

function columnHeaders() {
  return within(grid())
    .getAllByRole("columnheader")
    .map((th) => th.textContent?.trim());
}

async function renderAndLoad() {
  render(<ReporteFraccDetalladoPage />);
  await waitFor(() => expect(mockSearch).toHaveBeenCalled());
}

// ── Tests ─────────────────────────────────────────────────

describe("ReporteFraccDetalladoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCatalogos.mockImplementation(async (anno?: string) => catalogos(anno));
    // Búsqueda por defecto: éxito sin filas (lo que consume el auto-search del
    // montaje salvo que el test encole otro mockResolvedValue).
    mockSearch.mockResolvedValue(emptyResult);
  });

  it("carga los combos con los defaults y dispara la búsqueda inicial", async () => {
    render(<ReporteFraccDetalladoPage />);
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));

    // Catálogos: primero sin Anno (años), luego con el primer año (meses).
    expect(mockCatalogos).toHaveBeenNthCalledWith(1);
    expect(mockCatalogos).toHaveBeenNthCalledWith(2, "2026");
    // Búsqueda inicial con los defaults: primer año y primer mes, 15 por página.
    expect(mockSearch).toHaveBeenCalledWith(
      { codigo: "", anno: "2026", idMes: 8 },
      1,
      15,
    );
    expect(screen.getByLabelText("Año Corte")).toHaveValue("2026");
    expect(screen.getByLabelText("Mes Corte")).toHaveValue("8");
  });

  it("renderiza las 10 columnas del legado en orden y sin las columnas fuera de grilla", async () => {
    mockSearch.mockResolvedValue({
      success: true,
      data: [fila],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });
    await renderAndLoad();

    expect(columnHeaders()).toEqual([
      "CODIGO",
      "NOMBRE",
      "ANIO_CTA",
      "CONVENIO",
      "FECHA CONVENIO",
      "DESCRIPCION",
      "INSOLUTO",
      "# CUOTAS TOTAL",
      "# CUOTAS PENDIENTES",
      "SALDO",
    ]);
    // Decisión 1: T_INSOL_CONVENIO y ANIO_SALDO no aparecen ni como th ni como td.
    expect(within(grid()).queryByText("T_INSOL_CONVENIO")).not.toBeInTheDocument();
    expect(within(grid()).queryByText("ANIO_SALDO")).not.toBeInTheDocument();
    // La fila se renderiza con el casing literal del SP (nombre, descrip).
    expect(within(grid()).getByText("0200274")).toBeInTheDocument();
    expect(within(grid()).getByText("PEREZ JUAN")).toBeInTheDocument();
    expect(within(grid()).getByText("CONVENIO DE PAGO")).toBeInTheDocument();
    // FECHA queda como texto dd/mm/yyyy.
    expect(within(grid()).getByText("05/03/2026")).toBeInTheDocument();
  });

  it("formatea INSOLUTO y SALDO con 2 decimales", async () => {
    mockSearch.mockResolvedValue({
      success: true,
      data: [fila],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });
    await renderAndLoad();

    expect(within(grid()).getByText("1234.50")).toBeInTheDocument();
    expect(within(grid()).getByText("800.25")).toBeInTheDocument();
  });

  it("muestra el título desde los filtros y el estado vacío con paginación deshabilitada", async () => {
    await renderAndLoad();

    // R6: el título sale de los filtros, no de las filas: se muestra igual con 0 filas.
    expect(screen.getByTestId("reporte-titulo")).toHaveTextContent(
      "LISTADO DE FRACCIONAMIENTOS AGOSTO - 2026",
    );
    // Estado vacío visible, sin tabla vacía.
    expect(screen.getByText("No se encontraron resultados")).toBeInTheDocument();
    expect(screen.queryByTestId("reporte-fracc-detallado-grid")).not.toBeInTheDocument();
    // Controles de paginación deshabilitados.
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("Enter en el campo Código dispara la búsqueda con los filtros actuales", async () => {
    await renderAndLoad();
    mockSearch.mockClear();

    fireEvent.change(screen.getByLabelText("Código"), {
      target: { value: "02002" },
    });
    fireEvent.keyDown(screen.getByLabelText("Código"), { key: "Enter" });

    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        { codigo: "02002", anno: "2026", idMes: 8 },
        1,
        15,
      ),
    );
  });

  it("muestra el estado de error con opción de reintentar sin crashear", async () => {
    mockSearch.mockResolvedValue({
      ...emptyResult,
      success: false,
      error: "Fallo del SP",
    });
    await renderAndLoad();

    expect(await screen.findByText("Fallo del SP")).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /reintentar/i });

    mockSearch.mockResolvedValue(emptyResult);
    fireEvent.click(retry);
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
  });

  it("navega páginas conservando los filtros y pide 15 por página", async () => {
    mockSearch.mockResolvedValue({
      success: true,
      data: new Array(15).fill(fila),
      total: 40,
      page: 1,
      pageSize: 15,
      totalPages: 3,
    });
    await renderAndLoad();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ anno: "2026", idMes: 8 }),
        2,
        15,
      ),
    );
  });

  it("refresca los meses al cambiar el año y vuelve al primer mes", async () => {
    await renderAndLoad();

    fireEvent.change(screen.getByLabelText("Año Corte"), {
      target: { value: "2025" },
    });

    // Decisión 5: el combo Mes Corte se refresca con @BUSC=39 del nuevo año.
    await waitFor(() => expect(mockCatalogos).toHaveBeenCalledWith("2025"));
    await waitFor(() =>
      expect(screen.getByLabelText("Mes Corte")).toHaveValue("3"),
    );
    expect(
      within(screen.getByLabelText("Mes Corte"))
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["MARZO", "JULIO"]);
    // Cambiar el año solo refresca meses: no dispara una búsqueda nueva.
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it("cambiar el mes no recarga los catálogos", async () => {
    await renderAndLoad();
    const llamadasCatalogos = mockCatalogos.mock.calls.length;

    fireEvent.change(screen.getByLabelText("Mes Corte"), {
      target: { value: "11" },
    });

    expect(mockCatalogos.mock.calls.length).toBe(llamadasCatalogos);
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it("con los catálogos caídos muestra el error y deshabilita la búsqueda", async () => {
    mockCatalogos.mockResolvedValue({
      success: false,
      anios: [],
      meses: [],
      error: "Error al cargar los catálogos",
    });
    render(<ReporteFraccDetalladoPage />);

    expect(
      await screen.findByText("Error al cargar los catálogos"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /procesar/i })).toBeDisabled();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("muestra TableSkeleton durante la carga, sin spinners", async () => {
    let resolveSearch!: (value: FraccDetalladoResult) => void;
    mockSearch.mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve; }),
    );
    render(<ReporteFraccDetalladoPage />);

    await waitFor(() => expect(mockSearch).toHaveBeenCalled());
    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();

    resolveSearch(emptyResult);
    await waitFor(() =>
      expect(screen.queryByTestId("table-skeleton")).not.toBeInTheDocument(),
    );
  });

  it("es de solo lectura: no hay acciones de alta, modificación ni eliminación", async () => {
    await renderAndLoad();

    expect(
      screen.queryByRole("button", {
        name: /nuevo|agregar|editar|modificar|eliminar/i,
      }),
    ).not.toBeInTheDocument();
  });
});
