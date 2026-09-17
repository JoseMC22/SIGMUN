import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FraccionarPapeletaModal from "./fraccionar-papeleta-modal";
import type { FraccionarPapeletaData } from "@/actions/papeleta-transito/acciones-infraccion";

vi.mock("@/actions/papeleta-transito/acciones-infraccion", () => ({
  fraccionarPapeletaAction: vi.fn(),
  verificarCondicionFraccionamientoAction: vi.fn(),
  calcularCuotasAction: vi.fn(),
}));

import {
  fraccionarPapeletaAction,
  verificarCondicionFraccionamientoAction,
  calcularCuotasAction,
} from "@/actions/papeleta-transito/acciones-infraccion";

interface InfraccionFixture {
  idRecibo?: string;
  codigo?: string;
  tipo?: string;
  tipoRec?: string;
  monto?: number | string;
  placa?: string;
  fecha?: string;
  codigoInfraccion?: string;
  codigoPropietario?: string;
}

const baseInfraccion: InfraccionFixture = {
  idRecibo: "103427955",
  codigo: "P303011",
  tipo: "10.86",
  tipoRec: "10.86",
  monto: 1000,
  placa: "ABC-123",
  fecha: "15/01/2026",
  codigoInfraccion: "2026-01-300299",
  codigoPropietario: "P5",
};

async function calcularCuotas() {
  fireEvent.click(screen.getByRole("button", { name: /Calcular Cuotas/ }));
  await waitFor(() =>
    expect(screen.getAllByText("S/ 175.00").length).toBeGreaterThan(0),
  );
}

async function generarConvenio() {
  fireEvent.click(screen.getByRole("button", { name: /Generar Convenio/ }));
  await waitFor(() => expect(fraccionarPapeletaAction).toHaveBeenCalled());
}

function lastCallData(): FraccionarPapeletaData {
  const mock = fraccionarPapeletaAction as unknown as ReturnType<typeof vi.fn>;
  return mock.mock.calls[0][0] as FraccionarPapeletaData;
}

describe("FraccionarPapeletaModal - Generar Convenio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    (verificarCondicionFraccionamientoAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });
    (calcularCuotasAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [
        { cuota: "01", montoCuota: 175, intereses: 0, cuotaTotal: 175, fecGen: "15/01/2026" },
      ],
    });
    (fraccionarPapeletaAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });
  });

  it("sends the legacy XML payload (js_Fraccionarpape.js) on Generar Convenio", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <FraccionarPapeletaModal
        isOpen
        infraccion={baseInfraccion}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await calcularCuotas();
    await generarConvenio();

    const call = lastCallData();
    expect(call).toEqual(
      expect.objectContaining({
        codigo: "P303011",
        cuotas: 4,
        totalDeuda: 1000,
        tipoDeuda: "PIT",
        codResp: "P303011",
        codPropVeh: "P5",
        fechaGeneracion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(call.totalInicial).toBeCloseTo(300, 5);

    const varxmlRow = JSON.parse(call.varxml ?? "[]")[0];
    expect(varxmlRow).toEqual(
      expect.objectContaining({
        idrecibo: "103427955",
        montotal: "1000",
        codigo: "P303011",
        anno: "2026",
        cod_pred: "ABC-123",
        tipo: "10.86",
        tipo_rec: "10.86",
        periodo: "01",
        imp_insol: "1000",
        fact_reaj: "1",
        imp_reaj: "1000",
        fact_mora: "0",
        imp_mora: "0",
        costo_emis: "0",
        ubica: "EM",
        anexo: "",
        sub_anexo: "",
      }),
    );

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("extracts the year from ISO (YYYY-MM-DD) fecha", async () => {
    render(
      <FraccionarPapeletaModal
        isOpen
        infraccion={{ ...baseInfraccion, fecha: "2026-01-15" }}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await calcularCuotas();
    await generarConvenio();

    const varxmlRow = JSON.parse(lastCallData().varxml ?? "[]")[0];
    expect(varxmlRow.anno).toBe("2026");
  });

  it("uses the current year when no fecha is present", async () => {
    const currentYear = String(new Date().getFullYear());

    render(
      <FraccionarPapeletaModal
        isOpen
        infraccion={{ ...baseInfraccion, monto: 1000, fecha: undefined }}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await calcularCuotas();
    await generarConvenio();

    const varxmlRow = JSON.parse(lastCallData().varxml ?? "[]")[0];
    expect(varxmlRow.anno).toBe(currentYear);
    expect(varxmlRow.montotal).toBe("1000");
  });
});