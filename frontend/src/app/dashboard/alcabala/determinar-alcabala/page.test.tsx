import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeterminarAlcabalaPage from "./page";

// Mock server actions
vi.mock("@/actions/alcabala/determinar-alcabala", () => ({
  searchContribuyenteAction: vi.fn(),
  getAlcabalasAction: vi.fn(),
}));

// Mock AlcabalasTable to avoid deep dependency chain
vi.mock("./alcabalas-table", () => ({
  default: ({ data, loading }: { data: unknown[]; loading: boolean }) => (
    <div data-testid="alcabalas-table">
      {loading ? "Cargando..." : `${data.length} registros`}
    </div>
  ),
}));

import { searchContribuyenteAction, getAlcabalasAction } from "@/actions/alcabala/determinar-alcabala";

const mockedSearch = vi.mocked(searchContribuyenteAction);
const mockedGetAlcabalas = vi.mocked(getAlcabalasAction);

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
});
