import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/mantenimiento-vias", () => ({
  searchViasAction: vi.fn(),
  getTiposUrbanizacionAction: vi.fn(),
  createUrbanizacionAction: vi.fn(),
  getUrbanizacionAction: vi.fn(),
  updateUrbanizacionAction: vi.fn(),
  getTiposViaAction: vi.fn(),
  getUrbanizacionesAction: vi.fn(),
  getZonasAction: vi.fn(),
  getViaAction: vi.fn(),
  createViaAction: vi.fn(),
  updateViaAction: vi.fn(),
  buscarUrbanizacionesAction: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getStoredUser: vi.fn(() => ({ username: "jperez" })),
  getPcName: vi.fn(() => "PC-TEST"),
  fetchPcName: vi.fn(() => Promise.resolve("PC-TEST")),
  setPcName: vi.fn(),
}));

import { searchViasAction } from "@/actions/mantenimiento-vias";
import MantenimientoViasPage from "./page";

const mockedSearch = vi.mocked(searchViasAction);

// Mock data matching page.tsx ViasRow interface:
// { cod_via, zona, urba, nombre_via, vcuadra, vlado, nestado }
const defaultSearchResponse = {
  success: true as const,
  data: [
    { cod_via: "V001", zona: "NORTE", urba: "URB A", nombre_via: "Av. Principal", vcuadra: "1", vlado: "1", nestado: "1" },
    { cod_via: "V002", zona: "SUR", urba: "URB B", nombre_via: "Calle Secundaria", vcuadra: "2", vlado: "2", nestado: "1" },
    { cod_via: "V003", zona: "CENTRO", urba: "URB C", nombre_via: "Jr. Central", vcuadra: "3", vlado: "1", nestado: "0" },
  ],
  total: 3,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

describe("MantenimientoViasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── T4.1: Filter renders fields, Enter triggers search ──

  describe("T4.1: Filter renders fields, Enter triggers search", () => {
    it("renders 4 text inputs and 1 select for filters", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      const textInputs = screen.getAllByRole("textbox");
      expect(textInputs).toHaveLength(4);

      expect(screen.getByPlaceholderText(/código/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/zona/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/urbanización/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument();

      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(1);
    });

    it("pressing Enter in codigo field triggers search with current filters", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      mockedSearch.mockClear();
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      const codigoInput = screen.getByPlaceholderText(/código/i);
      fireEvent.change(codigoInput, { target: { value: "V001" } });
      fireEvent.keyDown(codigoInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ cod_via: "V001" }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("pressing Enter in zona field triggers search", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      mockedSearch.mockClear();
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      const zonaInput = screen.getByPlaceholderText(/zona/i);
      fireEvent.change(zonaInput, { target: { value: "NORTE" } });
      fireEvent.keyDown(zonaInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(mockedSearch).toHaveBeenCalledTimes(1);
      });
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ nom_zona: "NORTE" }),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  // ── T4.2: Table renders data, pagination handles clicks ──

  describe("T4.2: Table renders data, pagination handles clicks", () => {
    it("displays column headers and populated data rows", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.getByTestId("mv-grid")).toBeInTheDocument();
      });

      const headers = screen.getAllByRole("columnheader");
      expect(headers.length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText("V001")).toBeInTheDocument();
      expect(screen.getByText("NORTE")).toBeInTheDocument();
    });

    it("renders pagination with Previous disabled on page 1", async () => {
      const multiPageResponse = {
        success: true as const,
        data: [defaultSearchResponse.data[0]],
        total: 25,
        page: 1,
        pageSize: 10,
        totalPages: 3,
      };
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
      });

      const prevButton = screen.getByRole("button", { name: /anterior/i });
      expect(prevButton).toBeDisabled();

      const nextButton = screen.getByRole("button", { name: /siguiente/i });
      expect(nextButton).not.toBeDisabled();
    });

    it("clicks page 2 and fires a new search", async () => {
      const multiPageResponse = {
        success: true as const,
        data: [defaultSearchResponse.data[0]],
        total: 25,
        page: 1,
        pageSize: 10,
        totalPages: 3,
      };
      mockedSearch.mockResolvedValue(multiPageResponse);

      render(<MantenimientoViasPage />);

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

  // ── T4.3: Loading/empty/error states ──

  describe("T4.3: Loading, empty, and error states", () => {
    it("shows loading spinner during initial search", async () => {
      mockedSearch.mockReturnValue(new Promise(() => {}));

      render(<MantenimientoViasPage />);

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
        pageSize: 20,
        totalPages: 0,
      });

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron resultados/i)).toBeInTheDocument();
      });
    });

    it("shows error message with retry button", async () => {
      mockedSearch.mockResolvedValue({
        success: false as const,
        error: "Error del servidor",
      });

      render(<MantenimientoViasPage />);

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

      render(<MantenimientoViasPage />);

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

    it("shows populated grid with data", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.getByTestId("mv-grid")).toBeInTheDocument();
      });

      expect(screen.getByText("V001")).toBeInTheDocument();
      expect(screen.getByText("NORTE")).toBeInTheDocument();
    });
  });

  // ── T4.4: Both modals open/close ──

  describe("T4.4: Modals open and close", () => {
    it("opens Urbanización modal via button click", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      const urbanizacionButton = screen.getByRole("button", { name: /nueva urbanización/i });
      fireEvent.click(urbanizacionButton);

      expect(screen.getByTestId("urbanizacion-modal")).toBeInTheDocument();
    });

    it("opens Nueva Vía modal via button click", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      const viaButton = screen.getByRole("button", { name: /nueva vía/i });
      fireEvent.click(viaButton);

      expect(screen.getByTestId("via-crud-modal")).toBeInTheDocument();
    });

    it("closes Urbanización modal via close button (X)", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      const urbanizacionButton = screen.getByRole("button", { name: /nueva urbanización/i });
      fireEvent.click(urbanizacionButton);

      expect(screen.getByTestId("urbanizacion-modal")).toBeInTheDocument();

      const closeButton = screen.getByLabelText("Cerrar");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("urbanizacion-modal")).not.toBeInTheDocument();
      });
    });

    it("closes Vía modal via Escape key", async () => {
      mockedSearch.mockResolvedValue(defaultSearchResponse);

      render(<MantenimientoViasPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      const viaButton = screen.getByRole("button", { name: /nueva vía/i });
      fireEvent.click(viaButton);

      expect(screen.getByTestId("via-crud-modal")).toBeInTheDocument();

      const overlay = screen.getByTestId("via-crud-modal").parentElement ?? screen.getByTestId("via-crud-modal");
      fireEvent.keyDown(overlay, { key: "Escape", code: "Escape" });

      await waitFor(() => {
        expect(screen.queryByTestId("via-crud-modal")).not.toBeInTheDocument();
      });
    });
  });
});
