import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/inconsistencia/predios", () => ({
  searchInconsistenciasAction: vi.fn(),
  getTiposInconsistenciaAction: vi.fn(),
  getUsosPredioAction: vi.fn(),
}));

// Mock xlsx (dynamic import) so the export never touches the filesystem
vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import * as XLSX from "xlsx";

import {
  searchInconsistenciasAction,
  getTiposInconsistenciaAction,
  getUsosPredioAction,
} from "@/actions/inconsistencia/predios";
import type { PredioInconsistenciaRow } from "@/actions/inconsistencia/predios";
import InconsistenciaPrediosPage from "./page";

const mockedSearch = vi.mocked(searchInconsistenciasAction);
const mockedTipos = vi.mocked(getTiposInconsistenciaAction);
const mockedUsos = vi.mocked(getUsosPredioAction);

type SearchResult = Awaited<ReturnType<typeof searchInconsistenciasAction>>;

const CURRENT_YEAR = new Date().getFullYear();

const mockRows: PredioInconsistenciaRow[] = [
  {
    codigo: "C-001",
    nombre: "JUAN PEREZ",
    cod_pred: "P-001",
    anexo: "A-1",
    sub_anexo: "S-1",
    direcion: "AV. SIEMPRE VIVA 123",
    uso: "CASA HABITACION",
    area_terreno: 120.5,
    porcen_propiedad: 100,
    val_total_terreno: 50000,
    val_total_constru: 30000,
    total_autoavaluo: 80000,
    ROW: 1,
  },
];

