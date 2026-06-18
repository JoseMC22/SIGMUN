import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/perfiles", () => ({
  searchPerfilesAction: vi.fn(),
}));

import { searchPerfilesAction } from "@/actions/perfiles";
import PerfilesPage from "./page";

const mockedSearch = vi.mocked(searchPerfilesAction);

const mockPerfiles = [
  { id: "0000064", nombre: "ADMINISTRACION", estado: "ACTIVADO" },
  { id: "0000001", nombre: "SISTEMAS", estado: "DESACTIVADO" },
];

const defaultSearchResponse = {
  success: true as const,
  data: mockPerfiles,
  total: 2,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

describe("Perfiles page component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("T7: Renders 3 search fields (2 text inputs, 1 select)", () => {
    it("renders 2 text inputs and 1 select element", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PerfilesPage />);

      // Wait for initial loading to finish
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // 2 text inputs: Código, Nombre
      const textInputs = screen.getAllByRole("textbox");
      expect(textInputs).toHaveLength(2);

      // Verify placeholder texts to confirm each field
      expect(screen.getByPlaceholderText(/código/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/nombre del perfil/i)).toBeInTheDocument();

      // 1 select: Estado
      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(1);
    });
  });

  describe("T8: Search button + Enter key trigger API call", () => {
    it("clicks Buscar button and calls searchPerfilesAction with current filters", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PerfilesPage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Clear calls from the initial mount search
      mockedSearch.mockClear();

      // Type in a filter
      const codigoInput = screen.getByPlaceholderText(/código/i);
      fireEvent.change(codigoInput, { target: { value: "P001" } });

      // Click Buscar button
      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      fireEvent.click(buscarButton);

      // Should have called search with updated filters
      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: "P001" }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("presses Enter in codigo field and calls searchPerfilesAction", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PerfilesPage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Clear calls from the initial mount search
      mockedSearch.mockClear();

      // Type a filter and press Enter
      const codigoInput = screen.getByPlaceholderText(/código/i);
      fireEvent.change(codigoInput, { target: { value: "P002" } });
      fireEvent.keyDown(codigoInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: "P002" }),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("T9: Grid renders 4 columns with data", () => {
    it("displays 4 column headers and populated data rows", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PerfilesPage />);

      // Wait for the grid table to render
      await waitFor(() => {
        expect(screen.getByTestId("perfiles-grid")).toBeInTheDocument();
      });

      // Check 4 column headers
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(4);
      expect(headers[0]).toHaveTextContent(/código/i);
      expect(headers[1]).toHaveTextContent(/nombre/i);
      expect(headers[2]).toHaveTextContent(/estado/i);
      expect(headers[3]).toHaveTextContent(/acciones/i);

      // Check data rows display content
      expect(screen.getByText("ADMINISTRACION")).toBeInTheDocument();
      expect(screen.getByText("SISTEMAS")).toBeInTheDocument();
    });
  });

  describe("T10: Pagination controls render with disabled Previous/Next and page click", () => {
    const multiPageResponse = {
      success: true as const,
      data: [mockPerfiles[0]],
      total: 25,
      page: 1,
      pageSize: 10,
      totalPages: 3,
    };

    it("renders pagination with Previous disabled on page 1", async () => {
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<PerfilesPage />);

      // Wait for pagination controls
      await waitFor(() => {
        expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
      });

      // Check "Mostrando X-Y de Z resultados" text
      expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();

      // Previous button should be disabled on page 1
      const prevButton = screen.getByRole("button", { name: /anterior/i });
      expect(prevButton).toBeDisabled();

      // Next button should be enabled (not last page yet)
      const nextButton = screen.getByRole("button", { name: /siguiente/i });
      expect(nextButton).not.toBeDisabled();
    });

    it("clicks page 2 and fires a new search", async () => {
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<PerfilesPage />);

      // Wait for pagination controls
      await waitFor(() => {
        expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();
      });

      // Clear initial calls
      mockedSearch.mockClear();

      // Click page 2 button
      const page2Button = screen.getByRole("button", { name: /^2$/ });
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
    });

    it("disables Next on last page", async () => {
      const lastPageResponse = {
        success: true as const,
        data: [mockPerfiles[0]],
        total: 25,
        page: 3,
        pageSize: 10,
        totalPages: 3,
      };

      mockedSearch
        .mockResolvedValueOnce(multiPageResponse)  // initial load
        .mockResolvedValueOnce(lastPageResponse);    // after clicking page 3

      render(<PerfilesPage />);

      // Wait for pagination
      await waitFor(() => {
        expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();
      });

      // Clear initial calls
      mockedSearch.mockClear();

      // Click page 3
      const page3Button = screen.getByRole("button", { name: /^3$/ });
      fireEvent.click(page3Button);

      // After page 3, Next should be disabled
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /siguiente/i });
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe("T11: 4 grid states (loading, empty, error+retry, populated)", () => {
    it("shows loading spinner during search", async () => {
      // Never-resolving promise to keep component in loading state
      mockedSearch.mockReturnValue(new Promise(() => {}));

      render(<PerfilesPage />);

      // Loading spinner should appear
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
        pageSize: 10,
        totalPages: 0,
      });

      render(<PerfilesPage />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron perfiles/i)).toBeInTheDocument();
      });
    });

    it("shows error message with retry button", async () => {
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<PerfilesPage />);

      await waitFor(() => {
        expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
      });

      // Retry button should be present
      const retryButton = screen.getByRole("button", { name: /reintentar/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("retry button triggers new search", async () => {
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<PerfilesPage />);

      await waitFor(() => {
        expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
      });

      // Clear initial calls and set up success for retry
      mockedSearch.mockClear();
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      // Click Reintentar
      const retryButton = screen.getByRole("button", { name: /reintentar/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
    });

    it("shows populated grid with data rows", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<PerfilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("perfiles-grid")).toBeInTheDocument();
      });

      // Data rows should be visible
      expect(screen.getByText("ADMINISTRACION")).toBeInTheDocument();
      expect(screen.getByText("SISTEMAS")).toBeInTheDocument();

      // Edit and delete buttons should be enabled (one per row)
      const editButtons = screen.getAllByRole("button", { name: /editar/i });
      expect(editButtons.length).toBe(mockPerfiles.length);
      editButtons.forEach((btn) => expect(btn).not.toBeDisabled());
      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      expect(deleteButtons.length).toBe(mockPerfiles.length);
      deleteButtons.forEach((btn) => expect(btn).not.toBeDisabled());
    });
  });
});
