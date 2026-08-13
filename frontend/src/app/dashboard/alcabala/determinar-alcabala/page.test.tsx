import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeterminarAlcabalaPage from "./page";

// Mock server actions
vi.mock("@/actions/alcabala/determinar-alcabala", () => ({
  searchContribuyenteAction: vi.fn(),
  getAlcabalasAction: vi.fn(),
}));

vi.mock("@/actions/alcabala/crear-alcabala", () => ({
  crearAlcabalaAction: vi.fn(),
}));

// Mock AlcabalasTable to avoid deep dependency chain
vi.mock("./alcabalas-table", () => ({
  default: ({
    data,
    loading,
    onNuevo,
  }: {
    data: unknown[];
    loading: boolean;
    onNuevo?: () => void;
  }) => (
    <div data-testid="alcabalas-table">
      {loading ? "Cargando..." : `${data.length} registros`}
      {onNuevo && (
        <button type="button" onClick={onNuevo}>
          Nuevo
        </button>
      )}
    </div>
  ),
}));

// Mock CrearAlcabalaModal to verify it gets rendered
vi.mock("./crear-alcabala-modal", () => ({
  default: ({ open, onSuccess }: { open: boolean; onSuccess: () => void }) =>
    open ? (
      <div data-testid="crear-alcabala-modal">
        <button onClick={onSuccess}>Simular Creación Exitosa</button>
      </div>
    ) : null,
}));

import { searchContribuyenteAction, getAlcabalasAction } from "@/actions/alcabala/determinar-alcabala";
import { crearAlcabalaAction } from "@/actions/alcabala/crear-alcabala";

const mockedSearch = vi.mocked(searchContribuyenteAction);
const mockedGetAlcabalas = vi.mocked(getAlcabalasAction);
const mockedCrear = vi.mocked(crearAlcabalaAction);

const mockSearchResults = {
  success: true,
  data: [
    {
      codigo: "0279126",
      paterno: "GARCIA",
      materno: "LOPEZ",
      nombres: "MARIA",
      numDoc: "12345678",
      direccion: "JR. PRINCIPAL 123",
      row: 1,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 15,
  totalPages: 1,
};

const mockAlcabalas = {
  success: true,
  data: [
    {
      idAlcabala: 1,
      fechaRegistro: "2024-01-15",
      montoAlcabala: 1500.5,
      codPred: "001",
      anioPred: "2024",
      codigoVenta: "V001",
      estado: "1",
    },
  ],
};

describe("DeterminarAlcabalaPage — modal integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSearch.mockResolvedValue(mockSearchResults);
    mockedGetAlcabalas.mockResolvedValue(mockAlcabalas);
    mockedCrear.mockResolvedValue({ success: true, idAlcabala: 42 });
  });

  it("opens modal when clicking Determinar on a contribuyente", async () => {
    const user = userEvent.setup();
    render(<DeterminarAlcabalaPage />);

    // Search for a contribuyente
    const searchInput = screen.getByPlaceholderText("Ej: 0279126");
    await user.type(searchInput, "0279126");
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText("GARCIA")).toBeInTheDocument();
    });

    // Click Determinar
    await user.click(screen.getByRole("button", { name: /determinar/i }));

    // Modal should open with contribuyente info in header
    await waitFor(() => {
      expect(screen.getByText(/Alcabalas — 0279126/)).toBeInTheDocument();
    });
  });

  it("preserves search results after modal closes", async () => {
    const user = userEvent.setup();
    render(<DeterminarAlcabalaPage />);

    // Search
    const searchInput = screen.getByPlaceholderText("Ej: 0279126");
    await user.type(searchInput, "0279126");
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText("GARCIA")).toBeInTheDocument();
    });

    // Click Determinar
    await user.click(screen.getByRole("button", { name: /determinar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Alcabalas — 0279126/)).toBeInTheDocument();
    });

    // Close modal with Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Search results should still be visible (GARCIA from the search table)
    await waitFor(() => {
      expect(screen.getByText("GARCIA")).toBeInTheDocument();
    });
  });

  // ── Crear flow ──────────────────────────────────────────

  it("opens CrearAlcabalaModal when Nueva Alcabala is triggered", async () => {
    const user = userEvent.setup();
    render(<DeterminarAlcabalaPage />);

    // Search + Select
    const searchInput = screen.getByPlaceholderText("Ej: 0279126");
    await user.type(searchInput, "0279126");
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText("GARCIA")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /determinar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Alcabalas — 0279126/)).toBeInTheDocument();
    });

    // Click Nueva Alcabala (always-active "Nuevo" button lives in the table toolbar, spec rev 2)
    await user.click(screen.getByText("Nuevo"));

    // CrearAlcabalaModal should be visible (mock renders with data-testid)
    await waitFor(() => {
      expect(screen.getByTestId("crear-alcabala-modal")).toBeInTheDocument();
    });
  });

  it("refreshes alcabalas list on successful creation", async () => {
    const user = userEvent.setup();
    render(<DeterminarAlcabalaPage />);

    // Search + Select
    const searchInput = screen.getByPlaceholderText("Ej: 0279126");
    await user.type(searchInput, "0279126");
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText("GARCIA")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /determinar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Alcabalas — 0279126/)).toBeInTheDocument();
    });

    // Click Nueva Alcabala (always-active "Nuevo" button lives in the table toolbar, spec rev 2)
    await user.click(screen.getByText("Nuevo"));

    await waitFor(() => {
      expect(screen.getByTestId("crear-alcabala-modal")).toBeInTheDocument();
    });

    // Simulate successful creation
    await user.click(screen.getByText("Simular Creación Exitosa"));

    // getAlcabalasAction should be called again to refresh
    await waitFor(() => {
      expect(mockedGetAlcabalas).toHaveBeenCalledTimes(2);
    });
    expect(mockedGetAlcabalas).toHaveBeenLastCalledWith("0279126");
  });
});
