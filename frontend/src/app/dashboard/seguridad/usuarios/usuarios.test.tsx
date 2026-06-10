import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/usuarios", () => ({
  searchUsuariosAction: vi.fn(),
  fetchAreasAction: vi.fn(),
  fetchPerfilesAction: vi.fn(),
  fetchUsuarioDetailAction: vi.fn(),
  fetchTiposDocumentoAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchCajerosAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
  updateUsuarioAction: vi.fn(),
  cambiarClaveAction: vi.fn(),
  eliminarUsuarioAction: vi.fn(),
}));

import {
  searchUsuariosAction,
  fetchAreasAction,
  fetchPerfilesAction,
} from "@/actions/usuarios";
import UsuariosPage from "./page";

const mockedSearch = vi.mocked(searchUsuariosAction);
const mockedAreas = vi.mocked(fetchAreasAction);
const mockedPerfiles = vi.mocked(fetchPerfilesAction);

const mockAreas = [
  { area: "IT", nombre: "Informática" },
  { area: "RH", nombre: "Recursos Humanos" },
];

const mockPerfiles = [
  { id_perfil: "1", nombre: "Administrador" },
  { id_perfil: "2", nombre: "Operador" },
];

const mockUsuarios = [
  { id: "1", nombre: "Juan Pérez", area: "IT", perfil: "Admin", usuario: "jperez", estado: "1" },
  { id: "2", nombre: "María García", area: "RH", perfil: "Operador", usuario: "mgarcia", estado: "0" },
];

const defaultSearchResponse = {
  success: true as const,
  data: mockUsuarios,
  total: 2,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

describe("Usuarios page component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("T7: Renders 6 search fields (3 text inputs, 3 selects)", () => {
    it("renders 3 text inputs and 3 select elements", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<UsuariosPage />);

      // Wait for initial loading to finish
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // 3 text inputs: Código, Nombres y Apellidos, Usuario
      const textInputs = screen.getAllByRole("textbox");
      expect(textInputs).toHaveLength(3);

      // Verify placeholder texts to confirm each field
      expect(screen.getByPlaceholderText(/código/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/nombres/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/usuario/i)).toBeInTheDocument();

      // 3 selects: Área, Perfil, Estado
      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(3);
    });
  });

  describe("T8: Search button + Enter key trigger API call", () => {
    it("clicks Buscar button and calls searchUsuariosAction with current filters", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<UsuariosPage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Clear calls from the initial mount search
      mockedSearch.mockClear();

      // Type in a filter
      const codigoInput = screen.getByPlaceholderText(/código/i);
      fireEvent.change(codigoInput, { target: { value: "EMP001" } });

      // Click Buscar button
      const buscarButton = screen.getByRole("button", { name: /buscar/i });
      fireEvent.click(buscarButton);

      // Should have called search with updated filters
      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: "EMP001" }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("presses Enter in codigo field and calls searchUsuariosAction", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<UsuariosPage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      // Clear calls from the initial mount search
      mockedSearch.mockClear();

      // Type a filter and press Enter
      const codigoInput = screen.getByPlaceholderText(/código/i);
      fireEvent.change(codigoInput, { target: { value: "EMP002" } });
      fireEvent.keyDown(codigoInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: "EMP002" }),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("T9: Grid renders 6 columns with data", () => {
    it("displays 6 column headers and populated data rows", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<UsuariosPage />);

      // Wait for the grid table to render
      await waitFor(() => {
        expect(screen.getByTestId("usuarios-grid")).toBeInTheDocument();
      });

      // Check 7 column headers
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(7);
      expect(headers[0]).toHaveTextContent(/código/i);
      expect(headers[1]).toHaveTextContent(/nombres y apellidos/i);
      expect(headers[2]).toHaveTextContent(/área/i);
      expect(headers[3]).toHaveTextContent(/perfil/i);
      expect(headers[4]).toHaveTextContent(/usuario/i);
      expect(headers[5]).toHaveTextContent(/estado/i);
      expect(headers[6]).toHaveTextContent(/acciones/i);

      // Check data rows display content
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("María García")).toBeInTheDocument();
      expect(screen.getByText("jperez")).toBeInTheDocument();
      expect(screen.getByText("mgarcia")).toBeInTheDocument();
    });
  });

  describe("T10: Pagination controls render with disabled Previous/Next and page click", () => {
    const multiPageResponse = {
      success: true as const,
      data: [mockUsuarios[0]],  // 1 item per page for clean testing
      total: 45,
      page: 1,
      pageSize: 20,
      totalPages: 3,
    };

    it("renders pagination with Previous disabled on page 1", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<UsuariosPage />);

      // Wait for pagination controls
      await waitFor(() => {
        expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
      });

      // Check "Mostrando X-Y de Z resultados" text
      expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();

      // Previous button should be disabled on page 1
      const prevButton = screen.getByRole("button", { name: /anterior/i });
      expect(prevButton).toBeDisabled();

      // Next button should be enabled (not page 3 yet)
      const nextButton = screen.getByRole("button", { name: /siguiente/i });
      expect(nextButton).not.toBeDisabled();
    });

    it("clicks page 2 and fires a new search", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<UsuariosPage />);

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
        data: [mockUsuarios[0]],
        total: 45,
        page: 3,
        pageSize: 20,
        totalPages: 3,
      };

      // Second call (page 3) returns last page data
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch
        .mockResolvedValueOnce(multiPageResponse)  // initial load
        .mockResolvedValueOnce(lastPageResponse);    // after clicking page 3

      render(<UsuariosPage />);

      // Wait for pagination
      await waitFor(() => {
        expect(screen.getByText(/mostrando.*resultados/i)).toBeInTheDocument();
      });

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
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });

      render(<UsuariosPage />);

      // Loading spinner should appear
      await waitFor(() => {
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      });
    });

    it("shows empty message when no results", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue({
        success: true as const,
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      render(<UsuariosPage />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron usuarios/i)).toBeInTheDocument();
      });
    });

    it("shows error message with retry button", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<UsuariosPage />);

      await waitFor(() => {
        expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
      });

      // Retry button should be present
      const retryButton = screen.getByRole("button", { name: /reintentar/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("retry button triggers new search", async () => {
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<UsuariosPage />);

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
      mockedAreas.mockResolvedValue({ success: true, data: mockAreas });
      mockedPerfiles.mockResolvedValue({ success: true, data: mockPerfiles });
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<UsuariosPage />);

      await waitFor(() => {
        expect(screen.getByTestId("usuarios-grid")).toBeInTheDocument();
      });

      // Data rows should be visible
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("María García")).toBeInTheDocument();

      // Edit and delete buttons should be enabled (one per row)
      const editButtons = screen.getAllByRole("button", { name: /editar/i });
      expect(editButtons.length).toBe(mockUsuarios.length);
      editButtons.forEach((btn) => expect(btn).not.toBeDisabled());
      const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
      expect(deleteButtons.length).toBe(mockUsuarios.length);
      deleteButtons.forEach((btn) => expect(btn).not.toBeDisabled());
    });
  });
});
