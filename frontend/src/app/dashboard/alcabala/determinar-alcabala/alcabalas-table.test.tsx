import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlcabalasTable from "./alcabalas-table";
import { getDeclaracionPdfBase64Action } from "@/actions/alcabala/impresion-dj-alcabala";

vi.mock("@/actions/alcabala/impresion-dj-alcabala", () => ({
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

describe("AlcabalasTable — Imprimir Declaración button", () => {
  let onImprimirDeclaracion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onImprimirDeclaracion = vi.fn();
  });

  it("renders the 'Imprimir Declaración' button", () => {
    render(
      <AlcabalasTable
        data={[item]}
        loading={false}
        onImprimirDeclaracion={onImprimirDeclaracion}
      />,
    );

    expect(screen.getByTitle("Imprimir Declaración")).toBeInTheDocument();
  });

  it("invokes onImprimirDeclaracion with base64 + id on success", async () => {
    (getDeclaracionPdfBase64Action as any).mockResolvedValue(mockBase64);

    render(
      <AlcabalasTable
        data={[item]}
        loading={false}
        onImprimirDeclaracion={onImprimirDeclaracion}
      />,
    );

    const button = screen.getByTitle("Imprimir Declaración");
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    // Loading state: button disabled while the action is in flight
    expect(screen.getByTitle("Imprimir Declaración")).toBeDisabled();

    await waitFor(() => {
      expect(onImprimirDeclaracion).toHaveBeenCalledWith(mockBase64, 11772);
    });

    expect(screen.getByTitle("Imprimir Declaración")).not.toBeDisabled();
    expect(getDeclaracionPdfBase64Action).toHaveBeenCalledWith(11772);
  });

  it("shows a loading state while the request is in flight", async () => {
    let resolve!: (value: string) => void;
    (getDeclaracionPdfBase64Action as any).mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );

    render(
      <AlcabalasTable
        data={[item]}
        loading={false}
        onImprimirDeclaracion={onImprimirDeclaracion}
      />,
    );

    const button = screen.getByTitle("Imprimir Declaración");
    fireEvent.click(button);
    expect(button).toBeDisabled();

    resolve(mockBase64);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("shows an inline error when the action returns null", async () => {
    (getDeclaracionPdfBase64Action as any).mockResolvedValue(null);

    render(
      <AlcabalasTable
        data={[item]}
        loading={false}
        onImprimirDeclaracion={onImprimirDeclaracion}
      />,
    );

    fireEvent.click(screen.getByTitle("Imprimir Declaración"));

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo generar el PDF de la Declaración de Alcabala/i),
      ).toBeInTheDocument();
    });

    expect(onImprimirDeclaracion).not.toHaveBeenCalled();
  });

  it("does not call onImprimirDeclaracion when no callback provided", async () => {
    (getDeclaracionPdfBase64Action as any).mockResolvedValue(mockBase64);

    render(<AlcabalasTable data={[item]} loading={false} />);

    fireEvent.click(screen.getByTitle("Imprimir Declaración"));

    await waitFor(() => expect(getDeclaracionPdfBase64Action).toHaveBeenCalled());
    expect(onImprimirDeclaracion).not.toHaveBeenCalled();
  });
});
