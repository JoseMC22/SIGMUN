import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import ConstanciaExigibilidadPage from "./page";
import {
  emitirConstanciaExigibilidadAction,
  imprimirConstanciaExigibilidadAction,
  listTiposValorAction,
  obtenerPlantillaConstanciaExigibilidadAction,
  validarConstanciaExigibilidadAction,
} from "@/actions/notificaciones/constancia-exigibilidad";
import type { ValidarConstanciaExigibilidadData } from "@/actions/notificaciones/constancia-exigibilidad";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// El page es "use client" y consume los server actions; se mockean para no
// depender de next/headers (cookies) en jsdom.
vi.mock("@/actions/notificaciones/constancia-exigibilidad", () => ({
  listTiposValorAction: vi.fn(),
  validarConstanciaExigibilidadAction: vi.fn(),
  emitirConstanciaExigibilidadAction: vi.fn(),
  imprimirConstanciaExigibilidadAction: vi.fn(),
  obtenerPlantillaConstanciaExigibilidadAction: vi.fn(),
}));

// export-utils trae jsPDF; se mockea para test hermético.
vi.mock("./export-utils", () => ({
  imprimirConstanciaExigibilidad: vi.fn(),
}));

const mockTiposValor = vi.mocked(listTiposValorAction);
const mockValidar = vi.mocked(validarConstanciaExigibilidadAction);
const mockEmitir = vi.mocked(emitirConstanciaExigibilidadAction);
const mockImpresion = vi.mocked(imprimirConstanciaExigibilidadAction);
const mockPlantilla = vi.mocked(obtenerPlantillaConstanciaExigibilidadAction);

const tiposValor = [
  { id_valor: "01", nomb_val: "Impuesto Predial" },
  { id_valor: "02", nomb_val: "Arbitrios" },
];

function validarRow(
  overrides: Partial<ValidarConstanciaExigibilidadData> = {},
): ValidarConstanciaExigibilidadData {
  return {
    administrado: "CONTRIBUYENTE DE PRUEBA SAC",
    fecVal: "2026-10-01T00:00:00.000Z",
    monto: 125.5,
    cargo: "0000042",
    fNotifica: "2026-10-29T00:00:00.000Z",
    nroExigibilidad: "0",
    fExigibilidad: null,
    codigo: "0012345",
    idValor: "01",
    anoVal: "2026",
    numVal: "0000001",
    canGenerate: true,
    canPrint: false,
    message: "Proceder con la Generación de la Constancia",
    ...overrides,
  };
}

function tiposValorOk() {
  return Promise.resolve({ success: true, data: tiposValor, total: 2 });
}

async function loadPageAndWaitCombo() {
  render(<ConstanciaExigibilidadPage />);
  await waitFor(() =>
    expect(screen.getByRole("combobox")).not.toBeDisabled(),
  );
}

async function fillAndValidate(numero = "0000001") {
  fireEvent.change(screen.getByLabelText(/número de valor/i), {
    target: { value: numero },
  });
  fireEvent.click(screen.getByRole("button", { name: /validar/i }));
}

