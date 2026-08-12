import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DetalleAlcabala from "./detalle-alcabala";
import { getDetalleAlcabalaAction } from "@/actions/alcabala/determinar-alcabala";

vi.mock("@/actions/alcabala/determinar-alcabala", () => ({
  getDetalleAlcabalaAction: vi.fn(),
}));

const mockDetalle = {
  codigoCompra: "0279126",
  anio: "2021",
  nombres: "VAEZ CARDENAS MANUEL FERNANDO Y SRA",
  documento: "DNI",
  numDoc: "19082855",
  direccFiscal: "URB. LA RINCONADA DE HUACACHINA II ETAPA",
  distrito: "D",
  provincia: "P",
  departamento: "DW",
  codigoVenta: "0211949",
  nombres1: "CORDERO MORON FRANCISCO Y ESPOSA",
  documento1: "DNI",
  numDoc1: "21448806",
  direccFiscal1: "URB. SAN JOSE",
  distrito1: "D",
  provincia1: "P",
  departamento1: "DW",
  codPred: "010195288",
  aniopred: "2021",
  fechaContrato: "12/05/2021",
  transferencia: "500000.00",
  observacion: "",
  contrato: "COMPRA VENTA",
  montoAlcabala: 13680,
  autoavaluo: 137375.16,
  direccionPredio: "MZ SAN JOSE NRO. 1012 MZ B LTE 07",
  montoInafecto: 44000,
  montoAfecto: 456000,
  anexo: "0003",
  subAnexo: "0001",
  flagCheck: "",
  observacionFlag: "",
  nombre: "CORDERO MORON FRANCISCO Y ESPOSA",
  direccion: "URB. SAN JOSE",
  dni: "21448806",
  tipodoc: "DNI",
  usuario: "mvaez",
  estacion: "INFOSAT-03",
  fechaIng: "06/06/2024 10:16:10",
  flagInafecto: "0",
  tipoPred: "",
};

describe("DetalleAlcabala", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <DetalleAlcabala open={false} onClose={vi.fn()} idAlcabala={5296} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when idAlcabala is null", () => {
    const { container } = render(
      <DetalleAlcabala open={true} onClose={vi.fn()} idAlcabala={null} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("fetches and renders detail when open", async () => {
    (getDetalleAlcabalaAction as any).mockResolvedValue({
      success: true,
      data: mockDetalle,
    });

    render(
      <DetalleAlcabala open={true} onClose={vi.fn()} idAlcabala={5296} />,
    );

    expect(screen.getByText("Cargando detalle...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Detalle de Alcabala")).toBeDefined();
    });

    expect(screen.getByText("VAEZ CARDENAS MANUEL FERNANDO Y SRA")).toBeDefined();
    expect(screen.getAllByText("CORDERO MORON FRANCISCO Y ESPOSA").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("S/ 13680.00")).toBeDefined();
    expect(screen.getByText("010195288")).toBeDefined();
  });

  it("calls onClose when Escape key is pressed", async () => {
    (getDetalleAlcabalaAction as any).mockResolvedValue({
      success: true,
      data: mockDetalle,
    });

    const onClose = vi.fn();
    render(
      <DetalleAlcabala open={true} onClose={onClose} idAlcabala={5296} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Detalle de Alcabala")).toBeDefined();
    });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", async () => {
    (getDetalleAlcabalaAction as any).mockResolvedValue({
      success: true,
      data: mockDetalle,
    });

    const onClose = vi.fn();
    render(
      <DetalleAlcabala open={true} onClose={onClose} idAlcabala={5296} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Detalle de Alcabala")).toBeDefined();
    });

    const backdrop = document.querySelector("[aria-hidden='true']");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cerrar button is clicked", async () => {
    (getDetalleAlcabalaAction as any).mockResolvedValue({
      success: true,
      data: mockDetalle,
    });

    const onClose = vi.fn();
    render(
      <DetalleAlcabala open={true} onClose={onClose} idAlcabala={5296} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Detalle de Alcabala")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Cerrar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows error state when fetch fails", async () => {
    (getDetalleAlcabalaAction as any).mockResolvedValue({
      success: false,
      data: null,
      error: "Alcabala no encontrada",
    });

    render(
      <DetalleAlcabala open={true} onClose={vi.fn()} idAlcabala={999} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Alcabala no encontrada")).toBeDefined();
    });
  });

  it("shows all sections", async () => {
    (getDetalleAlcabalaAction as any).mockResolvedValue({
      success: true,
      data: mockDetalle,
    });

    render(
      <DetalleAlcabala open={true} onClose={vi.fn()} idAlcabala={5296} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Comprador")).toBeDefined();
    });

    expect(screen.getByText("Vendedor")).toBeDefined();
    expect(screen.getByText("Predio")).toBeDefined();
    expect(screen.getByText("Datos Relativos al Contrato")).toBeDefined();
    expect(screen.getByText("Registro")).toBeDefined();
    expect(screen.getByText("Registro")).toBeDefined();
  });
});
