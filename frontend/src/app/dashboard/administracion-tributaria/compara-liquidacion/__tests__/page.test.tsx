import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import ComparaLiquidacionPage from "../page";
import { buscarLiquidacionAction } from "@/actions/administracion-tributaria/compara-liquidacion";

// El page es "use client" y consume el server action de comparación; se
// mockea para no depender de next/headers (cookies) en jsdom.
vi.mock("@/actions/administracion-tributaria/compara-liquidacion", () => ({
  buscarLiquidacionAction: vi.fn(),
}));

// Instancia de jsPDF accesible para aserciones (vi.hoisted: la factory del
// vi.mock se iza antes de estas const, igual que cuadre-caja).
const pdfMocks = vi.hoisted(() => ({
  docText: vi.fn(),
  docSave: vi.fn(),
}));

vi.mock("jspdf", () => ({
  default: vi.fn(() => ({
    text: pdfMocks.docText,
    save: pdfMocks.docSave,
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
  })),
}));

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

const mockAction = vi.mocked(buscarLiquidacionAction);

// Fixture con datos reales de 26-00000001.
const cabeceraOk = {
  idLiquidacion: 1108398,
  numero: "26-00000001",
  codigo: "0263958",
  monto: 1557.96,
  observacion: null,
  estado: "1",
  usuario: "MVAEZ",
  terminal: "INFOSAT01",
  fregistro: "2026-01-05T07:30:25.527Z",
  fvencimiento: "2026-01-05T00:00:00.000Z",
  observacion2: null,
};

const detalleOk = [
  {
    secuencia: 1,
    tipo: "02.01",
    tipoRec: "02.01",
    anno: 2025,
    periodo: "02",
    impInsol: 500.07,
    impMora: 32.85,
    costoEmi: 0,
    total: 532.92,
    nombre: "CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA",
    femision: "MVAEZ - Ene  5 2026  7:30AM",
  },
  {
    secuencia: 2,
    tipo: "02.01",
    tipoRec: "02.01",
    anno: 2025,
    periodo: "03",
    impInsol: 500.07,
    impMora: 19.35,
    costoEmi: 0,
    total: 519.42,
    nombre: "CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA",
    femision: "MVAEZ - Ene  5 2026  7:30AM",
  },
  {
    secuencia: 3,
    tipo: "02.01",
    tipoRec: "02.01",
    anno: 2025,
    periodo: "04",
    impInsol: 500.07,
    impMora: 5.55,
    costoEmi: 0,
    total: 505.62,
    nombre: "CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA",
    femision: "MVAEZ - Ene  5 2026  7:30AM",
  },
];

function panelA() {
  return within(screen.getByTestId("panel-a"));
}

function panelB() {
  return within(screen.getByTestId("panel-b"));
}

// Observación larga real (cadena %*,*-delimitada sin espacios) para T7.
const observacionLarga =
  "0263958%*2025*%*02.30*,*02.01*,*00.16*,*02.01*,*02.01*,*02.01*%*00.00*,*00.00*,*0.00*,*0.00*%*FIN*";

const cabeceraConObservacion = { ...cabeceraOk, observacion: observacionLarga };

