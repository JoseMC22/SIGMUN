import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import GeneraDeudaPage from "../page";
import { searchContribuyenteAction } from "@/actions/administracion-tributaria/declaracion-jurada";

// El page es "use client" y consume el server action de declaración jurada;
// se mockea para no depender de next/headers (cookies) en jsdom.
vi.mock("@/actions/administracion-tributaria/declaracion-jurada", () => ({
  searchContribuyenteAction: vi.fn(),
}));

// El modal de "Generar Deuda" se reemplaza por un stub que refleja en
// atributos data-* las props con las que el page lo renderiza, para poder
// aseverar el binding fila → modal sin montar el modal real.
vi.mock("../generar-deuda-modal", () => ({
  default: (props: {
    isOpen: boolean;
    codigoContribuyente?: string;
    nombreContribuyente?: string;
  }) => (
    <div
      data-testid="generar-deuda-modal"
      data-open={String(props.isOpen)}
      data-codigo={props.codigoContribuyente ?? ""}
      data-nombre={props.nombreContribuyente ?? ""}
    />
  ),
}));

const mockAction = vi.mocked(searchContribuyenteAction);

// ── Fixtures ──────────────────────────────────────────────

const emptyResult = {
  success: true as const,
  data: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

const standardItem = {
  codigo: "0279126",
  tipoDetalle: "PERSONA NATURAL",
  gestion: "ADMINISTRADOR",
  nombresCompletos: "QUISPE MAMANI JUAN CARLOS",
  numDoc: "40123456",
  direFis: "AV. LOS PINOS 145",
  row: 1,
};

const standardResult = {
  success: true as const,
  data: [standardItem],
  total: 1,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

// ── Helpers ───────────────────────────────────────────────

function grid() {
  return screen.getByTestId("genera-deuda-grid");
}

function columnHeaders() {
  return within(grid())
    .getAllByRole("columnheader")
    .map((th) => th.textContent?.trim());
}

function selectTipo(value: string) {
  fireEvent.change(screen.getByLabelText(/tipo búsqueda/i), {
    target: { value },
  });
}

async function waitForInitialSearch() {
  await waitFor(() => expect(mockAction).toHaveBeenCalled());
}

// ── Tests ─────────────────────────────────────────────────

describe("GeneraDeudaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Búsqueda por defecto: éxito sin filas (lo que consume el auto-search
    // del montaje salvo que el test encole un mockResolvedValueOnce).
    mockAction.mockResolvedValue(emptyResult);
  });

  it("renderiza el formulario con exactamente 4 opciones de tipo de búsqueda (C/N/R/D)", async () => {
    render(<GeneraDeudaPage />);
    await waitForInitialSearch();

    const select = screen.getByLabelText(/tipo búsqueda/i);
    for (const label of ["Código", "Nombre", "Razón Social", "Documento"]) {
      expect(within(select).getByRole("option", { name: label })).toBeInTheDocument();
    }
    // Los modos Dirección Predio y Placa fueron eliminados.
    expect(within(select).queryByRole("option", { name: "Dirección Predio" })).not.toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "Placa" })).not.toBeInTheDocument();
    expect(within(select).getAllByRole("option")).toHaveLength(4);

    // El checkbox Infracción fue eliminado.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Infracción")).not.toBeInTheDocument();

    // Modo C por defecto: input de código y botón Buscar.
    expect(screen.getByLabelText("Código")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buscar/i })).toBeInTheDocument();
  });

  it("dispara la búsqueda automática al montar con la página 1 y sin checkfrac", async () => {
    render(<GeneraDeudaPage />);
    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(1));

    expect(mockAction).toHaveBeenCalledWith(
      expect.objectContaining({ tipoBusqueda: "C", codigo: "" }),
      1,
      10,
    );

    // checkfrac ya no forma parte del payload (el backend lo defaultea a 0)
    // y tampoco viajan los campos de los modos P/V eliminados.
    const payload = mockAction.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("checkfrac");
    expect(payload).not.toHaveProperty("placa");
    expect(payload).not.toHaveProperty("anno");
  });

  it("muestra el skeleton mientras carga la búsqueda inicial", async () => {
    let resolveSearch!: (value: unknown) => void;
    mockAction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
    );

    render(<GeneraDeudaPage />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    await act(async () => {
      resolveSearch(emptyResult);
    });
    await waitFor(() =>
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument(),
    );
  });

  it("cambiar el tipo de búsqueda resetea los filtros", async () => {
    render(<GeneraDeudaPage />);
    await waitForInitialSearch();

    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "279126" } });

    selectTipo("N");
    // Los inputs del modo N arrancan vacíos.
    expect((screen.getByLabelText("Nombres") as HTMLInputElement).value).toBe("");

    selectTipo("C");
    // De vuelta en C: el código se limpió.
    expect((screen.getByLabelText("Código") as HTMLInputElement).value).toBe("");
  });

  it("renderiza la grilla estándar con sus columnas incluida 'Acciones'", async () => {
    mockAction.mockResolvedValueOnce(standardResult);

    render(<GeneraDeudaPage />);
    await waitFor(() => expect(screen.getByTestId("genera-deuda-grid")).toBeInTheDocument());

    expect(columnHeaders()).toEqual([
      "Código",
      "T. Contribuyente",
      "Tipo/Gestor",
      "Nombres",
      "Nro. Documento",
      "Dirección",
      "Acciones",
    ]);

    expect(within(grid()).getByText("0279126")).toBeInTheDocument();
    expect(within(grid()).getByText("PERSONA NATURAL")).toBeInTheDocument();
    expect(within(grid()).getByText("QUISPE MAMANI JUAN CARLOS")).toBeInTheDocument();
    expect(within(grid()).getByText("40123456")).toBeInTheDocument();
    expect(within(grid()).getByText("AV. LOS PINOS 145")).toBeInTheDocument();

    // Barra de resultados.
    expect(screen.getByText(/se encontraron/i)).toBeInTheDocument();
  });

  it("clic en 'Generar Deuda' abre el modal atado a esa fila (y no dispara alert)", async () => {
    const secondItem = {
      ...standardItem,
      codigo: "0279127",
      nombresCompletos: "ROJAS VEGA MARIA ELENA",
      row: 2,
    };
    mockAction.mockResolvedValueOnce({
      success: true as const,
      data: [standardItem, secondItem],
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<GeneraDeudaPage />);
    await waitFor(() => expect(screen.getByTestId("genera-deuda-grid")).toBeInTheDocument());

    // El modal arranca cerrado y sin contribuyente seleccionado.
    expect(screen.getByTestId("generar-deuda-modal")).toHaveAttribute("data-open", "false");

    const buttons = within(grid()).getAllByRole("button", { name: /generar deuda/i });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);

    const modal = screen.getByTestId("generar-deuda-modal");
    expect(modal).toHaveAttribute("data-open", "true");
    expect(modal).toHaveAttribute("data-codigo", "0279127");
    expect(modal).toHaveAttribute("data-nombre", "ROJAS VEGA MARIA ELENA");
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("muestra el estado vacío tras una búsqueda exitosa sin filas", async () => {
    render(<GeneraDeudaPage />);

    expect(await screen.findByText("No se encontraron resultados")).toBeInTheDocument();
    expect(screen.getByText("Intente ajustar los filtros de búsqueda")).toBeInTheDocument();
    expect(screen.queryByTestId("genera-deuda-grid")).not.toBeInTheDocument();
  });

  it("muestra el estado de error y 'Reintentar' relanza la búsqueda", async () => {
    mockAction.mockResolvedValueOnce({ success: false, error: "Error del servidor" });

    render(<GeneraDeudaPage />);
    expect(await screen.findByText("Error del servidor")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    // El reintento consume el mock base (vacío) → estado vacío.
    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(2));
    expect(mockAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipoBusqueda: "C" }),
      1,
      10,
    );
    await waitFor(() =>
      expect(screen.getByText("No se encontraron resultados")).toBeInTheDocument(),
    );
  });

  it("la paginación llama a la acción con la página 2 al hacer clic", async () => {
    const page1 = {
      success: true as const,
      data: [standardItem, { ...standardItem, codigo: "0279127", row: 2 }],
      total: 25,
      page: 1,
      pageSize: 10,
      totalPages: 3,
    };
    const page2 = {
      success: true as const,
      data: [{ ...standardItem, codigo: "0279128", row: 11 }],
      total: 25,
      page: 2,
      pageSize: 10,
      totalPages: 3,
    };
    mockAction.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

    render(<GeneraDeudaPage />);
    await waitFor(() => expect(screen.getByTestId("genera-deuda-grid")).toBeInTheDocument());

    // Ventana ±2 desde la página 1 con 3 páginas → botones 1, 2 y 3.
    fireEvent.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(2));
    expect(mockAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipoBusqueda: "C" }),
      2,
      10,
    );
    // La grilla se re-renderiza con la fila de la página 2.
    await waitFor(() => expect(within(grid()).getByText("0279128")).toBeInTheDocument());
  });

  it("Enter en el input dispara la búsqueda con el código normalizado a 7 dígitos", async () => {
    render(<GeneraDeudaPage />);
    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(1));

    const input = screen.getByLabelText("Código");
    fireEvent.change(input, { target: { value: "279126" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(2));
    expect(mockAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipoBusqueda: "C", codigo: "0279126" }),
      1,
      10,
    );
    // El valor normalizado se escribe de vuelta en el input.
    expect((input as HTMLInputElement).value).toBe("0279126");
  });
});