describe("ConstanciaExigibilidadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTiposValor.mockResolvedValue(tiposValorOk());
  });

  it("carga los tipos de valor y selecciona el primer ítem por defecto (D5)", async () => {
    await loadPageAndWaitCombo();

    const combo = screen.getByRole("combobox") as HTMLSelectElement;
    expect(combo.value).toBe("01");
    expect(mockTiposValor).toHaveBeenCalledTimes(1);
  });

  it("el botón Validar está deshabilitado hasta que hay número", async () => {
    await loadPageAndWaitCombo();

    const validar = screen.getByRole("button", { name: /validar/i });
    expect(validar).toBeDisabled();
  });

  it("validar exitoso muestra los datos y habilita Generar / deshabilita Imprimir", async () => {
    mockValidar.mockResolvedValue({
      success: true,
      data: [validarRow()],
      total: 1,
    });
    await loadPageAndWaitCombo();
    await fillAndValidate();

    await screen.findByText("CONTRIBUYENTE DE PRUEBA SAC");
    expect(screen.getByText("Proceder con la Generación de la Constancia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generar/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /imprimir/i })).toBeDisabled();
  });

  it("validar con constancia existente muestra 'Ya cuenta...' y habilita Imprimir", async () => {
    mockValidar.mockResolvedValue({
      success: true,
      data: [
        validarRow({
          nroExigibilidad: "0000007",
          fExigibilidad: "2026-11-02T00:00:00.000Z",
          canGenerate: false,
          canPrint: true,
          message: "Ya cuenta con Constancia de Exigibilidad",
        }),
      ],
      total: 1,
    });
    await loadPageAndWaitCombo();
    await fillAndValidate();

    await screen.findByText("Ya cuenta con Constancia de Exigibilidad");
    expect(screen.getByRole("button", { name: /generar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /imprimir/i })).toBeEnabled();
  });

  it("validar con error del backend (p. ej. cancelado) muestra el mensaje como alerta", async () => {
    mockValidar.mockResolvedValue({
      success: false,
      data: [],
      total: 0,
      error: "El valor se encuentra en estado Cancelado. No se puede generar la constancia.",
    });
    await loadPageAndWaitCombo();
    await fillAndValidate();

    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El valor se encuentra en estado Cancelado",
    );
    expect(screen.queryByText("Datos del valor")).not.toBeInTheDocument();
  });

  it("generar cambia el estado a canPrint y muestra el Nro Exigibilidad devuelto por el SP", async () => {
    mockValidar.mockResolvedValue({
      success: true,
      data: [validarRow()],
      total: 1,
    });
    mockEmitir.mockResolvedValue({
      success: true,
      data: [{ numexig: "0000007", anoexig: "2026" }],
      total: 1,
    });
    await loadPageAndWaitCombo();
    await fillAndValidate();
    await screen.findByText("Proceder con la Generación de la Constancia");

    fireEvent.click(screen.getByRole("button", { name: /generar/i }));

    await screen.findByText("Ya cuenta con Constancia de Exigibilidad");
    expect(screen.getByRole("button", { name: /generar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /imprimir/i })).toBeEnabled();
    expect(mockEmitir).toHaveBeenCalledWith({
      tipoValor: "01",
      anio: 2026,
      numero: "0000001",
    });
  });

  it("cancelar limpia los campos y devuelve el año al actual (S9)", async () => {
    mockValidar.mockResolvedValue({
      success: true,
      data: [validarRow()],
      total: 1,
    });
    await loadPageAndWaitCombo();
    await fillAndValidate();
    await screen.findByText("CONTRIBUYENTE DE PRUEBA SAC");

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByText("CONTRIBUYENTE DE PRUEBA SAC")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/número de valor/i)).toHaveValue("");
    expect(screen.getByLabelText(/^año$/i)).toHaveValue(new Date().getFullYear());
  });

  it("imprimir usa numexig/anoexig emitidos y la plantilla S8 (sin QR)", async () => {
    mockValidar.mockResolvedValue({
      success: true,
      data: [validarRow()],
      total: 1,
    });
    mockEmitir.mockResolvedValue({
      success: true,
      data: [{ numexig: "0000007", anoexig: "2026" }],
      total: 1,
    });
    mockPlantilla.mockResolvedValue({
      success: true,
      data: { html: "<html>{{nroconstancia}}</html>" },
    });
    mockImpresion.mockResolvedValue({
      success: true,
      data: [
        {
          nombre: "CONTRIBUYENTE DE PRUEBA SAC",
          constancia: "0000007-2026",
          valor: "IPRE 2026 0000001",
          fnotifica: "2026-10-29T00:00:00.000Z",
          cargo: "0000042",
        },
      ],
      total: 1,
    });

    await loadPageAndWaitCombo();
    await fillAndValidate();
    await screen.findByText("Proceder con la Generación de la Constancia");
    fireEvent.click(screen.getByRole("button", { name: /generar/i }));
    await screen.findByText("Ya cuenta con Constancia de Exigibilidad");

    fireEvent.click(screen.getByRole("button", { name: /imprimir/i }));

    await waitFor(() =>
      expect(mockImpresion).toHaveBeenCalledWith({
        numexig: "0000007",
        anoexig: "2026",
      }),
    );
    expect(mockPlantilla).toHaveBeenCalledTimes(1);
  });
});
