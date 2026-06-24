import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/accesos", () => ({
  searchAccesosAction: vi.fn(),
  fetchMenusAction: vi.fn(),
  fetchModulosAction: vi.fn(),
}));

import { searchAccesosAction, fetchMenusAction } from "@/actions/accesos";
import AccesosPage from "./page";

const mockedSearch = vi.mocked(searchAccesosAction);
const mockedFetchMenus = vi.mocked(fetchMenusAction);

const mockAccesos = [
  { id_acceso: "01.00.00", orden: "M", nombre: "Administración Tributaria", id_objeto: "", icono: "", doform: "", nestado: "1" },
  { id_acceso: "01.01.01", orden: "O", nombre: "Consulta De Predios", id_objeto: "", icono: "", doform: "consultapred/index", nestado: "1" },
  { id_acceso: "01.01.03", orden: "O", nombre: "Editar Contribuyente", id_objeto: "", icono: "iconEditContri", doform: "", nestado: "0" },
];

const defaultSearchResponse = {
  success: true as const,
  data: mockAccesos,
  total: 3,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

const defaultMenusResponse = { success: true as const, data: [] as { id_acceso: string; nommenu: string }[] };

describe("Accesos page component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchMenus.mockResolvedValue(defaultMenusResponse);
  });

  describe("T7: Renders 5 search fields (2 text inputs + 3 selects)", () => {
    it("renders 2 text inputs and 3 select elements", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<AccesosPage />);

      // Wait for initial loading to finish
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // 2 text inputs: Acceso, Nombre
      const textInputs = screen.getAllByRole("textbox");
      expect(textInputs).toHaveLength(2);

      // Verify placeholder texts to confirm each field
      expect(screen.getByPlaceholderText(/código de acceso/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/nombre del acceso/i)).toBeInTheDocument();

      // 3 selects: Menú, Módulo, Tipo
      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(3);
    });
  });

  describe("T8: Search button + Enter key trigger API call", () => {
    it("clicks Buscar button and calls searchAccesosAction with current filters", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<AccesosPage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Clear calls from the initial mount search
      mockedSearch.mockClear();

      // Type in a filter
      const accesoInput = screen.getByPlaceholderText(/código de acceso/i);
      fireEvent.change(accesoInput, { target: { value: "01" } });

      // Click Buscar button
      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      fireEvent.click(buscarButton);

      // Should have called search with updated filters
      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ id_acceso: "01" }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("presses Enter in acceso field and calls searchAccesosAction", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<AccesosPage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Clear calls from the initial mount search
      mockedSearch.mockClear();

      // Type a filter and press Enter
      const accesoInput = screen.getByPlaceholderText(/código de acceso/i);
      fireEvent.change(accesoInput, { target: { value: "02" } });
      fireEvent.keyDown(accesoInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ id_acceso: "02" }),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("T9: Grid renders 8 columns with data", () => {
    it("displays 8 column headers and populated data rows", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<AccesosPage />);

      // Wait for the grid table to render
      await waitFor(() => {
        expect(screen.getByTestId("accesos-grid")).toBeInTheDocument();
      });

      // Check 8 column headers
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(8);
      expect(headers[0]).toHaveTextContent(/id acceso/i);
      expect(headers[1]).toHaveTextContent(/tipo/i);
      expect(headers[2]).toHaveTextContent(/nombre/i);
      expect(headers[3]).toHaveTextContent(/id objeto/i);
      expect(headers[4]).toHaveTextContent(/icono/i);
      expect(headers[5]).toHaveTextContent(/formulario/i);
      expect(headers[6]).toHaveTextContent(/estado/i);
      expect(headers[7]).toHaveTextContent(/acciones/i);

      // Check data rows display content
      expect(screen.getByText("Administración Tributaria")).toBeInTheDocument();
      expect(screen.getByText("Consulta De Predios")).toBeInTheDocument();
      expect(screen.getByText("Editar Contribuyente")).toBeInTheDocument();

      // Check Estado badge: green for nestado=1, red for nestado=0
      expect(screen.getAllByText("Activo")).toHaveLength(2);
      expect(screen.getAllByText("Inactivo")).toHaveLength(1);

      // Check Tipo badge: "MENU" for orden="M", "OBJETOS" for orden="O"
      // (count includes the <option> text in the Tipo filter select)
      expect(screen.getAllByText("MENU")).toHaveLength(2);
      expect(screen.getAllByText("OBJETOS")).toHaveLength(3);
    });
  });

  describe("T10: Pagination controls render with disabled Previous/Next and page click", () => {
    const multiPageResponse = {
      success: true as const,
      data: [mockAccesos[0]],
      total: 25,
      page: 1,
      pageSize: 10,
      totalPages: 3,
    };

    it("renders pagination with Previous disabled on page 1", async () => {
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<AccesosPage />);

      // Wait for pagination controls
      await waitFor(() => {
        expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
      });

      // Check "Mostrando X–Y de Z resultados" text
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

      render(<AccesosPage />);

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
        data: [mockAccesos[0]],
        total: 25,
        page: 3,
        pageSize: 10,
        totalPages: 3,
      };

      mockedSearch
        .mockResolvedValueOnce(multiPageResponse)  // initial load
        .mockResolvedValueOnce(lastPageResponse);    // after clicking page 3

      render(<AccesosPage />);

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

      render(<AccesosPage />);

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

      render(<AccesosPage />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron accesos/i)).toBeInTheDocument();
      });
    });

    it("shows error message with retry button", async () => {
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<AccesosPage />);

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

      render(<AccesosPage />);

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

    it("shows populated grid with Edit and Delete buttons", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<AccesosPage />);

      await waitFor(() => {
        expect(screen.getByTestId("accesos-grid")).toBeInTheDocument();
      });

      // Data rows should be visible
      expect(screen.getByText("Administración Tributaria")).toBeInTheDocument();
      expect(screen.getByText("Consulta De Predios")).toBeInTheDocument();
      expect(screen.getByText("Editar Contribuyente")).toBeInTheDocument();

      // Edit and Delete buttons should be enabled (one per row)
      const editButtons = screen.getAllByRole("button", { name: /editar/i });
      expect(editButtons.length).toBe(mockAccesos.length);
      editButtons.forEach((btn) => expect(btn).not.toBeDisabled());

      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      expect(deleteButtons.length).toBe(mockAccesos.length);
      deleteButtons.forEach((btn) => expect(btn).not.toBeDisabled());
    });
  });
});
