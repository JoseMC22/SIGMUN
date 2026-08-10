import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrearAlcabalaModal from "./crear-alcabala-modal";
import type {
  ContribuyenteItem,
  PredioItem,
} from "@/actions/alcabala/determinar-alcabala";

// Mock server actions
vi.mock("@/actions/alcabala/crear-alcabala", () => ({
  crearAlcabalaAction: vi.fn(),
}));

vi.mock("@/actions/alcabala/determinar-alcabala", () => ({
  searchContribuyenteAction: vi.fn(),
  searchPredioAction: vi.fn(),
  getUitAction: vi.fn(),
  getTipoCambioAction: vi.fn(),
}));

import { crearAlcabalaAction } from "@/actions/alcabala/crear-alcabala";
import {
  searchContribuyenteAction,
  searchPredioAction,
  getUitAction,
  getTipoCambioAction,
} from "@/actions/alcabala/determinar-alcabala";

const mockedCrear = vi.mocked(crearAlcabalaAction);
const mockedSearch = vi.mocked(searchContribuyenteAction);
const mockedPredioSearch = vi.mocked(searchPredioAction);
const mockedUit = vi.mocked(getUitAction);
const mockedTipoCambio = vi.mocked(getTipoCambioAction);

const mockContribuyente: ContribuyenteItem = {
  codigo: "0279126",
  paterno: "GARCIA",
  materno: "LOPEZ",
  nombres: "MARIA",
  numDoc: "12345678",
  direccion: "JR. PRINCIPAL 123",
  row: 1,
};

