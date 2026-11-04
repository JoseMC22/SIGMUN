import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CertificadosModal from "./certificados-modal";
import type {
  CertificadoRow,
  ContribuyenteRow,
} from "@/actions/cobranza/certificado-no-adeudo";

const mocks = vi.hoisted(() => ({
  getCertificadosAction: vi.fn(),
  getCertificadoPdfAction: vi.fn(),
  abrirPdfBase64: vi.fn(),
}));

vi.mock("@/actions/cobranza/certificado-no-adeudo", () => ({
  getCertificadosAction: mocks.getCertificadosAction,
  getCertificadoPdfAction: mocks.getCertificadoPdfAction,
}));

vi.mock("@/lib/op-pdf", () => ({
  abrirPdfBase64: mocks.abrirPdfBase64,
}));

vi.mock("./certificado-form-modal", () => ({ default: () => null }));

const contribuyente: ContribuyenteRow = {
  codigo: "0200182",
  nombres: "GLORIA LAULILA",
  paterno: "ACASIETE",
  materno: "UCHUYA",
  documento: "DNI",
  numDoc: "21487124",
  direccion: "JR. LIMA 100",
};

const fila = (overrides: Partial<CertificadoRow> = {}): CertificadoRow => ({
  idTbl: "7792",
  idRecibo: "78138653",
  codigo: "0200182",
  certNro: "170",
  certAnio: "2025",
  tipoDeuda: "02.01",
  tipoDeudaDescripcion: "IMPUESTO PREDIAL",
  tipoPeriodo: "1",
  tipoPeriodoDescripcion: "HASTA EL EJERCICIO FISCAL",
  observacion: "",
  cantImpresion: "0",
  impresion: " ",
  fechaImpresion: "2025-01-31",
  estado: "1",
  estImprime: "1",
  numCertif: "0167",
  ...overrides,
});

const renderModal = async () => {
  const util = render(
    <CertificadosModal contribuyente={contribuyente} onClose={() => {}} />,
  );
  // El modal carga la grilla en un setTimeout(0): se drena dentro de act para
  // que la actualizacion de estado no quede fuera del ciclo de React.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return util;
};

/**
 * La regla del legacy: el boton de impresion existe solo cuando el recibo de
 * emision esta cancelado, que es lo que expone `estImprime`.
 */
describe("certificados-modal — boton imprimir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el boton solo en las filas con el recibo cancelado (estImprime = 1)", async () => {
    mocks.getCertificadosAction.mockResolvedValue({
      success: true,
      data: [
        fila({ idTbl: "7792", certNro: "170", certAnio: "2025", estImprime: "1" }),
        fila({
          idTbl: "12693",
          certNro: "1036",
          certAnio: "2026",
          estImprime: "0",
          numCertif: "0001",
        }),
      ],
    });

    await renderModal();

    expect(await screen.findAllByLabelText("Imprimir Certificado")).toHaveLength(
      1,
    );
    // La fila bloqueada conserva su accion de edicion.
    expect(screen.getAllByLabelText("Editar Certificado")).toHaveLength(2);
  });

  it("pide el PDF y lo abre cuando el recibo esta cancelado", async () => {
    mocks.getCertificadosAction.mockResolvedValue({
      success: true,
      data: [fila()],
    });
    mocks.getCertificadoPdfAction.mockResolvedValue({
      success: true,
      base64: "JVBERg==",
    });

    await renderModal();

    const [boton] = await screen.findAllByLabelText("Imprimir Certificado");
    await act(async () => {
      await userEvent.click(boton);
    });

    expect(mocks.getCertificadoPdfAction).toHaveBeenCalledWith(
      "0200182",
      "170",
      "2025",
    );
    expect(mocks.abrirPdfBase64).toHaveBeenCalledWith("JVBERg==");
  });

  it("si el backend rechaza la impresion muestra el aviso y no abre nada", async () => {
    mocks.getCertificadosAction.mockResolvedValue({
      success: true,
      data: [fila()],
    });
    mocks.getCertificadoPdfAction.mockResolvedValue({
      success: false,
      code: "RECIBO_NO_CANCELADO",
      error: "El recibo de emision del certificado no esta cancelado",
    });

    await renderModal();

    const [boton] = await screen.findAllByLabelText("Imprimir Certificado");
    await act(async () => {
      await userEvent.click(boton);
    });

    expect(
      await screen.findByTestId("certificado-pdf-error"),
    ).toHaveTextContent(
      "El recibo de emision del certificado no esta cancelado",
    );
    expect(mocks.abrirPdfBase64).not.toHaveBeenCalled();
  });
});
