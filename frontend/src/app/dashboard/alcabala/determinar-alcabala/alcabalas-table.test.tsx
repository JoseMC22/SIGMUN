import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlcabalasTable from "./alcabalas-table";
import {
  getOpPdfBase64Action,
  getDeclaracionPdfBase64Action,
} from "@/actions/alcabala/impresion-dj-alcabala";

vi.mock("@/actions/alcabala/impresion-dj-alcabala", () => ({
  getOpPdfBase64Action: vi.fn(),
  getDeclaracionPdfBase64Action: vi.fn(),
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

describe("AlcabalasTable — Imprimir Declaración button (PR 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (URL as any).createObjectURL = vi.fn(() => "blob:http://localhost/blob-1");
  });

  it("renders the 'Imprimir Declaración' button next to 'Imprimir Formato'", () => {
    render(<AlcabalasTable data={[item]} loading={false} />);

    expect(screen.getByTitle("Imprimir Declaración")).toBeInTheDocument();
    expect(screen.getByTitle("Imprimir Formato")).toBeInTheDocument();
  });

  it("opens the declaration PDF in a new tab on success", async () => {
    (getDeclaracionPdfBase64Action as any).mockResolvedValue(mockBase64);
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue({ addEventListener: vi.fn() } as any);

    render(<AlcabalasTable data={[item]} loading={false} />);

    const button = screen.getByTitle("Imprimir Declaración");
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    // Loading state: button disabled while the action is in flight
    expect(screen.getByTitle("Imprimir Declaración")).toBeDisabled();

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith("blob:http://localhost/blob-1", "_blank");
    });

    expect(screen.getByTitle("Imprimir Declaración")).not.toBeDisabled();
    expect(getDeclaracionPdfBase64Action).toHaveBeenCalledWith(11772);
  });

  it("shows an inline error and re-enables the button when the popup is blocked (window.open returns null)", async () => {
    (getDeclaracionPdfBase64Action as any).mockResolvedValue(mockBase64);
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    render(<AlcabalasTable data={[item]} loading={false} />);

    fireEvent.click(screen.getByTitle("Imprimir Declaración"));

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo generar el PDF de la Declaración de Alcabala/i),
      ).toBeInTheDocument();
    });

    expect(openSpy).toHaveBeenCalled();
  });

  it("shows a loading state while the request is in flight", async () => {
    let resolve!: (value: string) => void;
    (getDeclaracionPdfBase64Action as any).mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );
    vi.spyOn(window, "open").mockReturnValue({ addEventListener: vi.fn() } as any);

    render(<AlcabalasTable data={[item]} loading={false} />);

    const button = screen.getByTitle("Imprimir Declaración");
    fireEvent.click(button);
    expect(button).toBeDisabled();

    resolve(mockBase64);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("shows an inline error when the action returns null", async () => {
    (getDeclaracionPdfBase64Action as any).mockResolvedValue(null);
    vi.spyOn(window, "open").mockReturnValue({ addEventListener: vi.fn() } as any);

    render(<AlcabalasTable data={[item]} loading={false} />);

    fireEvent.click(screen.getByTitle("Imprimir Declaración"));

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo generar el PDF de la Declaración de Alcabala/i),
      ).toBeInTheDocument();
    });

    expect(window.open).not.toHaveBeenCalled();
  });
});
