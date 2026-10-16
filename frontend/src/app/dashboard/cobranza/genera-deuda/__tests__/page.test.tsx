import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import GeneraDeudaPage from "../page";
import { searchContribuyenteAction } from "@/actions/administracion-tributaria/declaracion-jurada";

// El page es "use client" y consume el server action de declaración jurada;
// se mockea para no depender de next/headers (cookies) en jsdom.
vi.mock("@/actions/administracion-tributaria/declaracion-jurada", () => ({
  searchContribuyenteAction: vi.fn(),
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

const placaItem = {
  codigo: "0279126",
  nombresCompletos: "QUISPE MAMANI JUAN CARLOS",
  numDoc: "40123456",
  direFis: "AV. LOS PINOS 145",
  placa: "ABC123",
  row: 1,
};

const placaResult = {
  success: true as const,
  data: [placaItem],
  total: 1,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

const direccionItem = {
  codigo: "0279126",
  nombre: "QUISPE MAMANI JUAN CARLOS",
  codPred: "10452",
  anexo: "0001",
  subAnexo: "0001",
  direccion: "AV. LOS PINOS 145",
  row: 1,
};

const direccionResult = {
  success: true as const,
  data: [direccionItem],
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

  it("renderiza el formulario con las 6 opciones de tipo de búsqueda", async () => {
    render(<GeneraDeudaPage />);
    await waitForInitialSearch();

    const select = screen.getByLabelText(/tipo búsqueda/i);
    for (const label of [
      "Código",
      "Nombre",
      "Razón Social",
      "Documento",
      "Dirección Predio",
      "Placa",
    ]) {
      expect(within(select).getByRole("option", { name: label })).toBeInTheDocument();
    }

    // Modo C por defecto: input de código, checkbox Infracción y botón Buscar.
    expect(screen.getByLabelText("Código")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Infracción" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buscar/i })).toBeInTheDocument();
  });

  it("dispara la búsqueda automática al montar con la página 1", async () => {
    render(<GeneraDeudaPage />);
    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(1));

    expect(mockAction).toHaveBeenCalledWith(
      expect.objectContaining({ tipoBusqueda: "C", checkfrac: 0, codigo: "" }),
      1,
      10,
    );
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

  it("muestra el select de año con 'Todos' en modo Dirección Predio", async () => {
    render(<GeneraDeudaPage />);
    await waitForInitialSearch();

    // En modo C no hay select de año.
    expect(screen.queryByLabelText("Año")).not.toBeInTheDocument();

    selectTipo("P");

    const anio = screen.getByLabelText("Año");
    expect(within(anio).getByRole("option", { name: "Todos" })).toBeInTheDocument();
    expect(
      within(anio).getByRole("option", { name: String(new Date().getFullYear()) }),
    ).toBeInTheDocument();

    // El resto de inputs del modo P.
    expect(screen.getByLabelText("Código Predio")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre Vía")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre Urb.")).toBeInTheDocument();
  });

  it("cambiar el tipo de búsqueda resetea los filtros y el checkbox Infracción", async () => {
    render(<GeneraDeudaPage />);
    await waitForInitialSearch();

    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "279126" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Infracción" }));

    selectTipo("N");
    // Los inputs del modo N arrancan vacíos.
    expect((screen.getByLabelText("Nombres") as HTMLInputElement).value).toBe("");

    selectTipo("C");
    // De vuelta en C: el código se limpió y el checkbox se desmarcó.
    expect((screen.getByLabelText("Código") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("checkbox", { name: "Infracción" })).not.toBeChecked();
  });

  it("renderiza la grilla estándar (modo C) con sus columnas y sin columna Acciones", async () => {
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
    ]);
    expect(within(grid()).queryByText("Acciones")).not.toBeInTheDocument();

    expect(within(grid()).getByText("0279126")).toBeInTheDocument();
    expect(within(grid()).getByText("PERSONA NATURAL")).toBeInTheDocument();
    expect(within(grid()).getByText("QUISPE MAMANI JUAN CARLOS")).toBeInTheDocument();
    expect(within(grid()).getByText("40123456")).toBeInTheDocument();
    expect(within(grid()).getByText("AV. LOS PINOS 145")).toBeInTheDocument();

    // Barra de resultados.
    expect(screen.getByText(/se encontraron/i)).toBeInTheDocument();
  });

  it("renderiza la grilla de placa (modo V) con sus columnas", async () => {
    mockAction.mockResolvedValueOnce(emptyResult).mockResolvedValueOnce(placaResult);

    render(<GeneraDeudaPage />);
    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(1));

    selectTipo("V");
    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(2));
    expect(mockAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipoBusqueda: "V", placa: "ABC123" }),
      1,
      10,
    );

    await waitFor(() => expect(screen.getByTestId("genera-deuda-grid")).toBeInTheDocument());
    expect(columnHeaders()).toEqual([
      "Código",
      "Nombres",
      "Nro. Documento",
      "Dirección",
      "Placa",
    ]);
    expect(within(grid()).getByText("ABC123")).toBeInTheDocument();
  });

  it("renderiza la grilla de dirección (modo P) con sus columnas", async () => {
    mockAction.mockResolvedValueOnce(emptyResult).mockResolvedValueOnce(direccionResult);

    render(<GeneraDeudaPage />);
    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(1));

    selectTipo("P");
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(2));

    await waitFor(() => expect(screen.getByTestId("genera-deuda-grid")).toBeInTheDocument());
    expect(columnHeaders()).toEqual([
      "Código",
      "Nombre",
      "Cód. Predio",
      "Anexo",
      "Sub Anexo",
      "Dirección",
    ]);
    expect(within(grid()).getByText("10452")).toBeInTheDocument();
    expect(within(grid()).getByText("AV. LOS PINOS 145")).toBeInTheDocument();
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
