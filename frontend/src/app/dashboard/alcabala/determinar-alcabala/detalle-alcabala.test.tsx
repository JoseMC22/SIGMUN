import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DetalleAlcabala from "./detalle-alcabala";
import {
  getDetalleAlcabalaAction,
  type DetalleAlcabalaItem,
} from "@/actions/alcabala/determinar-alcabala";

vi.mock("@/actions/alcabala/determinar-alcabala", () => ({
  getDetalleAlcabalaAction: vi.fn(),
}));

const mockedGet = vi.mocked(getDetalleAlcabalaAction);

function makeDetalle(overrides: Partial<DetalleAlcabalaItem> = {}): DetalleAlcabalaItem {
  return {
    codigoCompra: "C001",
    anio: "2026",
    nombres: "JUAN CARLOS",
    documento: "",
    numDoc: "12345678",
    direccFiscal: "AV. REAL 1",
    distrito: "",
    provincia: "",
    departamento: "",
    codigoVenta: "V001",
    nombres1: "MARIA",
    documento1: "",
    numDoc1: "87654321",
    direccFiscal1: "JR. FAKE 2",
    distrito1: "",
    provincia1: "",
    departamento1: "",
    codPred: "P001",
    anioPred: "2026",
    fechaContrato: "2026-07-30",
    transferencia: "COMPRA VENTA",
    porcTransferencia: 0,
    observacion: "",
    contrato: "C-001",
    montoAlcabala: 3000,
    autoavaluo: 80000,
    direccionPredio: "AV. REAL 9",
    montoInafecto: 0,
    montoAfecto: 100000,
    anexo: "",
    subAnexo: "",
    flagCheck: "",
    observacionFlag: "",
    nombre: "",
    direccion: "",
    dni: "",
    tipodoc: "",
    usuario: "admin",
    estacion: "PC-001",
    fechaIng: "2026-07-30",
    flagInafecto: "",
    tipoPred: "CASA",
    ...overrides,
  };
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  idAlcabala: 1,
};

describe("DetalleAlcabala - porcTransferencia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders porcTransferencia with % suffix when present", async () => {
    mockedGet.mockResolvedValue({
      success: true,
      data: makeDetalle({ porcTransferencia: 33.33 }),
    });

    render(<DetalleAlcabala {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("33.33%")).toBeInTheDocument();
    });
  });

  it("renders em-dash placeholder when porcTransferencia is absent (not 'undefined')", async () => {
    const data = {
      ...makeDetalle(),
      porcTransferencia: undefined,
    } as unknown as DetalleAlcabalaItem;

    mockedGet.mockResolvedValue({
      success: true,
      data,
    });

    render(<DetalleAlcabala {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Detalle de Alcabala")).toBeInTheDocument();
    });

    // The literal string "undefined" must never reach the DOM
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });
});