const defaultSearchResponse = {
  success: true as const,
  data: mockRows,
  total: 1,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

describe("InconsistenciaPrediosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTipos.mockResolvedValue({
      success: true as const,
      data: [
        { id_acceso: "30.01.01", nombre: "OMISION DE PREDIO" },
        { id_acceso: "30.01.02", nombre: "SUBVALUACION" },
      ],
    });
    mockedUsos.mockResolvedValue({
      success: true as const,
      data: [{ id_uso: "1", uso: "CASA HABITACION" }],
    });
    mockedSearch.mockResolvedValue(defaultSearchResponse);
  });

  // ── Filtros de criterios ─────────────────────────────

  describe("orden de los controles", () => {
    it("renderiza tipo → año → uso → Buscar → Exportar en ese orden exacto", async () => {
      render(<InconsistenciaPrediosPage />);

      await screen.findByTestId("inconsistencia-predios-grid");

      const ids = [
        "control-tipo",
        "control-anno",
        "control-uso",
        "control-buscar",
        "control-exportar",
      ];
      const els = ids.map((id) => screen.getByTestId(id));

      for (let i = 1; i < els.length; i++) {
        const follows =
          els[i - 1].compareDocumentPosition(els[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING;
        expect(follows).toBeTruthy();
      }
    });
  });

  // ── Combo año ────────────────────────────────────────

  describe("combo de año", () => {
    it("va del año actual a 1998 en orden descendente", async () => {
      render(<InconsistenciaPrediosPage />);
      await screen.findByTestId("inconsistencia-predios-grid");

      const select = screen.getByTestId("control-anno") as HTMLSelectElement;
      const values = Array.from(select.options).map((o) => o.value);

      expect(values[0]).toBe(String(CURRENT_YEAR));
      expect(values[values.length - 1]).toBe("1998");
      expect(values).toHaveLength(CURRENT_YEAR - 1998 + 1);
    });
  });

  // ── Combo tipo de uso (solo visual) ──────────────────

  describe("combo de uso", () => {
    it("no envía el uso al action de búsqueda", async () => {
      render(<InconsistenciaPrediosPage />);
      await screen.findByTestId("inconsistencia-predios-grid");

      fireEvent.change(screen.getByTestId("control-uso"), {
        target: { value: "1" },
      });
      mockedSearch.mockClear();
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      fireEvent.click(screen.getByTestId("control-buscar"));

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });

      const lastCall = mockedSearch.mock.calls[mockedSearch.mock.calls.length - 1];
      expect(lastCall[0]).toEqual({
        idAcceso: "30.01.01",
        anno: CURRENT_YEAR,
      });
      expect(lastCall[0]).not.toHaveProperty("uso");
    });
  });

  // ── Grilla ───────────────────────────────────────────

  describe("grilla de resultados", () => {
    it("muestra las 13 columnas del result set incluida direcion", async () => {
      render(<InconsistenciaPrediosPage />);
      await screen.findByTestId("inconsistencia-predios-grid");

      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(13);
      expect(headers[0]).toHaveTextContent(/^código$/i);
      expect(headers[5]).toHaveTextContent(/dirección/i);
      expect(headers[12]).toHaveTextContent(/^row$/i);

      expect(screen.getByText("AV. SIEMPRE VIVA 123")).toBeInTheDocument();
    });
  });

  // ── Estados de UI ────────────────────────────────────

  describe("estados de UI", () => {
    it("muestra el skeleton mientras carga", async () => {
      mockedSearch.mockReturnValue(new Promise(() => {}));

      render(<InconsistenciaPrediosPage />);

      expect(await screen.findByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("muestra 'No se encontraron resultados' cuando no hay datos", async () => {
      mockedSearch.mockResolvedValue({
        success: true as const,
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      render(<InconsistenciaPrediosPage />);

      expect(
        await screen.findByText(/no se encontraron resultados/i),
      ).toBeInTheDocument();
    });

    it("muestra el error y re-ejecuta la búsqueda con Reintentar", async () => {
      mockedSearch
        .mockResolvedValueOnce({
          success: false as const,
          error: "Error del servidor",
        })
        .mockResolvedValueOnce(defaultSearchResponse);

      render(<InconsistenciaPrediosPage />);

      expect(await screen.findByText(/error del servidor/i)).toBeInTheDocument();

      mockedSearch.mockClear();
      mockedSearch.mockResolvedValue(defaultSearchResponse);
      fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── Guarda de respuestas obsoletas (R3 W3 / R4 W2) ─────

  describe("guarda de respuestas obsoletas", () => {
    it("ignora la respuesta vieja que resuelve después de una más nueva", async () => {
      let resolveOld!: (v: SearchResult) => void;
      let resolveNew!: (v: SearchResult) => void;

      // Búsqueda de montaje (la MÁS VIEJA) queda en vuelo
      mockedSearch.mockReturnValueOnce(
        new Promise<SearchResult>((res) => {
          resolveOld = res;
        }),
      );

      render(<InconsistenciaPrediosPage />);
      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });

      // El usuario dispara una NUEVA búsqueda mientras la primera sigue en vuelo
      mockedSearch.mockReturnValueOnce(
        new Promise<SearchResult>((res) => {
          resolveNew = res;
        }),
      );
      fireEvent.click(screen.getByTestId("control-buscar"));
      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(2);
      });

      // Resuelve primero la NUEVA → la grilla muestra sus filas
      resolveNew({
        success: true as const,
        data: [{ ...mockRows[0], codigo: "C-NUEVO" }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      expect(await screen.findByText("C-NUEVO")).toBeInTheDocument();

      // Resuelve DESPUÉS la VIEJA (más lenta) → debe ignorarse
      resolveOld({
        success: true as const,
        data: [{ ...mockRows[0], codigo: "C-VIEJO" }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      await waitFor(() => {
        expect(screen.queryByText("C-VIEJO")).not.toBeInTheDocument();
      });
      expect(screen.getByText("C-NUEVO")).toBeInTheDocument();
    });

    it("exporta con los filtros de la última búsqueda, no los del combo editado sin buscar", async () => {
      render(<InconsistenciaPrediosPage />);
      await screen.findByTestId("inconsistencia-predios-grid");

      mockedSearch.mockClear();
      mockedSearch.mockResolvedValue({
        success: true as const,
        data: mockRows,
        total: 1,
        page: 1,
        pageSize: 100000,
        totalPages: 1,
      });

      // Cambia el combo de tipo SIN ejecutar Buscar
      fireEvent.change(screen.getByTestId("control-tipo"), {
        target: { value: "30.01.02" },
      });
      fireEvent.click(screen.getByTestId("control-exportar"));

      await waitFor(() => {
        expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      });

      // El export usa la última búsqueda (30.01.01), no el combo editado (30.01.02)
      expect(mockedSearch).toHaveBeenCalledWith(
        { idAcceso: "30.01.01", anno: CURRENT_YEAR },
        1,
        100000,
      );
    });
  });

  // ── Fallo de combos en bootstrap (R4 W1) ────────────────

  describe("fallo de combos en bootstrap", () => {
    it("muestra el estado de error si los combos fallan y Reintentar re-ejecuta TODO el bootstrap", async () => {
      mockedTipos.mockResolvedValueOnce({
        success: false as const,
        error: "Error cargando tipos",
      });
      mockedUsos.mockResolvedValue({
        success: true as const,
        data: [{ id_uso: "1", uso: "CASA HABITACION" }],
      });

      render(<InconsistenciaPrediosPage />);

      expect(
        await screen.findByText(/error cargando tipos/i),
      ).toBeInTheDocument();
      // NUNCA una búsqueda con idAcceso:"" (el bug del Retry roto → 400 garantizado)
      expect(mockedSearch).not.toHaveBeenCalled();

      // Reintentar: los combos se recuperan y el bootstrap re-corre completo
      mockedTipos.mockResolvedValue({
        success: true as const,
        data: [{ id_acceso: "30.01.01", nombre: "OMISION DE PREDIO" }],
      });
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1); // la primera búsqueda del bootstrap
      });
      expect(mockedTipos).toHaveBeenCalledTimes(2); // ambas acciones de combos
      expect(mockedUsos).toHaveBeenCalledTimes(2);
      expect(screen.queryByText(/error cargando tipos/i)).not.toBeInTheDocument();
    });

    it("muestra un mensaje honesto (no el vacío de búsqueda) cuando los combos cargan sin tipos", async () => {
      mockedTipos.mockResolvedValue({ success: true as const, data: [] });
      mockedUsos.mockResolvedValue({ success: true as const, data: [] });

      render(<InconsistenciaPrediosPage />);

      expect(
        await screen.findByText(/no hay tipos de inconsistencia/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/no se encontraron resultados/i),
      ).not.toBeInTheDocument();
      expect(mockedSearch).not.toHaveBeenCalled();
    });
  });

  // ── Paginación ───────────────────────────────────────

  describe("paginación", () => {
    it("re-invoca el action con page=2 al presionar Siguiente", async () => {
      mockedSearch
        .mockResolvedValueOnce({
          ...defaultSearchResponse,
          total: 60,
          totalPages: 6,
        })
        .mockResolvedValueOnce({
          ...defaultSearchResponse,
          page: 2,
          total: 60,
          totalPages: 6,
        });

      render(<InconsistenciaPrediosPage />);
      await screen.findByTestId("inconsistencia-predios-grid");

      mockedSearch.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledWith(
          expect.any(Object),
          2,
          expect.any(Number),
        );
      });
    });

    it("deshabilita Anterior en la página 1 y Siguiente en la última", async () => {
      // Cola exacta: 1) mount, 2) navegación a la última página.
      mockedSearch.mockResolvedValueOnce({
        ...defaultSearchResponse,
        total: 60,
        totalPages: 6,
      });
      mockedSearch.mockResolvedValueOnce({
        ...defaultSearchResponse,
        page: 6,
        total: 60,
        totalPages: 6,
      });
      mockedSearch.mockResolvedValueOnce({
        ...defaultSearchResponse,
        page: 6,
        total: 60,
        totalPages: 6,
      });

      render(<InconsistenciaPrediosPage />);

      const prev = await screen.findByRole("button", { name: "Anterior" });
      expect(prev).toBeDisabled();
      expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();

      // Navega hasta la última página con el botón "Siguiente" (la ventana de
      // botones solo expone páginas cercanas a la actual).
      const next = screen.getByRole("button", { name: "Siguiente" });
      fireEvent.click(next);
      fireEvent.click(next);
      fireEvent.click(next);
      fireEvent.click(next);
      fireEvent.click(next);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
      });
      expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    });
  });

  // ── Exportar a Excel ─────────────────────────────────

  describe("exportación a Excel", () => {
    it("re-consulta el filtro completo y exporta TODAS las filas, no solo la página", async () => {
      const exportRows: PredioInconsistenciaRow[] = [
        mockRows[0],
        { ...mockRows[0], codigo: "C-002", cod_pred: "P-002", ROW: 2 },
      ];

      // El mount usa el valor por defecto de `beforeEach`; la exportación usa
      // el valor base reasignado abajo. `mockClear` NO vacía la cola de
      // `mockResolvedValueOnce`, por eso no se encola ninguna aquí.
      render(<InconsistenciaPrediosPage />);
      await screen.findByTestId("inconsistencia-predios-grid");

      // Aísla la llamada de exportación de la del mount.
      vi.mocked(XLSX.utils.json_to_sheet).mockClear();
      mockedSearch.mockClear();
      mockedSearch.mockResolvedValue({
        success: true as const,
        data: exportRows,
        total: 2,
        page: 1,
        pageSize: 100000,
        totalPages: 1,
      });

      fireEvent.click(screen.getByTestId("control-exportar"));

      await waitFor(() => {
        expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      });

      // La re-consulta usa el rango completo (pageSize=EXPORT_MAX_ROWS)
      expect(mockedSearch).toHaveBeenCalledWith(
        { idAcceso: "30.01.01", anno: CURRENT_YEAR },
        1,
        100000,
      );

      // El filtro enviado al action NUNCA incluye el uso
      expect(mockedSearch.mock.calls[0][0]).not.toHaveProperty("uso");

      // Se exportan las 2 filas del filtro completo, no la única de la página
      const exportedRows = vi.mocked(XLSX.utils.json_to_sheet).mock
        .calls[0][0] as unknown[];
      expect(exportedRows).toHaveLength(2);
    });

    it("genera el nombre de archivo con año y tipo de inconsistencia", async () => {
      render(<InconsistenciaPrediosPage />);
      await screen.findByTestId("inconsistencia-predios-grid");

      fireEvent.click(screen.getByTestId("control-exportar"));

      await waitFor(() => {
        expect(XLSX.writeFile).toHaveBeenCalledWith(
          expect.anything(),
          `inconsistencia-predios-${CURRENT_YEAR}-30.01.01.xlsx`,
        );
      });
    });
  });
});
