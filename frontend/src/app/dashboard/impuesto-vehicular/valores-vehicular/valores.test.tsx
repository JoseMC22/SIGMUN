import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/valores", () => ({
  searchValoresAction: vi.fn(),
  fetchValorDetailAction: vi.fn(),
  fetchCategoriasAction: vi.fn(),
  fetchMarcasAction: vi.fn(),
  fetchModelosFiltradosAction: vi.fn(),
  fetchAniosEjercicioAction: vi.fn(),
  fetchAniosAction: vi.fn(),
  saveValorAction: vi.fn(),
  eliminarValorAction: vi.fn(),
}));

import { searchValoresAction, fetchCategoriasAction, fetchMarcasAction, fetchAniosAction, fetchAniosEjercicioAction } from "@/actions/valores";
import ValoresPage from "./page";

const mockedSearch = vi.mocked(searchValoresAction);
const mockedCategorias = vi.mocked(fetchCategoriasAction);
const mockedMarcas = vi.mocked(fetchMarcasAction);
const mockedAnios = vi.mocked(fetchAniosAction);
const mockedAniosEjercicio = vi.mocked(fetchAniosEjercicioAction);

const mockValores = [
  { id: "1", ejercicio: "2025", categoria: "SEDAN", marca: "TOYOTA", modelo: "COROLLA", anio: "2023", monto: 50000, estado: "ACTIVO" },
  { id: "2", ejercicio: "2025", categoria: "SUV", marca: "NISSAN", modelo: "X-TRAIL", anio: "2024", monto: 78000, estado: "INACTIVO" },
];

const defaultSearchResponse = {
  success: true as const,
  data: mockValores,
  total: 2,
  page: 1,
  pageSize: 15,
  totalPages: 1,
};

describe("Valores page component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCategorias.mockResolvedValue({ success: true as const, data: [] });
    mockedMarcas.mockResolvedValue({ success: true as const, data: [] });
    mockedAnios.mockResolvedValue({ success: true as const, data: [] });
    mockedAniosEjercicio.mockResolvedValue({ success: true as const, data: [] });
  });

  describe("Search form renders with text input, search type radios, and action buttons", () => {
    it("renders criterio text input, search type radios, Buscar and Limpiar buttons", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Text input for criterio
      expect(screen.getByPlaceholderText(/valor a buscar/i)).toBeInTheDocument();

      // Radio buttons (Todos, Categoría, Marca, Modelo, Año)
      expect(screen.getByLabelText(/todos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/marca/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/año$/i)).toBeInTheDocument();

      // Buscar button + Limpiar button
      expect(screen.getByRole("button", { name: /buscar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /limpiar/i })).toBeInTheDocument();
    });
  });

  describe("Search button triggers API call", () => {
    it("clicks Buscar and calls searchValoresAction with filters", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      mockedSearch.mockClear();

      const criterioInput = screen.getByPlaceholderText(/valor a buscar/i);
      fireEvent.change(criterioInput, { target: { value: "COROLLA" } });

      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      fireEvent.click(buscarButton);

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("presses Enter in criterio field and calls searchValoresAction", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      mockedSearch.mockClear();

      const criterioInput = screen.getByPlaceholderText(/valor a buscar/i);
      fireEvent.change(criterioInput, { target: { value: "X-TRAIL" } });
      fireEvent.keyDown(criterioInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("Grid renders 9 columns with data", () => {
    it("displays 9 column headers and populated data rows", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByTestId("valores-grid")).toBeInTheDocument();
      });

      // 9 column headers (# · Año Ejercicio · Categoría · Marca · Modelo · Año · Monto · Estado · Acciones)
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(9);
      expect(headers[0]).toHaveTextContent(/#/i);
      expect(headers[1]).toHaveTextContent(/año ejercicio/i);
      expect(headers[2]).toHaveTextContent(/categoría/i);
      expect(headers[3]).toHaveTextContent(/marca/i);
      expect(headers[4]).toHaveTextContent(/modelo/i);
      expect(headers[5]).toHaveTextContent(/^año$/i);
      expect(headers[6]).toHaveTextContent(/monto/i);
      expect(headers[7]).toHaveTextContent(/estado/i);
      expect(headers[8]).toHaveTextContent(/acciones/i);

      // Data rows
      expect(screen.getByText("COROLLA")).toBeInTheDocument();
      expect(screen.getByText("X-TRAIL")).toBeInTheDocument();
      expect(screen.getByText("TOYOTA")).toBeInTheDocument();
      expect(screen.getByText("NISSAN")).toBeInTheDocument();
      expect(screen.getByText("SEDAN")).toBeInTheDocument();
      expect(screen.getByText("SUV")).toBeInTheDocument();
      // 2025 appears in both rows (ejercicio column)
      expect(screen.getAllByText("2025").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Pagination controls render with correct boundaries", () => {
    const multiPageResponse = {
      success: true as const,
      data: [mockValores[0]],
      total: 45,
      page: 1,
      pageSize: 15,
      totalPages: 3,
    };

    it("renders pagination with Previous disabled on page 1", async () => {
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();

      const prevButton = screen.getByRole("button", { name: /anterior/i });
      expect(prevButton).toBeDisabled();

      const nextButton = screen.getByRole("button", { name: /siguiente/i });
      expect(nextButton).not.toBeDisabled();
    });

    it("clicks page 2 and fires a new search", async () => {
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();
      });

      mockedSearch.mockClear();

      const page2Button = screen.getByRole("button", { name: /^2$/ });
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
    });

    it("disables Next on last page", async () => {
      const lastPageResponse = {
        success: true as const,
        data: [mockValores[0]],
        total: 45,
        page: 3,
        pageSize: 15,
        totalPages: 3,
      };

      mockedSearch
        .mockResolvedValueOnce(multiPageResponse)
        .mockResolvedValueOnce(lastPageResponse);

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();
      });

      const page3Button = screen.getByRole("button", { name: /^3$/ });
      fireEvent.click(page3Button);

      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /siguiente/i });
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe("4 visual states (loading, empty, error+retry, populated)", () => {
    it("shows loading skeleton during search", async () => {
      mockedSearch.mockReturnValue(new Promise(() => {}));

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      });
    });

    it("shows empty message when no results", async () => {
      mockedSearch.mockResolvedValue({
        success: true as const,
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      });

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron/i)).toBeInTheDocument();
      });
    });

    it("shows error message with retry button", async () => {
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /reintentar/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("retry button triggers new search", async () => {
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
      });

      mockedSearch.mockClear();
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      const retryButton = screen.getByRole("button", { name: /reintentar/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
    });

    it("shows populated grid with data rows and action buttons", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ValoresPage />);

      await waitFor(() => {
        expect(screen.getByTestId("valores-grid")).toBeInTheDocument();
      });

      expect(screen.getByText("COROLLA")).toBeInTheDocument();
      expect(screen.getByText("X-TRAIL")).toBeInTheDocument();

      const editButtons = screen.getAllByRole("button", { name: /editar/i });
      expect(editButtons.length).toBe(mockValores.length);
      editButtons.forEach((btn) => expect(btn).not.toBeDisabled());

      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      expect(deleteButtons.length).toBe(mockValores.length);
      deleteButtons.forEach((btn) => expect(btn).not.toBeDisabled());
    });
  });
});
