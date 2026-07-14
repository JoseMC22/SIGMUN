import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/modelos", () => ({
  searchModelosAction: vi.fn(),
  fetchMarcasAction: vi.fn(),
  fetchCategoriasAction: vi.fn(),
  fetchModeloDetailAction: vi.fn(),
  saveModeloAction: vi.fn(),
  eliminarModeloAction: vi.fn(),
}));

import { searchModelosAction, fetchMarcasAction, fetchCategoriasAction } from "@/actions/impuesto-vehicular/modelos";
import ModelosPage from "./page";

const mockedSearch = vi.mocked(searchModelosAction);
const mockedMarcas = vi.mocked(fetchMarcasAction);
const mockedCategorias = vi.mocked(fetchCategoriasAction);

const mockModelos = [
  { codmodelo: "M001", marca: "TOYOTA", nombre: "COROLLA", estado: "ACTIVO", categoria: "SEDAN", id: "5" },
  { codmodelo: "M002", marca: "NISSAN", nombre: "SENTRA", estado: "INACTIVO", categoria: "SEDAN", id: "9" },
];

const defaultSearchResponse = {
  success: true as const,
  data: mockModelos,
  total: 2,
  page: 1,
  pageSize: 15,
  totalPages: 1,
};

describe("Modelos page component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMarcas.mockResolvedValue({ success: true, data: [] });
    mockedCategorias.mockResolvedValue({ success: true, data: [] });
  });

  describe("Search form renders with text input, search type radios, and action buttons", () => {
    it("renders criterio text input, search type radios, Buscar and Limpiar buttons", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ModelosPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Text input for criterio
      expect(screen.getByPlaceholderText(/valor a buscar/i)).toBeInTheDocument();

      // Radio buttons (Todos, Código, Marca, Modelo)
      expect(screen.getByLabelText(/todos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/código/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/marca/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument();

      // Buscar button + Limpiar button
      expect(screen.getByRole("button", { name: /buscar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /limpiar/i })).toBeInTheDocument();
    });
  });

  describe("Search button triggers API call", () => {
    it("clicks Buscar and calls searchModelosAction with filters", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ModelosPage />);

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
        expect.objectContaining({ criterio: "COROLLA" }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("presses Enter in criterio field and calls searchModelosAction", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ModelosPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      mockedSearch.mockClear();

      const criterioInput = screen.getByPlaceholderText(/valor a buscar/i);
      fireEvent.change(criterioInput, { target: { value: "SENTRA" } });
      fireEvent.keyDown(criterioInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ criterio: "SENTRA" }),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("Grid renders 6 columns with data", () => {
    it("displays 6 column headers and populated data rows", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<ModelosPage />);

      await waitFor(() => {
        expect(screen.getByTestId("modelos-grid")).toBeInTheDocument();
      });

      // 7 column headers (# · Código · Categoría · Marca · Modelo · Estado · Acciones)
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(7);
      expect(headers[0]).toHaveTextContent(/#/i);
      expect(headers[1]).toHaveTextContent(/código/i);
      expect(headers[2]).toHaveTextContent(/categoría/i);
      expect(headers[3]).toHaveTextContent(/marca/i);
      expect(headers[4]).toHaveTextContent(/modelo/i);
      expect(headers[5]).toHaveTextContent(/estado/i);
      expect(headers[6]).toHaveTextContent(/acciones/i);

      // Data rows
      expect(screen.getByText("COROLLA")).toBeInTheDocument();
      expect(screen.getByText("SENTRA")).toBeInTheDocument();
      expect(screen.getByText("TOYOTA")).toBeInTheDocument();
      expect(screen.getByText("NISSAN")).toBeInTheDocument();
    });
  });

  describe("Pagination controls render with correct boundaries", () => {
    const multiPageResponse = {
      success: true as const,
      data: [mockModelos[0]],
      total: 45,
      page: 1,
      pageSize: 15,
      totalPages: 3,
    };

    it("renders pagination with Previous disabled on page 1", async () => {
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<ModelosPage />);

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

      render(<ModelosPage />);

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
        data: [mockModelos[0]],
        total: 45,
        page: 3,
        pageSize: 15,
        totalPages: 3,
      };

      mockedSearch
        .mockResolvedValueOnce(multiPageResponse)
        .mockResolvedValueOnce(lastPageResponse);

      render(<ModelosPage />);

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

      render(<ModelosPage />);

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

      render(<ModelosPage />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron/i)).toBeInTheDocument();
      });
    });

    it("shows error message with retry button", async () => {
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<ModelosPage />);

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

      render(<ModelosPage />);

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

      render(<ModelosPage />);

      await waitFor(() => {
        expect(screen.getByTestId("modelos-grid")).toBeInTheDocument();
      });

      expect(screen.getByText("COROLLA")).toBeInTheDocument();
      expect(screen.getByText("SENTRA")).toBeInTheDocument();

      const editButtons = screen.getAllByRole("button", { name: /editar/i });
      expect(editButtons.length).toBe(mockModelos.length);
      editButtons.forEach((btn) => expect(btn).not.toBeDisabled());

      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      expect(deleteButtons.length).toBe(mockModelos.length);
      deleteButtons.forEach((btn) => expect(btn).not.toBeDisabled());
    });
  });
});