describe("ComparaLiquidacionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado inicial (idle) en ambos paneles sin llamar a la acción", () => {
    render(<ComparaLiquidacionPage />);

    // Ambos paneles con su buscador.
    expect(panelA().getByLabelText(/número de liquidación/i)).toBeInTheDocument();
    expect(panelB().getByLabelText(/número de liquidación/i)).toBeInTheDocument();
    expect(panelA().getByRole("button", { name: /buscar/i })).toBeInTheDocument();
    expect(panelB().getByRole("button", { name: /buscar/i })).toBeInTheDocument();

    // Estado idle: mensaje inicial y sin tabla de detalle.
    expect(panelA().getByText(/ingrese un número de liquidación/i)).toBeInTheDocument();
    expect(panelB().getByText(/ingrese un número de liquidación/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    // No se dispara ninguna búsqueda en el montaje.
    expect(mockAction).not.toHaveBeenCalled();
  });

  it("bloquea la búsqueda con el número vacío sin llamar a la acción", async () => {
    render(<ComparaLiquidacionPage />);

    fireEvent.click(panelA().getByRole("button", { name: /buscar/i }));

    await waitFor(() => {
      expect(panelA().getByText(/ingrese un número de liquidación válido/i)).toBeInTheDocument();
    });
    expect(mockAction).not.toHaveBeenCalled();
  });

  it("busca en el panel A y renderiza cabecera + 3 filas de detalle", async () => {
    mockAction.mockResolvedValueOnce({
      success: true,
      cabecera: cabeceraOk,
      detalle: detalleOk,
    });

    render(<ComparaLiquidacionPage />);

    fireEvent.change(panelA().getByLabelText(/número de liquidación/i), {
      target: { value: "26-00000001" },
    });
    fireEvent.click(panelA().getByRole("button", { name: /buscar/i }));

    // La acción se llama con el número ingresado.
    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledWith("26-00000001");
    });

    // Cabecera: número, código y monto en formato de moneda del módulo.
    const header = await screen.findByTestId("cabecera-a");
    expect(within(header).getByText("26-00000001")).toBeInTheDocument();
    expect(within(header).getByText("0263958")).toBeInTheDocument();
    expect(within(header).getByText(/1,?557\.96/)).toBeInTheDocument();

    // Detalle: tabla con las 3 filas ordenadas tal como llegan del SP.
    const tabla = screen.getByRole("table");
    await waitFor(() => {
      expect(within(screen.getByTestId("panel-a")).getAllByRole("row")).toHaveLength(4); // header + 3 filas
    });
    expect(within(tabla).getByText("532.92")).toBeInTheDocument();
    expect(within(tabla).getByText("519.42")).toBeInTheDocument();
    expect(within(tabla).getByText("505.62")).toBeInTheDocument();
    expect(within(tabla).getAllByText("CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA")).toHaveLength(3);
  });

  it("muestra 'no encontrada' cuando la cabecera retorna null", async () => {
    mockAction.mockResolvedValueOnce({
      success: true,
      cabecera: null,
      detalle: [],
    });

    render(<ComparaLiquidacionPage />);

    fireEvent.change(panelA().getByLabelText(/número de liquidación/i), {
      target: { value: "99-99999999" },
    });
    fireEvent.click(panelA().getByRole("button", { name: /buscar/i }));

    expect(
      await within(screen.getByTestId("panel-a")).findByText(/no existe|no encontrada/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("muestra el estado de error cuando la acción retorna success:false", async () => {
    mockAction.mockResolvedValueOnce({
      success: false,
      error: "Formato inválido",
    });

    render(<ComparaLiquidacionPage />);

    fireEvent.change(panelA().getByLabelText(/número de liquidación/i), {
      target: { value: "FF-XXXX" },
    });
    fireEvent.click(panelA().getByRole("button", { name: /buscar/i }));

    expect(
      await within(screen.getByTestId("panel-a")).findByText(/formato inválido/i),
    ).toBeInTheDocument();
  });

  it("mantiene el estado de ambos paneles independiente entre sí", async () => {
    mockAction
      .mockResolvedValueOnce({
        success: true,
        cabecera: cabeceraOk,
        detalle: detalleOk,
      })
      .mockResolvedValueOnce({
        success: true,
        cabecera: null,
        detalle: [],
      });

    render(<ComparaLiquidacionPage />);

    // Panel A carga datos, panel B aún idle.
    fireEvent.change(panelA().getByLabelText(/número de liquidación/i), {
      target: { value: "26-00000001" },
    });
    fireEvent.click(panelA().getByRole("button", { name: /buscar/i }));
    await screen.findByTestId("cabecera-a");
    expect(
      within(screen.getByTestId("panel-b")).getByText(/ingrese un número de liquidación/i),
    ).toBeInTheDocument();

    // Panel B busca otro número que no existe; A conserva su resultado.
    fireEvent.change(panelB().getByLabelText(/número de liquidación/i), {
      target: { value: "99-99999999" },
    });
    fireEvent.click(panelB().getByRole("button", { name: /buscar/i }));
    expect(
      await within(screen.getByTestId("panel-b")).findByText(/no existe|no encontrada/i),
    ).toBeInTheDocument();

    // El panel A sigue mostrando su cabecera cargada.
    expect(within(screen.getByTestId("cabecera-a")).getByText("26-00000001")).toBeInTheDocument();
    expect(mockAction).toHaveBeenCalledTimes(2);
  });

  // ── T7: Observación completa ─────────────────────────────────

  it("muestra la observación completa de la cabecera sin truncar", async () => {
    mockAction.mockResolvedValueOnce({
      success: true,
      cabecera: cabeceraConObservacion,
      detalle: detalleOk,
    });

    render(<ComparaLiquidacionPage />);

    fireEvent.change(panelA().getByLabelText(/número de liquidación/i), {
      target: { value: "26-00000001" },
    });
    fireEvent.click(panelA().getByRole("button", { name: /buscar/i }));

    const header = await screen.findByTestId("cabecera-a");
    // La cadena completa está en el DOM, sin cortes.
    expect(within(header).getByText(observacionLarga)).toBeInTheDocument();

    // Sin truncate; con break-all para que la cadena sin espacios quebre;
    // el wrapper de Observación ocupa las dos columnas del grid.
    const dd = within(header).getByText(observacionLarga);
    expect(dd).not.toHaveClass("truncate");
    expect(dd).toHaveClass("break-all");
    expect(dd.closest("div")).toHaveClass("col-span-2");
  });

  // ── T8: Exportar a PDF ───────────────────────────────────────

  it("deshabilita el botón Exportar a PDF cuando ningún panel tiene resultados", () => {
    render(<ComparaLiquidacionPage />);

    const btn = screen.getByRole("button", { name: /exportar a pdf/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("habilita el botón Exportar a PDF cuando al menos un panel carga resultados", async () => {
    mockAction.mockResolvedValueOnce({
      success: true,
      cabecera: cabeceraConObservacion,
      detalle: detalleOk,
    });

    render(<ComparaLiquidacionPage />);

    expect(screen.getByRole("button", { name: /exportar a pdf/i })).toBeDisabled();

    fireEvent.change(panelA().getByLabelText(/número de liquidación/i), {
      target: { value: "26-00000001" },
    });
    fireEvent.click(panelA().getByRole("button", { name: /buscar/i }));

    await screen.findByTestId("cabecera-a");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /exportar a pdf/i })).toBeEnabled();
    });
  });

  it("exporta el PDF con ambas liquidaciones lado a lado al hacer clic", async () => {
    const { default: autoTable } = await import("jspdf-autotable");

    mockAction
      .mockResolvedValueOnce({
        success: true,
        cabecera: cabeceraConObservacion,
        detalle: detalleOk,
      })
      .mockResolvedValueOnce({
        success: true,
        cabecera: null,
        detalle: [],
      });

    render(<ComparaLiquidacionPage />);

    fireEvent.change(panelA().getByLabelText(/número de liquidación/i), {
      target: { value: "26-00000001" },
    });
    fireEvent.click(panelA().getByRole("button", { name: /buscar/i }));
    await screen.findByTestId("cabecera-a");

    fireEvent.change(panelB().getByLabelText(/número de liquidación/i), {
      target: { value: "99-99999999" },
    });
    fireEvent.click(panelB().getByRole("button", { name: /buscar/i }));
    await within(screen.getByTestId("panel-b")).findByText(/no existe|no encontrada/i);

    fireEvent.click(screen.getByRole("button", { name: /exportar a pdf/i }));
    await waitFor(() => expect(pdfMocks.docSave).toHaveBeenCalled());

    // Título con ambos números (B no existe → placeholder).
    const titleCall = pdfMocks.docText.mock.calls.find(
      (c) => typeof c[0] === "string" && String(c[0]).includes("Comparación de Liquidaciones"),
    );
    expect(titleCall?.[0]).toContain("26-00000001");
    expect(pdfMocks.docText).toHaveBeenCalledWith("Sin datos", expect.anything(), expect.anything());

    // Cabecera + detalle del panel A (2 autoTable, uno al lado izquierdo).
    expect(vi.mocked(autoTable).mock.calls.length).toBeGreaterThanOrEqual(2);
    const margins = vi
      .mocked(autoTable)
      .mock.calls.map((c) => (c[1] as { margin?: { left?: number } }).margin?.left);
    expect(margins[0]).toBe(14);
    expect(margins[0]).toBeLessThan(148); // mitad de la página landscape (297mm)

    // La observación completa va en el PDF (envuelta, no cortada).
    const bodyRows = vi
      .mocked(autoTable)
      .mock.calls.flatMap((c) => (c[1] as { body: unknown[][] }).body);
    expect(bodyRows.some((r) => r.some((c) => c === observacionLarga))).toBe(true);

    const filename = pdfMocks.docSave.mock.calls[0][0] as string;
    expect(filename).toContain("compara-liquidacion");
  });
});
