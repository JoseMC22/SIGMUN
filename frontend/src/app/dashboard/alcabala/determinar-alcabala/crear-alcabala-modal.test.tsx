import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrearAlcabalaModal from "./crear-alcabala-modal";
import type { ContribuyenteItem, PredioItem } from "@/actions/alcabala/determinar-alcabala";

// Mock server actions
vi.mock("@/actions/alcabala/crear-alcabala", () => ({
  crearAlcabalaAction: vi.fn(),
}));

vi.mock("@/actions/alcabala/determinar-alcabala", () => ({
  searchContribuyenteAction: vi.fn(),
  searchPrediosAction: vi.fn(),
}));

import { crearAlcabalaAction } from "@/actions/alcabala/crear-alcabala";
import { searchContribuyenteAction, searchPrediosAction } from "@/actions/alcabala/determinar-alcabala";

const mockedCrear = vi.mocked(crearAlcabalaAction);
const mockedSearch = vi.mocked(searchContribuyenteAction);
const mockedSearchPredios = vi.mocked(searchPrediosAction);

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
    mockedSearchPredios.mockResolvedValue({
      success: true,
      data: [],
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

    // Predio fields are now disabled (auto-filled from the popup), so select a
    // predio to fill codPred/anioPred via the real flow before submitting.
    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));
    await user.type(
      screen.getByLabelText("Fecha Contrato", { selector: "#search-fechaContrato" }),
      "2026-05-10",
    );
    await user.type(screen.getByLabelText("Código (7 dígitos)"), "0279126");

    mockedSearchPredios.mockResolvedValueOnce({
      success: true,
      data: [
        {
          codigo: "0297596",
          nombres: "CORNEJO MANTILLA AGUEDA AURORA",
          codPred: "000000001",
          anexo: "0003",
          subAnexo: "0004",
          porcenPropiedad: "100.00",
          predial: "AV. LIMA 200",
          totalAutoavaluo: "108414.17",
          tipoPred: "Predio Urbano",
          anno: "2025",
          valTerreno: "16706.13",
        },
      ],
    });

    await user.click(screen.getByText("Buscar"));
    await waitFor(() => {
      expect(screen.getByText(/AV\. LIMA 200/)).toBeInTheDocument();
    });
    await user.click(screen.getByText(/AV\. LIMA 200/));

    // Fill the manual Monto Afecto field (still editable).
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
    expect(calledDto.codPred).toBe("000000001");
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

  it("mirrors the main search bar distribution with a Tipo Búsqueda select", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));

    expect(await screen.findByText("Buscar Contribuyente")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo Búsqueda")).toHaveValue("C");
    expect(screen.getByLabelText("Código (7 dígitos)")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Tipo Búsqueda"), "N");

    expect(screen.getByPlaceholderText("PATERNO")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("MATERNO")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("NOMBRES")).toBeInTheDocument();
  });

  it("keeps Buscar disabled until Fecha Contrato and criteria are both entered (vendedor)", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));

    const buscarBtn = await screen.findByText("Buscar");
    expect(buscarBtn).toBeDisabled();

    // Only criteria entered → still disabled (vendedor needs a valid Fecha Contrato)
    await user.type(screen.getByLabelText("Código (7 dígitos)"), "279126");
    expect(buscarBtn).toBeDisabled();

    // Fecha Contrato entered → enabled
    await user.type(
      screen.getByLabelText("Fecha Contrato", { selector: "#search-fechaContrato" }),
      "2026-05-10",
    );
    expect(buscarBtn).not.toBeDisabled();

    // Changing search type resets criteria → disabled again
    await user.selectOptions(screen.getByLabelText("Tipo Búsqueda"), "R");
    expect(buscarBtn).toBeDisabled();
  });

  it("comprador flow: selecting a contribuyente fills comprador fields and closes the popup", async () => {
    const user = userEvent.setup();
    // No pre-selected contribuyente so the comprador search button is enabled.
    render(<CrearAlcabalaModal {...defaultProps} contribuyente={null} />);

    await user.click(screen.getByLabelText("Buscar contribuyente comprador"));
    expect(await screen.findByText("Buscar Contribuyente")).toBeInTheDocument();

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

    await user.type(screen.getByLabelText("Código (7 dígitos)"), "0654321");
    await user.click(screen.getByText("Buscar"));

    await waitFor(() => {
      expect(screen.getByText(/0654321/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/0654321/));

    // Popup should close
    await waitFor(() => {
      expect(
        screen.queryByText("Buscar Contribuyente"),
      ).not.toBeInTheDocument();
    });

    // Comprador fields should be filled
    expect(screen.getByDisplayValue("0654321")).toBeInTheDocument();
    expect(screen.getByDisplayValue("JUAN PEREZ RAMIREZ")).toBeInTheDocument();
  });

  it("vendedor: presses Buscar → uses combo criteria → searchPrediosAction called with mapped params + fills predios table", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));
    expect(await screen.findByText("Buscar Contribuyente")).toBeInTheDocument();

    // Fecha Contrato (required for the vendedor @anio)
    await user.type(
      screen.getByLabelText("Fecha Contrato", { selector: "#search-fechaContrato" }),
      "2026-05-10",
    );

    // Combo defaults to "C" (Código). Type a 7-digit code.
    await user.type(screen.getByLabelText("Código (7 dígitos)"), "0279126");

    mockedSearchPredios.mockResolvedValueOnce({
      success: true,
      data: [
        {
          codigo: "0297596",
          nombres: "CORNEJO MANTILLA AGUEDA AURORA",
          codPred: "000000001",
          anexo: "0003",
          subAnexo: "0004",
          porcenPropiedad: "100.00",
          predial: "AV. LIMA 200",
          totalAutoavaluo: "108414.17",
          tipoPred: "Predio Urbano",
          anno: "2025",
          valTerreno: "16706.13",
        },
      ],
    });

    await user.click(screen.getByText("Buscar"));

    // The predio SP is called with the mapped params for combo "C".
    await waitFor(() => {
      expect(mockedSearchPredios).toHaveBeenCalledWith(
        "0279126",
        "2026",
        "c",
        { codPred: "" },
      );
    });

    // The predios results table shows the 7 columns and the predio row.
    const table = document.querySelector("table");
    expect(table).toBeTruthy();
    const t = within(table as HTMLElement);
    expect(t.getByText("Código")).toBeInTheDocument();
    expect(t.getByText("Nombres")).toBeInTheDocument();
    expect(t.getByText("Cód. Predio")).toBeInTheDocument();
    expect(t.getByText("% Propiedad")).toBeInTheDocument();
    expect(t.getByText("Total Autoavaluó")).toBeInTheDocument();
    expect(t.getByText("Dirección")).toBeInTheDocument();
    expect(t.getByText("Tipo")).toBeInTheDocument();
    expect(t.getByText(/AV\. LIMA 200/)).toBeInTheDocument();
    expect(t.getByText("000000001")).toBeInTheDocument();
    expect(t.getByText("100.00")).toBeInTheDocument();
    expect(t.getByText("108414.17")).toBeInTheDocument();
    expect(t.getByText("Predio Urbano")).toBeInTheDocument();

    // The contract-date alert was removed — assert no alert is shown anymore.
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("vendedor: clicking a predio fills vendedor+predio fields and closes", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));
    expect(await screen.findByText("Buscar Contribuyente")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Fecha Contrato", { selector: "#search-fechaContrato" }),
      "2026-05-10",
    );
    await user.type(screen.getByLabelText("Código (7 dígitos)"), "0279126");

    mockedSearchPredios.mockResolvedValue({
      success: true,
      data: [
        {
          codigo: "0297596",
          nombres: "CORNEJO MANTILLA AGUEDA AURORA",
          codPred: "000000001",
          anexo: "0003",
          subAnexo: "0004",
          porcenPropiedad: "100.00",
          predial: "AV. LIMA 200",
          totalAutoavaluo: "108414.17",
          tipoPred: "Predio Urbano",
          anno: "2025",
          valTerreno: "16706.13",
        },
      ],
    });

    await user.click(screen.getByText("Buscar"));

    // Wait for the predio row to appear, then click it.
    await waitFor(() => {
      expect(screen.getByText(/AV\. LIMA 200/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/AV\. LIMA 200/));

    // Popup closes.
    await waitFor(() => {
      expect(screen.queryByText("Buscar Contribuyente")).not.toBeInTheDocument();
    });

    // Predio fields filled from the selected predio.
    expect(screen.getByDisplayValue("000000001")).toBeInTheDocument(); // codPred
    expect(screen.getByDisplayValue("AV. LIMA 200")).toBeInTheDocument(); // direccionPredio
    expect(screen.getByDisplayValue("2025")).toBeInTheDocument(); // anioPred

    // Vendedor fields auto-filled from the predio's contribuyente info.
    expect(screen.getByDisplayValue("0297596")).toBeInTheDocument(); // codigoVenta
    expect(screen.getByDisplayValue("CORNEJO MANTILLA AGUEDA AURORA")).toBeInTheDocument(); // nombres1

    alertSpy.mockRestore();
  });

  it("vendedor: combo N maps to searchPrediosAction with name fields", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));
    expect(await screen.findByText("Buscar Contribuyente")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Tipo Búsqueda"), "N");
    await user.type(
      screen.getByLabelText("Fecha Contrato", { selector: "#search-fechaContrato" }),
      "2026-05-10",
    );
    await user.type(screen.getByPlaceholderText("PATERNO"), "PEREZ");
    await user.type(screen.getByPlaceholderText("MATERNO"), "RAMIREZ");
    await user.type(screen.getByPlaceholderText("NOMBRES"), "JUAN");

    mockedSearchPredios.mockResolvedValueOnce({ success: true, data: [] });

    await user.click(screen.getByText("Buscar"));

    await waitFor(() => {
      expect(mockedSearchPredios).toHaveBeenCalledWith(
        "",
        "2026",
        "n",
        { paterno: "PEREZ", materno: "RAMIREZ", nombres: "JUAN" },
      );
    });

    alertSpy.mockRestore();
  });

  it("vendedor: combo P (Código Predio) maps to searchPrediosAction with 9-digit padded codPred", async () => {
    const user = userEvent.setup();
    render(<CrearAlcabalaModal {...defaultProps} />);

    await user.click(screen.getByLabelText("Buscar contribuyente vendedor"));
    expect(await screen.findByText("Buscar Contribuyente")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Tipo Búsqueda"), "P");
    await user.type(
      screen.getByLabelText("Fecha Contrato", { selector: "#search-fechaContrato" }),
      "2026-05-10",
    );
    // The P input is "Código Predio (9 dígitos)"; "10195288" gets padded to 9 digits.
    await user.type(screen.getByLabelText("Código Predio (9 dígitos)"), "10195288");

    mockedSearchPredios.mockResolvedValueOnce({ success: true, data: [] });

    await user.click(screen.getByText("Buscar"));

    await waitFor(() => {
      expect(mockedSearchPredios).toHaveBeenCalledWith("", "2026", "P", {
        codPred: "010195288",
      });
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

