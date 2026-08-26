import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlcabalasTable from "./alcabalas-table";
import { getDeclaracionHtmlAction } from "@/actions/alcabala/impresion-dj-alcabala";

vi.mock("@/actions/alcabala/impresion-dj-alcabala", () => ({
  getDeclaracionHtmlAction: vi.fn(),
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

const mockHtml = "<html><body>fake declaracion</body></html>";

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

  it("invokes onImprimirDeclaracion with html + id on success", async () => {
    (getDeclaracionHtmlAction as any).mockResolvedValue(mockHtml);

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
      expect(onImprimirDeclaracion).toHaveBeenCalledWith(mockHtml, 11772);
    });

    expect(screen.getByTitle("Imprimir Declaración")).not.toBeDisabled();
    expect(getDeclaracionHtmlAction).toHaveBeenCalledWith(11772);
  });

  it("shows a loading state while the request is in flight", async () => {
    let resolve!: (value: string) => void;
    (getDeclaracionHtmlAction as any).mockReturnValue(
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

    resolve(mockHtml);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("shows an inline error when the action returns null", async () => {
    (getDeclaracionHtmlAction as any).mockResolvedValue(null);

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
    (getDeclaracionHtmlAction as any).mockResolvedValue(mockHtml);

    render(<AlcabalasTable data={[item]} loading={false} />);

    fireEvent.click(screen.getByTitle("Imprimir Declaración"));

    await waitFor(() => expect(getDeclaracionHtmlAction).toHaveBeenCalled());
    expect(onImprimirDeclaracion).not.toHaveBeenCalled();
  });

  it("is disabled and does not print when estado is Inactivo (0)", () => {
    const inactivo = { ...item, estado: "0" };
    render(
      <AlcabalasTable
        data={[inactivo]}
        loading={false}
        onImprimirDeclaracion={onImprimirDeclaracion}
      />,
    );

    const btn = screen.getByTitle(
      "Solo disponible para alcabalas en estado Activo",
    );
    expect(btn).toBeDisabled();

    fireEvent.click(btn);
    expect(getDeclaracionHtmlAction).not.toHaveBeenCalled();
    expect(onImprimirDeclaracion).not.toHaveBeenCalled();
  });

  it("is disabled and does not print when estado is Anulado (2)", () => {
    const anulado = { ...item, estado: "2" };
    render(
      <AlcabalasTable
        data={[anulado]}
        loading={false}
        onImprimirDeclaracion={onImprimirDeclaracion}
      />,
    );

    const btn = screen.getByTitle(
      "Solo disponible para alcabalas en estado Activo",
    );
    expect(btn).toBeDisabled();

    fireEvent.click(btn);
    expect(getDeclaracionHtmlAction).not.toHaveBeenCalled();
    expect(onImprimirDeclaracion).not.toHaveBeenCalled();
  });
});

describe("AlcabalasTable — Eliminar (baja) button", () => {
  let onEliminar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onEliminar = vi.fn();
  });

  it("renders an enabled Eliminar button with title 'Eliminar'", () => {
    render(<AlcabalasTable data={[item]} loading={false} onEliminar={onEliminar} />);
    const btn = screen.getByTitle("Eliminar");
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("shows an inline warning and does NOT call onEliminar when estado is not Activo", () => {
    const anulado = { ...item, estado: "2" };
    render(<AlcabalasTable data={[anulado]} loading={false} onEliminar={onEliminar} />);

    fireEvent.click(screen.getByTitle("Eliminar"));

    expect(
      screen.getByText(/Solo se puede dar de baja una alcabala en estado Activo\./i),
    ).toBeInTheDocument();
    expect(onEliminar).not.toHaveBeenCalled();
  });

  it("calls onEliminar with the item when estado is Activo", () => {
    render(<AlcabalasTable data={[item]} loading={false} onEliminar={onEliminar} />);

    fireEvent.click(screen.getByTitle("Eliminar"));

    expect(onEliminar).toHaveBeenCalledWith(item);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not call onEliminar when no callback is provided", () => {
    render(<AlcabalasTable data={[item]} loading={false} />);

    fireEvent.click(screen.getByTitle("Eliminar"));

    expect(onEliminar).not.toHaveBeenCalled();
  });
});
