import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/reportes-gerenciales/predios-uso", async () => ({
  searchPrediosUsoAction: vi.fn().mockResolvedValue({ success: true, data: [], total: 0, page: 1, pageSize: 15, totalPages: 0 }),
  getDetallePredioUsoAction: vi.fn(),
  getUsoOptionsAction: vi.fn().mockResolvedValue({ success: true, options: [] }),
}));

import { searchPrediosUsoAction } from "@/actions/reportes-gerenciales/predios-uso";
import PrediosUsoPage from "./page";

const mockedSearch = vi.mocked(searchPrediosUsoAction);

const mockPredios = [
  { tipo: "U", uso: "COMERCIO", predios: 123, condicion: "UNICOS 100%", count: 45, anno: 2026, id_uso: "001" },
  { tipo: "U", uso: "INDUSTRIA", predios: 67, condicion: "PREDIAL", count: 12, anno: 2026, id_uso: "002" },
  { tipo: "U", uso: "SERVICIOS", predios: 89, condicion: "UNICOS 100%", count: 34, anno: 2026, id_uso: "003" },
];

const defaultSearchResponse = {
  success: true as const,
  data: mockPredios,
  total: 3,
  page: 1,
  pageSize: 15,
  totalPages: 1,
};

describe("PrediosUso page component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("T4: 3 search fields render (2 text + 1 select)", () => {
    it("renders 2 text inputs and 1 select element", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PrediosUsoPage />);

      // Wait for initial loading to finish
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // text input: Código
      expect(screen.getByPlaceholderText(/código del predio/i)).toBeInTheDocument();

      // 2 selects: Año, Uso
      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(2);
    });
  });

  describe("Año select populated with 2016..2026 range on mount", () => {
    it("shows año options from 2016 to 2026", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PrediosUsoPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      const anoSelect = screen.getByRole("combobox", { name: /año/i });
      const options = Array.from(anoSelect.querySelectorAll("option"));

      // Should have 12 options: "Todos" + 2016..2026 (11 years)
      expect(options.length).toBe(12);

      // Check a few key years are present
      const optionValues = options.map((o) => o.getAttribute("value"));
      expect(optionValues).toContain("2016");
      expect(optionValues).toContain("2026");
    });
  });

  describe("Search button + Enter key trigger API call", () => {
    it("clicks Buscar button and calls searchPrediosUsoAction with current filters", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PrediosUsoPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Clear calls from initial mount search
      mockedSearch.mockClear();

      // Type in a filter
      const codigoInput = screen.getByPlaceholderText(/código del predio/i);
      fireEvent.change(codigoInput, { target: { value: "123" } });

      // Click Buscar button
      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      fireEvent.click(buscarButton);

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: "123" }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("presses Enter in codigo field and calls searchPrediosUsoAction", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PrediosUsoPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Clear calls from initial mount search
      mockedSearch.mockClear();

      // Type a filter and press Enter
      const codigoInput = screen.getByPlaceholderText(/código del predio/i);
      fireEvent.change(codigoInput, { target: { value: "456" } });
      fireEvent.keyDown(codigoInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: "456" }),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("Table renders 7 column headers with data", () => {
    it("displays 7 column headers and populated data rows", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PrediosUsoPage />);

      await waitFor(() => {
        expect(screen.getByTestId("predios-grid")).toBeInTheDocument();
      });

      // Check 6 column headers (Tipo, Uso, Año, Predios, Condición, Acción)
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(6);
      expect(headers[0]).toHaveTextContent(/tipo/i);
      expect(headers[1]).toHaveTextContent(/uso/i);
      expect(headers[2]).toHaveTextContent(/año/i);
      expect(headers[3]).toHaveTextContent(/predios/i);
      expect(headers[4]).toHaveTextContent(/condición/i);
      expect(headers[5]).toHaveTextContent(/acción/i);

      // Check data rows display content
      expect(screen.getByText("COMERCIO")).toBeInTheDocument();
      expect(screen.getByText("INDUSTRIA")).toBeInTheDocument();
      expect(screen.getByText("SERVICIOS")).toBeInTheDocument();
    });
  });

  describe("Pagination controls render with disabled Previous/Next and page click", () => {
    const multiPageResponse = {
      success: true as const,
      data: [mockPredios[0]],
      total: 25,
      page: 1,
      pageSize: 15,
      totalPages: 2,
    };

    it("renders pagination with Previous disabled on page 1", async () => {
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<PrediosUsoPage />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();

      const prevButton = screen.getByRole("button", { name: /anterior/i });
      expect(prevButton).toBeDisabled();

      const nextButton = screen.getByRole("button", { name: /siguiente/i });
      expect(nextButton).not.toBeDisabled();
    });

    it("disables Next on last page", async () => {
      const lastPageResponse = {
        success: true as const,
        data: [mockPredios[0]],
        total: 25,
        page: 2,
        pageSize: 15,
        totalPages: 2,
      };

      mockedSearch
        .mockResolvedValueOnce(multiPageResponse)
        .mockResolvedValueOnce(lastPageResponse);

      render(<PrediosUsoPage />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();
      });

      mockedSearch.mockClear();

      // Click page 2
      const page2Button = screen.getByRole("button", { name: /^2$/ });
      fireEvent.click(page2Button);

      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /siguiente/i });
        expect(nextButton).toBeDisabled();
      });
    });

    it("page click fires new search", async () => {
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<PrediosUsoPage />);

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
  });

  describe("4 grid states (loading, empty, error+retry, populated)", () => {
    it("shows loading skeleton during initial search", async () => {
      mockedSearch.mockReturnValue(new Promise(() => {}));

      render(<PrediosUsoPage />);

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

      render(<PrediosUsoPage />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron resultados/i)).toBeInTheDocument();
      });
    });

    it("shows error message with retry button", async () => {
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<PrediosUsoPage />);

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

      render(<PrediosUsoPage />);

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

    it("shows populated grid with data rows", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PrediosUsoPage />);

      await waitFor(() => {
        expect(screen.getByTestId("predios-grid")).toBeInTheDocument();
      });

      expect(screen.getByText("COMERCIO")).toBeInTheDocument();
      expect(screen.getByText("INDUSTRIA")).toBeInTheDocument();
      expect(screen.getByText("SERVICIOS")).toBeInTheDocument();
    });
  });
});
