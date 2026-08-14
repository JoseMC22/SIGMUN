import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlcabalasTable from "./alcabalas-table";
import { getOpPdfBase64Action } from "@/actions/alcabala/impresion-dj-alcabala";

vi.mock("@/actions/alcabala/impresion-dj-alcabala", () => ({
  getOpPdfBase64Action: vi.fn(),
}));

const item = {
  idAlcabala: 11772,
  fechaRegistro: "2025-01-01",
  montoAlcabala: 3000,
  codPred: "P001",
  anioPred: "2025",
  codigoVenta: "V001",
  estado: "1",
};

const mockBase64 = Buffer.from("%PDF-1.4 fake pdf stream").toString("base64");

describe("AlcabalasTable — Imprimir Formato button (T6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "open").mockImplementation(() => null);
    (URL as any).createObjectURL = vi.fn(() => "blob:http://localhost/blob-1");
  });

  it("is enabled, shows loading, then opens the OP PDF in a new tab on success", async () => {
    (getOpPdfBase64Action as any).mockResolvedValue(mockBase64);

    render(<AlcabalasTable data={[item]} loading={false} />);

    const printButton = screen.getByTitle("Imprimir Formato");
    expect(printButton).not.toBeDisabled();

    fireEvent.click(printButton);

    // Loading state: button disabled while the action is in flight
    expect(screen.getByTitle("Imprimir Formato")).toBeDisabled();

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith("blob:http://localhost/blob-1", "_blank");
    });

    // After success the button is re-enabled
    expect(screen.getByTitle("Imprimir Formato")).not.toBeDisabled();
    expect(getOpPdfBase64Action).toHaveBeenCalledWith(11772);
  });

  it("shows an inline error and re-enables the button when the action returns null", async () => {
    (getOpPdfBase64Action as any).mockResolvedValue(null);

    render(<AlcabalasTable data={[item]} loading={false} />);

    const printButton = screen.getByTitle("Imprimir Formato");
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo generar el PDF de la Orden de Pago/i),
      ).toBeInTheDocument();
    });

    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByTitle("Imprimir Formato")).not.toBeDisabled();
  });
});
