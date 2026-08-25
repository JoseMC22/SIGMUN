import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrearAlcabalaModal from "./crear-alcabala-modal";
import type { ContribuyenteItem } from "@/actions/alcabala/determinar-alcabala";

// Mock server actions
vi.mock("@/actions/alcabala/crear-alcabala", () => ({
  crearAlcabalaAction: vi.fn(),
}));

vi.mock("@/actions/alcabala/determinar-alcabala", () => ({
  searchContribuyenteAction: vi.fn(),
}));

import { crearAlcabalaAction } from "@/actions/alcabala/crear-alcabala";
import { searchContribuyenteAction } from "@/actions/alcabala/determinar-alcabala";

const mockedCrear = vi.mocked(crearAlcabalaAction);
const mockedSearch = vi.mocked(searchContribuyenteAction);

const mockContribuyente: ContribuyenteItem = {
  codigo: "0279126",
  paterno: "GARCIA",
  materno: "LOPEZ",
  nombres: "MARIA",
  numDoc: "12345678",
  direccion: "JR. PRINCIPAL 123",
  row: 1,
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  contribuyente: mockContribuyente,
};

describe("CrearAlcabalaModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCrear.mockResolvedValue({ success: true, idAlcabala: 42 });
    mockedSearch.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 15,
      totalPages: 0,
    });
  });

  // ── Rendering ──────────────────────────────────────────

  it("renders nothing when open is false", () => {
    const { container } = render(
      <CrearAlcabalaModal {...defaultProps} open={false} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders all 4 collapsible sections when open", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    expect(screen.getByText("Comprador")).toBeInTheDocument();
    expect(screen.getByText("Vendedor")).toBeInTheDocument();
    expect(screen.getByText("Predio / Contrato")).toBeInTheDocument();
    expect(screen.getByText("Montos")).toBeInTheDocument();
  });

  it("renders Guardar and Cancelar buttons in footer", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    expect(screen.getByText("Guardar")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  // ── Collapsible sections ───────────────────────────────

  it("starts with all sections expanded by default", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    // All inputs from different sections should be visible
    // Use getByDisplayValue for Comprador (pre-filled) to avoid duplicate "Nombres" label
    expect(screen.getByDisplayValue("0279126")).toBeInTheDocument();
    expect(screen.getByLabelText("Código Predio")).toBeInTheDocument();
  });

  it("collapses and expands Vendedor section when header is clicked", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Section headers have aria-label like "Colapsar Vendedor"
    const vendedorHeader = screen.getByRole("button", {
      name: /Colapsar Vendedor/i,
    });
    await user.click(vendedorHeader);

    // After collapsing Vendedor, we should NOT see the Vendedor inputs
    expect(
      screen.getByRole("button", { name: /Expandir Vendedor/i }),
    ).toBeInTheDocument();

    // Re-expand
    const expandBtn = screen.getByRole("button", { name: /Expandir Vendedor/i });
    await user.click(expandBtn);

    // Now Vendedor inputs should be visible again (Colapsar label means expanded)
    expect(
      screen.getByRole("button", { name: /Colapsar Vendedor/i }),
    ).toBeInTheDocument();
  });

  // ── Comprador auto-fill from props ─────────────────────

  it("pre-fills Comprador fields from contribuyente prop", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    expect(screen.getByDisplayValue("0279126")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MARIA GARCIA LOPEZ")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("JR. PRINCIPAL 123")).toBeInTheDocument();
  });

  // ── Auto-calc montoAlcabala ────────────────────────────

  it("auto-calculates montoAlcabala when montoAfecto changes", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const montoAfectoInput = screen.getByLabelText("Monto Afecto");
    await user.clear(montoAfectoInput);
    await user.type(montoAfectoInput, "100000");

    // montoAlcabala = (montoAfecto - montoInafecto) * 0.03
    // montoInafecto defaults to 0, so: (100000 - 0) * 0.03 = 3000
    await waitFor(() => {
      const montoAlcabalaInput = screen.getByLabelText(
        "Monto Alcabala",
      ) as HTMLInputElement;
      expect(Number(montoAlcabalaInput.value)).toBeCloseTo(3000, 0);
    });
  });

  it("auto-calculates montoAlcabala accounting for montoInafecto", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const montoAfectoInput = screen.getByLabelText("Monto Afecto");
    await user.clear(montoAfectoInput);
    await user.type(montoAfectoInput, "100000");

    const montoInafectoInput = screen.getByLabelText("Monto Inafecto");
    await user.clear(montoInafectoInput);
    await user.type(montoInafectoInput, "10000");

    // (100000 - 10000) * 0.03 = 2700
    await waitFor(() => {
      const montoAlcabalaInput = screen.getByLabelText(
        "Monto Alcabala",
      ) as HTMLInputElement;
      expect(Number(montoAlcabalaInput.value)).toBeCloseTo(2700, 0);
    });
  });

  // ── Submit flow ────────────────────────────────────────

  it("calls crearAlcabalaAction with form data on Guardar click", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Fill in required predio fields
    const codPredInput = screen.getByLabelText("Código Predio");
    await user.clear(codPredInput);
    await user.type(codPredInput, "P001");

    const anioPredInput = screen.getByLabelText("Año Predio");
    await user.clear(anioPredInput);
    await user.type(anioPredInput, "2026");

    const montoAfectoInput = screen.getByLabelText("Monto Afecto");
    await user.clear(montoAfectoInput);
    await user.type(montoAfectoInput, "100000");

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedCrear).toHaveBeenCalledTimes(1);
    });

    const calledDto = mockedCrear.mock.calls[0][0];
    expect(calledDto.codigoCompra).toBe("0279126");
    expect(calledDto.nombres).toBe("MARIA GARCIA LOPEZ");
    expect(calledDto.numDoc).toBe("12345678");
    expect(calledDto.montoAfecto).toBe(100000);
    expect(calledDto.codPred).toBe("P001");
  });

  it("calls onSuccess on successful creation", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} onSuccess={onSuccess} />);

    // Fill required fields
    await user.type(screen.getByLabelText("Código Predio"), "P001");
    await user.type(screen.getByLabelText("Año Predio"), "2026");
    await user.type(screen.getByLabelText("Monto Afecto"), "100000");

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error message when creation fails", async () => {
    mockedCrear.mockResolvedValue({
      success: false,
      error: "Error al crear alcabala",
    });

    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Fill required fields
    await user.type(screen.getByLabelText("Código Predio"), "P001");
    await user.type(screen.getByLabelText("Año Predio"), "2026");
    await user.type(screen.getByLabelText("Monto Afecto"), "100000");

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(screen.getByText("Error al crear alcabala")).toBeInTheDocument();
    });
  });

  it("disables Guardar button while submitting", async () => {
    // Don't resolve immediately so we can check disabled state
    mockedCrear.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true, idAlcabala: 42 }), 100),
        ),
    );

    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.type(screen.getByLabelText("Código Predio"), "P001");
    await user.type(screen.getByLabelText("Año Predio"), "2026");
    await user.type(screen.getByLabelText("Monto Afecto"), "100000");

    const guardarButton = screen.getByText("Guardar");
    await user.click(guardarButton);

    expect(guardarButton).toBeDisabled();
  });

  it("closes modal on successful creation", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} onClose={onClose} />);

    // Fill required fields
    await user.type(screen.getByLabelText("Código Predio"), "P001");
    await user.type(screen.getByLabelText("Año Predio"), "2026");
    await user.type(screen.getByLabelText("Monto Afecto"), "100000");

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Contribuyente search ───────────────────────────────

  it("disables the Comprador search button because data comes from the selected contribuyente", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    const btn = screen.getByLabelText("Buscar contribuyente comprador");
    expect(btn).toBeDisabled();
  });

  it("opens search popup for Vendedor when its search button is clicked", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));

    await waitFor(() => {
      expect(screen.getByText("Buscar Contribuyente")).toBeInTheDocument();
    });
  });

  it("keeps Buscar disabled until at least one criteria field is filled", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));

    const buscarBtn = await screen.findByText("Buscar");
    expect(buscarBtn).toBeDisabled();

    await user.type(screen.getByLabelText("A. Paterno"), "PEREZ");
    expect(buscarBtn).not.toBeDisabled();
  });

  it("fills Vendedor fields when search result is selected", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Open search popup for Vendedor
    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));

    mockedSearch.mockResolvedValueOnce({
      success: true,
      data: [
        {
          codigo: "0654321",
          paterno: "PEREZ",
          materno: "RAMIREZ",
          nombres: "JUAN",
          numDoc: "87654321",
          direccion: "AV. PRINCIPAL 456",
          row: 1,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    await user.type(screen.getByLabelText("A. Paterno"), "PEREZ");
    await user.click(screen.getByText("Buscar"));

    // tipoBusqueda='N' maps query to paterno/materno/nombres separately
    expect(mockedSearch).toHaveBeenCalledWith("N", undefined, "PEREZ", "", "");

    await waitFor(() => {
      expect(screen.getByText(/0654321/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/0654321/));

    // Popup should close and fields should be filled
    await waitFor(() => {
      expect(
        screen.queryByText("Buscar Contribuyente"),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("0654321")).toBeInTheDocument();
  });

  // ── Cancel ─────────────────────────────────────────────

  it("calls onClose when Cancelar is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("Cancelar"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Escape key ────────────────────────────────────────

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<CrearAlcabalaModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Porcentaje de Transferencia ───────────────────────

  it("renders the Porcentaje de Transferencia input", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    expect(
      screen.getByLabelText(/Porc\. de Transf\./i),
    ).toBeInTheDocument();
  });

  it("flows porcTransferencia into the crear action payload", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.type(
      screen.getByLabelText(/Porc\. de Transf\./i),
      "75",
    );

    // Required fields to allow a successful submit
    await user.type(screen.getByLabelText("Código Predio"), "P001");
    await user.type(screen.getByLabelText("Año Predio"), "2026");
    await user.type(screen.getByLabelText("Monto Afecto"), "100000");

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedCrear).toHaveBeenCalledTimes(1);
    });

    const calledDto = mockedCrear.mock.calls[0][0];
    expect(calledDto.porcTransferencia).toBe(75);
  });

  it("keeps decimal value '7.5' in the input (no Math.max/Number corruption) and sends 7.5", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const input = screen.getByLabelText(
      /Porc\. de Transf\./i,
    ) as HTMLInputElement;

    await user.type(input, "7.5");

    // Raw string preserved while typing ("7." -> "7.5"), not coerced to 7/75
    expect(input.value).toBe("7.5");

    await user.type(screen.getByLabelText("Código Predio"), "P001");
    await user.type(screen.getByLabelText("Año Predio"), "2026");
    await user.type(screen.getByLabelText("Monto Afecto"), "100000");

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedCrear).toHaveBeenCalledTimes(1);
    });

    expect(mockedCrear.mock.calls[0][0].porcTransferencia).toBe(7.5);
  });

  it("sends no bogus porcTransferencia when the field is typed then cleared", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const input = screen.getByLabelText(
      /Porc\. de Transf\./i,
    ) as HTMLInputElement;

    await user.type(input, "5");
    await user.clear(input);

    await user.type(screen.getByLabelText("Código Predio"), "P001");
    await user.type(screen.getByLabelText("Año Predio"), "2026");
    await user.type(screen.getByLabelText("Monto Afecto"), "100000");

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedCrear).toHaveBeenCalledTimes(1);
    });

    expect(mockedCrear.mock.calls[0][0].porcTransferencia).toBeUndefined();
  });
});