const mockPredio: PredioItem = {
  codigo: "0279126",
  nombres: "GARCIA LOPEZ MARIA",
  codPred: "PRD001",
  porcenPropiedad: 50,
  numDoc: "12345678",
  direccFiscal: "AV. FISCAL 999",
  direccionPredio: "AV. TEST 123",
  anexo: "",
  subAnexo: "",
  totalAutoavaluo: 10000,
  tipoPred: "Predio Urbano",
  anno: "2025",
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
    // Defaults for the Montos actions — the modal auto-loads the UIT from the
    // SP whenever anioPred is a valid year, so the mock must always resolve.
    mockedUit.mockResolvedValue({ success: true, uit: "5150" });
    mockedTipoCambio.mockResolvedValue({ success: true, venta: "3.75" });
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

    // Sections are identified by their expand/collapse buttons
    expect(
      screen.getByRole("button", { name: /colapsar comprador/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /colapsar vendedor/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /colapsar predio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /colapsar montos/i }),
    ).toBeInTheDocument();
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

  it("renders the form's Fecha Contrato field as read-only", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    // With the popup closed there is a single "Fecha Contrato" field; the date
    // is driven by the search popup (onFechaContratoChange), so the form field
    // must not be directly editable
    const fechaContratoInput = screen.getByLabelText(
      "Fecha Contrato",
    ) as HTMLInputElement;
    expect(fechaContratoInput.readOnly).toBe(true);
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
    // Nombres uses "PATERNO MATERNO NOMBRES" format (plus trailing space)
    const nombresInput = screen.getByLabelText("Nombres del Comprador") as HTMLInputElement;
    expect(nombresInput.value.trim()).toBe("GARCIA LOPEZ MARIA");
    expect(screen.getByDisplayValue("12345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("JR. PRINCIPAL 123")).toBeInTheDocument();
  });

  // ── Auto-calc Montos chain (UIT→Inafecto, Transferencia/Autoavaluo→Afecto, Afecto→Alcabala) ──

  it("auto-calculates Inafecto from UIT and cascades to Afecto and Alcabala via Transferencia", async () => {
    // Mock UIT fetch returns 4000 (UIT = 4000 → Inafecto = 40000)
    mockedUit.mockResolvedValue({ success: true, uit: "4000" });
    mockedTipoCambio.mockResolvedValue({ success: true, venta: "3.8" });
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Select predio (sets Autoavaluo=10000, anioPred=2025 from mockPredio.anno)
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // Wait for UIT auto-load (anioPred = 2025 from mockPredio.anno)
    // Inafecto = UIT * 10 = 40000
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Monto Inafecto") as HTMLInputElement).value,
      ).toBe("40000.00");
    });

    // Autoavaluo from mockPredio = 10000
    // Transferencia = 0 (not set via USD/TC yet)
    // Base = Autoavaluo (10000) since Transferencia is 0
    // Afecto = 10000 - 40000 = 0 (max 0)
    // Alcabala = 0
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Afecto") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Alcabala") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });

    // Now programmatically set Transferencia to test cascade (simulate USD×TC)
    // The effect watches predio.transferencia, so we can set it via the predio state
    // We need to trigger the effect by updating predio.transferencia
    // Since we can't directly call setPredio from test, we'll test the cascade
    // in a separate test that sets up the initial conditions differently.
  });

  it("auto-calculates Afecto and Alcabala when Transferencia exceeds Inafecto", async () => {
    // Mock UIT = 4000 (Inafecto = 40000)
    mockedUit.mockResolvedValue({ success: true, uit: "4000" });
    mockedTipoCambio.mockResolvedValue({ success: true, venta: "3.8" });
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Select predio (sets Autoavaluo=10000, anioPred=2025)
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // Wait for UIT auto-load
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Monto Inafecto") as HTMLInputElement).value,
      ).toBe("40000.00");
    });

    // Now enter USD value and fetch TC → Transferencia = USD * TC
    // First set the main form's Fecha Contrato (readOnly but onChange works)
    const fechaContratoInput = screen.getByLabelText("Fecha Contrato");
    fireEvent.change(fechaContratoInput, { target: { value: "2025-06-30" } });

    // Enter USD value and click TC button
    const valorDolaresInput = screen.getByLabelText("Valor en Dólares");
    await user.type(valorDolaresInput, "20000"); // 20000 * 3.8 = 76000
    await user.click(screen.getByRole("button", { name: /consultar tipo de cambio/i }));

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Transferencia") as HTMLInputElement).value,
      ).toBe("76000.00");
    });

    // Base = Transferencia (76000) since it's > 0
    // Inafecto = 40000
    // Afecto = 76000 - 40000 = 36000
    // Alcabala = 36000 * 0.03 = 1080
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Afecto") as HTMLInputElement).value,
      );
      expect(val).toBe(36000);
    });
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Alcabala") as HTMLInputElement).value,
      );
      expect(val).toBe(1080);
    });
  });

  // ── Submit flow ────────────────────────────────────────

  it.skip("calls crearAlcabalaAction with form data on Guardar click", async () => {
    const user = userEvent.setup();
    // The predio section is read-only now — fill it through the search popup
    // flow: set the contract date, search by code and select the result row
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });
    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    // Default mode is "C" (Código) — the predio search. Contract date first;
    // its year feeds @anio to the SP and drives the form's anioPred.
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));

    // Select the result row — fills the predio + vendedor sections, closes popup
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // Wait for auto-calculations:
    // mockPredio.anno = "2025" → UIT mocked to "5150" → Inafecto = 51500
    // Autoavaluo from predio = 10000
    // Transferencia = 0 (no USD/TC)
    // Base = Autoavaluo = 10000
    // Afecto = max(0, 10000 - 51500) = 0
    // Alcabala = 0
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Monto Inafecto") as HTMLInputElement).value,
      ).toBe("51500.00");
    });
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Afecto") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Alcabala") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedCrear).toHaveBeenCalledTimes(1);
    });

    const calledDto = mockedCrear.mock.calls[0][0];
    expect(calledDto.codigoCompra).toBe("0279126");
    expect(calledDto.nombres).toBe("GARCIA LOPEZ MARIA ");
    expect(calledDto.numDoc).toBe("12345678");
    // Monto Afecto is auto-calculated to "0.00" (Autoavaluo 10000 - Inafecto 51500 = 0)
    // The form state stores string "0.00" from toFixed(2); backend coerces to number 0
    expect(calledDto.montoAfecto).toBe("0.00");
    expect(calledDto.montoAlcabala).toBe("0.00");
    // codPred / anioPred come from the selected predio row (mockPredio.anno,
    // which matches the fechaContrato year entered in the popup)
    expect(calledDto.codPred).toBe("PRD001");
    expect(calledDto.anioPred).toBe("2025");
  });

  it("calls onSuccess on successful creation", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    // The predio section is read-only now — fill it through the search popup flow
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });
    render(<CrearAlcabalaModal {...defaultProps} onSuccess={onSuccess} />);

    // Fill the predio section by searching and selecting a predio row
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // Wait for auto-calculations (same as submit test above)
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Monto Inafecto") as HTMLInputElement).value,
      ).toBe("51500.00");
    });
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Afecto") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Alcabala") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it.skip("shows error message when creation fails", async () => {
    mockedCrear.mockResolvedValue({
      success: false,
      error: "Error al crear alcabala",
    });
    // Explicitly set mocks for this test to avoid interference
    mockedUit.mockResolvedValue({ success: true, uit: "5150" });
    mockedTipoCambio.mockResolvedValue({ success: true, venta: "3.75" });
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });
    // The predio section is read-only now — fill it through the search popup flow

    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Fill the predio section by searching and selecting a predio row
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
await user.click(screen.getByText("PRD001"));

    // Wait for auto-calculations
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Monto Inafecto") as HTMLInputElement).value,
      ).toBe("51500.00");
    });
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Afecto") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Alcabala") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });

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
    // The predio section is read-only now — fill it through the search popup flow
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Fill the predio section by searching and selecting a predio row
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // Wait for auto-calculations
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Afecto") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });

    const guardarButton = screen.getByText("Guardar");
    await user.click(guardarButton);

    expect(guardarButton).toBeDisabled();
  });

  it("closes modal on successful creation", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    // The predio section is read-only now — fill it through the search popup flow
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });
    render(<CrearAlcabalaModal {...defaultProps} onClose={onClose} />);

    // Fill the predio section by searching and selecting a predio row
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // Wait for auto-calculations
    await waitFor(() => {
      const val = Number(
        (screen.getByLabelText("Monto Afecto") as HTMLInputElement).value,
      );
      expect(val).toBe(0);
    });

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Read-only rules ────────────────────────────────────

  it("makes all Comprador section inputs read-only", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    for (const label of [
      "Código Compra",
      "Nombres del Comprador",
      "Dirección Fiscal del comprador",
    ]) {
      expect((screen.getByLabelText(label) as HTMLInputElement).readOnly).toBe(
        true,
      );
    }
    // "N° Documento" label is shared by the Comprador and Vendedor sections
    for (const input of screen.getAllByLabelText("N° Documento")) {
      expect((input as HTMLInputElement).readOnly).toBe(true);
    }
  });

  it("makes all Vendedor section inputs read-only but keeps the search button enabled", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    for (const label of [
      "Código Venta",
      "Nombres del vendedor",
      "Dirección Fiscal vendedor",
    ]) {
      expect((screen.getByLabelText(label) as HTMLInputElement).readOnly).toBe(
        true,
      );
    }
    // "N° Documento" label is shared by the Comprador and Vendedor sections
    for (const input of screen.getAllByLabelText("N° Documento")) {
      expect((input as HTMLInputElement).readOnly).toBe(true);
    }
    // The Vendedor search button stays enabled — it opens the predio search
    expect(
      screen.getByRole("button", { name: /buscar contribuyente vendedor/i }),
    ).toBeEnabled();
  });

  it("makes Predio section inputs read-only except Contrato and Observación", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    for (const label of [
      "Código Predio",
      "Tipo Predio",
      "Anexo",
      "Sub Anexo",
      "Dirección Predio",
    ]) {
      expect((screen.getByLabelText(label) as HTMLInputElement).readOnly).toBe(
        true,
      );
    }

    // Contrato and Observación stay editable
    expect(
      (screen.getByLabelText("Contrato") as HTMLInputElement).readOnly,
    ).toBe(false);
    expect(
      (screen.getByLabelText("Observación") as HTMLInputElement).readOnly,
    ).toBe(false);
  });

  it("moves Transferencia into the Montos section as a numeric field", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    const transferenciaInput = screen.getByLabelText(
      "Transferencia",
    ) as HTMLInputElement;
    expect(transferenciaInput.type).toBe("number");
    expect(transferenciaInput).toHaveAttribute("min", "0");

    // All five montos fields render in the same grid row
    const montoInafectoInput = screen.getByLabelText("Monto Inafecto");
    expect(screen.getByLabelText("Monto Afecto")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto Alcabala")).toBeInTheDocument();
    expect(screen.getByLabelText("Autoavaluo")).toBeInTheDocument();

    // Transferencia shares the montos grid row (same grid parent)
    expect(transferenciaInput.parentElement?.parentElement).toBe(
      montoInafectoInput.parentElement?.parentElement,
    );
  });

  it("submits the transferencia value typed in the Montos section", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const transferenciaInput = screen.getByLabelText("Transferencia");
    await user.type(transferenciaInput, "1500");

    await user.click(screen.getByText("Guardar"));

    await waitFor(() => {
      expect(mockedCrear).toHaveBeenCalledTimes(1);
    });
    // The moved input still binds to predio.transferencia on submit
    expect(mockedCrear.mock.calls[0][0].transferencia).toBe("1500");
  });

  // ── Montos: Valor en Dólares / Tipo de Cambio / UIT ─────

  it("renders Valor en Dólares, Tipo de Cambio and UIT fields in the Montos section", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    const valorDolaresInput = screen.getByLabelText("Valor en Dólares");
    expect(valorDolaresInput).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de Cambio")).toBeInTheDocument();
    expect(screen.getByLabelText("UIT")).toBeInTheDocument();

    // TC and UIT are display-only; only Valor en Dólares is editable
    expect(
      (screen.getByLabelText("Tipo de Cambio") as HTMLInputElement).readOnly,
    ).toBe(true);
    expect(
      (screen.getByLabelText("UIT") as HTMLInputElement).readOnly,
    ).toBe(true);
    expect((valorDolaresInput as HTMLInputElement).readOnly).toBe(false);

    // The TC conversion button sits next to the dollar input
    expect(
      screen.getByRole("button", { name: /consultar tipo de cambio/i }),
    ).toBeInTheDocument();
  });

  it("auto-fills UIT when anioPred is a valid year and clears it when empty", async () => {
    const user = userEvent.setup();
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    const { rerender } = render(<CrearAlcabalaModal {...defaultProps} />);

    // Set the contract date and select a predio row → anioPred = mockPredio.anno
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // The UIT field shows the value fetched for the predio year
    await waitFor(() => {
      expect(
        (screen.getByLabelText("UIT") as HTMLInputElement).value,
      ).toBe("5150");
    });
    expect(mockedUit).toHaveBeenCalledWith("2025");

    // Reset the form (close + reopen) → anioPred empty → UIT clears
    rerender(<CrearAlcabalaModal {...defaultProps} open={false} />);
    rerender(<CrearAlcabalaModal {...defaultProps} open={true} />);
    await waitFor(() => {
      expect(
        (screen.getByLabelText("UIT") as HTMLInputElement).value,
      ).toBe("");
    });
  });

  it("shows an error and skips the action when TC is requested without a contract date", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Valor en Dólares typed, but no fechaContrato yet
    await user.type(screen.getByLabelText("Valor en Dólares"), "1000");
    await user.click(
      screen.getByRole("button", { name: /consultar tipo de cambio/i }),
    );

    expect(
      screen.getByText("Primero ingrese la fecha del contrato"),
    ).toBeInTheDocument();
    expect(mockedTipoCambio).not.toHaveBeenCalled();
  });

  it("fills Tipo de Cambio when TC is consulted with contract date and dollar value", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Set the contract date through the search popup, then close it
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2026-03-15" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    await user.type(screen.getByLabelText("Valor en Dólares"), "1000");
    await user.click(
      screen.getByRole("button", { name: /consultar tipo de cambio/i }),
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Tipo de Cambio") as HTMLInputElement).value,
      ).toBe("3.75");
    });
    expect(mockedTipoCambio).toHaveBeenCalledWith("2026-03-15");
  });

  it("triggers the TC consultation when Enter is pressed in Valor en Dólares", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Set the contract date through the search popup, then close it
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2026-03-15" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    await user.type(screen.getByLabelText("Valor en Dólares"), "1000{Enter}");

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Tipo de Cambio") as HTMLInputElement).value,
      ).toBe("3.75");
    });
  });

  // ── Comprador search (disabled) + Vendedor search ──────

  it("disables search button for Comprador", () => {
    render(<CrearAlcabalaModal {...defaultProps} />);

    const compradorSearch = screen.getByRole("button", {
      name: /buscar contribuyente comprador/i,
    });
    expect(compradorSearch).toBeDisabled();
  });

  it("opens search popup for Vendedor when search button is clicked", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    await waitFor(() => {
      expect(screen.getByText("Buscar Predio")).toBeInTheDocument();
    });
  });

  it("fills Vendedor fields when search result is selected", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Open search popup for Vendedor
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    // Wait for popup to open and select "Nombre" from tipoBusqueda dropdown
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });

    const tipoBusquedaSelect = within(dialog).getByLabelText("Tipo Búsqueda");
    await user.selectOptions(tipoBusquedaSelect, "N");

    // Type search query in Ap. Paterno field
    const paternoInput = within(dialog).getByPlaceholderText("PATERNO");
    await user.type(paternoInput, "PEREZ");

    // Contract date must be entered before searching
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2026-03-15" },
    });

    // Set up mock result BEFORE clicking search
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

    // Click search button in popup
    await user.click(screen.getByText("Buscar"));

    // Wait for result to appear
    await waitFor(() => {
      expect(screen.getByText(/0654321/)).toBeInTheDocument();
    });

    // Click on the result
    await user.click(screen.getByText(/0654321/));

    // Popup should close and Vendedor fields should be filled
    await waitFor(() => {
      expect(
        screen.queryByText("Buscar Contribuyente"),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("0654321")).toBeInTheDocument();
  });

  // ── Nombre search layout ───────────────────────────────

  it("shows three name inputs in a single row when Nombre type is selected", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Open search popup for Vendedor
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    // Wait for popup dialog to open and select "Nombre"
    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    await user.selectOptions(within(dialog).getByLabelText("Tipo Búsqueda"), "N");

    // All three name inputs appear together on the same row
    const paterno = within(dialog).getByPlaceholderText("PATERNO");
    const materno = within(dialog).getByPlaceholderText("MATERNO");
    const nombres = within(dialog).getByPlaceholderText("NOMBRES");

    expect(paterno).toBeInTheDocument();
    expect(materno).toBeInTheDocument();
    expect(nombres).toBeInTheDocument();

    // Same flex row (each input's parent is its labeled wrapper; grandparent is the row)
    expect(paterno.parentElement?.parentElement).toBe(
      materno.parentElement?.parentElement,
    );
    expect(nombres.parentElement?.parentElement).toBe(
      materno.parentElement?.parentElement,
    );
  });

  // ── Search gating (contract date required for ALL criteria) ──

  it("blocks contribuyente search until the contract date is entered", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Open search popup for Vendedor
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });

    // Switch to "N" (Nombre) — the contribuyente search keeps its layout
    await user.selectOptions(within(dialog).getByLabelText("Tipo Búsqueda"), "N");

    // Paterno entered but NO contract date → hint visible, Buscar disabled
    await user.type(
      within(dialog).getByPlaceholderText("PATERNO"),
      "PEREZ",
    );
    expect(
      screen.getByText("Ingrese primero la fecha del contrato para realizar la búsqueda"),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Buscar" })).toBeDisabled();

    // Enter the contract date → hint disappears, Buscar enabled
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2026-03-15" },
    });
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "Buscar" })).toBeEnabled();
    });
    expect(
      screen.queryByText("Ingrese primero la fecha del contrato para realizar la búsqueda"),
    ).not.toBeInTheDocument();
  });

  // ── Predio search flow (contract date required) ─────────

  it("blocks predio search until the contract date is entered", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    // Open search popup for Vendedor
    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });

    const buscarBtn = within(dialog).getByRole("button", { name: "Buscar" });

    // C (Código) is the predio search: code entered but NO contract date →
    // hint visible, Buscar disabled
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    expect(
      screen.getByText("Ingrese primero la fecha del contrato para realizar la búsqueda"),
    ).toBeInTheDocument();
    expect(buscarBtn).toBeDisabled();

    // Enter the contract date → hint disappears, Buscar enabled
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await waitFor(() => {
      expect(buscarBtn).toBeEnabled();
    });
    expect(
      screen.queryByText("Ingrese primero la fecha del contrato para realizar la búsqueda"),
    ).not.toBeInTheDocument();
  });

  it("sends the predio code and contract year to the SP", async () => {
    const user = userEvent.setup();
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [
        {
          codigo: "0279126",
          nombres: "GARCIA LOPEZ MARIA",
          codPred: "PRD001",
          porcenPropiedad: 50,
          numDoc: "12345678",
          direccFiscal: "AV. TEST 123",
          direccionPredio: "AV. TEST 123",
          anexo: "",
          subAnexo: "",
          totalAutoavaluo: 10000,
          tipoPred: "CASA",
          anno: "2025",
          row: 1,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    // Default mode is "C" (Código) — the predio search. Contract date first.
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(mockedPredioSearch).toHaveBeenCalledWith("0279126", "2025", "c");
    });
  });

  it("selecting a predio row fills the predio section and closes the popup", async () => {
    const user = userEvent.setup();
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    // Default mode is "C" (Código) — the predio search. Contract date first.
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));

    // Result row appears; click it
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // Popup closed
    expect(
      screen.queryByRole("dialog", { name: /buscar predio/i }),
    ).not.toBeInTheDocument();

    // Predio section filled: codPred, anioPred (item.anno), direccionPredio
    expect(
      (screen.getByLabelText("Código Predio") as HTMLInputElement).value,
    ).toBe("PRD001");
    expect(
      (screen.getByLabelText("Año Predio") as HTMLInputElement).value,
    ).toBe("2025");
    expect(
      (screen.getByLabelText("Dirección Predio") as HTMLInputElement).value,
    ).toBe("AV. TEST 123");
    expect(
      (screen.getByLabelText("Tipo Predio") as HTMLInputElement).value,
    ).toBe("Predio Urbano");

    // Vendedor section filled by the same selection
    expect(
      (screen.getByLabelText("Código Venta") as HTMLInputElement).value,
    ).toBe("0279126");
    expect(
      (screen.getByLabelText("Nombres del vendedor") as HTMLInputElement).value,
    ).toBe("GARCIA LOPEZ MARIA");
    // Both sections have "N° Documento" — the vendedor one renders second
    expect(
      (screen.getAllByLabelText("N° Documento")[1] as HTMLInputElement).value,
    ).toBe("12345678");
    expect(
      (screen.getByLabelText("Dirección Fiscal vendedor") as HTMLInputElement)
        .value,
    ).toBe("AV. FISCAL 999");

    // Montos filled by the same selection
    expect(
      (screen.getByLabelText("Autoavaluo") as HTMLInputElement).value,
    ).toBe("10000");
  });

  it("searches contribuyentes with the term when R (RUC) is selected", async () => {
    const user = userEvent.setup();
    mockedSearch.mockResolvedValue({
      success: true,
      data: [mockContribuyente],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    // R (RUC) uses the contribuyente search with a single term input
    await user.selectOptions(
      within(dialog).getByLabelText("Tipo Búsqueda"),
      "R",
    );
    await user.type(
      within(dialog).getByPlaceholderText("Ingrese término de búsqueda"),
      "PEREZ",
    );
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(mockedSearch).toHaveBeenCalledWith(
        "R",
        "PEREZ",
        undefined,
        undefined,
        undefined,
      );
    });
    // Result row rendered in the contribuyente table
    await waitFor(() => {
      expect(screen.getByText("JR. PRINCIPAL 123")).toBeInTheDocument();
    });
  });

  it("routes the Enter key to the predio search in C mode", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    const codeInput = within(dialog).getByPlaceholderText("Ej: 0279126");
    await user.type(codeInput, "0279126");
    fireEvent.keyDown(codeInput, { key: "Enter" });

    await waitFor(() => {
      expect(mockedPredioSearch).toHaveBeenCalledWith("0279126", "2025", "c");
    });
  });

  it("clears predio results when the contract date changes", async () => {
    const user = userEvent.setup();
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 0279126"),
      "0279126",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));

    // Result row visible after the search
    await waitFor(() => {
      expect(screen.getByText("AV. TEST 123")).toBeInTheDocument();
    });

    // Changing the contract date resets the search state
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-07-01" },
    });
    expect(screen.queryByText("AV. TEST 123")).not.toBeInTheDocument();
    expect(
      screen.getByText("Ingrese criterios y presione Buscar"),
    ).toBeInTheDocument();
  });

  // ── P (Código Predio) search mode ──────────────────────

  it("offers Código Predio in the Tipo Búsqueda dropdown", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });

    expect(
      within(dialog).getByRole("option", { name: "Código Predio" }),
    ).toBeInTheDocument();
  });

  it("shows the 9-digit predio input and predio dialog title when Código Predio is selected", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    await user.selectOptions(
      within(dialog).getByLabelText("Tipo Búsqueda"),
      "P",
    );

    expect(within(dialog).getByText("Buscar Predio")).toBeInTheDocument();
    expect(
      within(dialog).getByPlaceholderText("Ej: 010195288"),
    ).toBeInTheDocument();
  });

  it("sends the 9-digit codpred and contract year to the SP in P mode", async () => {
    const user = userEvent.setup();
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 15,
      totalPages: 0,
    });

    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    await user.selectOptions(
      within(dialog).getByLabelText("Tipo Búsqueda"),
      "P",
    );
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2026-03-15" },
    });
    // 8 digits typed → padded to 9 by formatCodPred
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 010195288"),
      "10195288",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(mockedPredioSearch).toHaveBeenCalledWith(
        undefined,
        "2026",
        "P",
        "010195288",
      );
    });
  });

  it("blocks the P-mode predio search until the contract date is entered", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    await user.selectOptions(
      within(dialog).getByLabelText("Tipo Búsqueda"),
      "P",
    );
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 010195288"),
      "10195288",
    );

    // No contract date → hint visible, Buscar disabled
    expect(
      screen.getByText(
        "Ingrese primero la fecha del contrato para realizar la búsqueda",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Buscar" }),
    ).toBeDisabled();
  });

  it("selecting a predio row in P mode fills predio and vendedor sections and closes the popup", async () => {
    const user = userEvent.setup();
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [mockPredio],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    });

    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    await user.selectOptions(
      within(dialog).getByLabelText("Tipo Búsqueda"),
      "P",
    );
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2025-06-30" },
    });
    await user.type(
      within(dialog).getByPlaceholderText("Ej: 010195288"),
      "10195288",
    );
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));

    // Result row appears; click it
    await waitFor(() => {
      expect(screen.getByText("PRD001")).toBeInTheDocument();
    });
    await user.click(screen.getByText("PRD001"));

    // Popup closed
    expect(
      screen.queryByRole("dialog", { name: /buscar predio/i }),
    ).not.toBeInTheDocument();

    // Predio section filled: codPred, anioPred (item.anno), direccionPredio
    expect(
      (screen.getByLabelText("Código Predio") as HTMLInputElement).value,
    ).toBe("PRD001");
    expect(
      (screen.getByLabelText("Año Predio") as HTMLInputElement).value,
    ).toBe("2025");
    expect(
      (screen.getByLabelText("Dirección Predio") as HTMLInputElement).value,
    ).toBe("AV. TEST 123");
    // Vendedor section filled: codigoVenta, nombres1, direccFiscal1
    expect(
      (screen.getByLabelText("Código Venta") as HTMLInputElement).value,
    ).toBe("0279126");
    expect(
      (screen.getByLabelText("Nombres del vendedor") as HTMLInputElement)
        .value,
    ).toBe("GARCIA LOPEZ MARIA");
  });

  it("routes the Enter key to the predio search in P mode", async () => {
    const user = userEvent.setup();
    mockedPredioSearch.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 15,
      totalPages: 0,
    });

    render(<CrearAlcabalaModal {...defaultProps} />);

    const vendedorSearch = screen.getByRole("button", {
      name: /buscar contribuyente vendedor/i,
    });
    await user.click(vendedorSearch);

    const dialog = await screen.findByRole("dialog", {
      name: /buscar predio|buscar contribuyente/i,
    });
    await user.selectOptions(
      within(dialog).getByLabelText("Tipo Búsqueda"),
      "P",
    );
    fireEvent.change(within(dialog).getByLabelText("Fecha Contrato"), {
      target: { value: "2026-03-15" },
    });
    const predioInput = within(dialog).getByPlaceholderText("Ej: 010195288");
    await user.type(predioInput, "10195288");
    fireEvent.keyDown(predioInput, { key: "Enter" });

    await waitFor(() => {
      expect(mockedPredioSearch).toHaveBeenCalledWith(
        undefined,
        "2026",
        "P",
        "010195288",
      );
    });
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
});
