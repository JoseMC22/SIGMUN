import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => nav.searchParams,
}));

vi.mock("@/actions/administracion-tributaria/estado-cuenta-proyectado", () => ({
  searchContribuyentesProyectadosAction: vi.fn(),
}));

import EstadoCuentaProyectadoPage from "./page";
import { searchContribuyentesProyectadosAction } from "@/actions/administracion-tributaria/estado-cuenta-proyectado";
import type { ContribuyenteProyectadoRow } from "@/actions/administracion-tributaria/estado-cuenta-proyectado";

const mockSearch = vi.mocked(searchContribuyentesProyectadosAction);

const ROW: ContribuyenteProyectadoRow = {
  codigo: "0000123",
  nombres: "JUAN PEREZ",
  documento: "12345678",
  direccion: "AV. CENTRAL 123",
};

type OkResult = {
  success: true;
  data: ContribuyenteProyectadoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function okResult(overrides: Partial<OkResult> = {}): OkResult {
  return {
    success: true,
    data: [ROW],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    ...overrides,
  };
}

function renderSearchPage(): void {
  render(<EstadoCuentaProyectadoPage />);
}

// Text filters share their label text with the criterion radios, so scope
// label queries to the text inputs to avoid ambiguous matches.
function getTextInput(label: string): HTMLElement {
  return screen.getByLabelText(label, { selector: 'input[type="text"]' });
}

describe("EstadoCuentaProyectadoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.searchParams = new URLSearchParams();
    mockSearch.mockResolvedValue(okResult({ data: [], total: 0, totalPages: 0 }));
  });

  it("renders the four criterion radios, all six inputs and the Buscar button", () => {
    renderSearchPage();

    for (const name of [
      "Criterio Código",
      "Criterio Nombres",
      "Criterio Razón Social",
      "Criterio Documento",
    ]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
    for (const label of [
      "Código de contribuyente",
      "Nombres",
      "Apellido Paterno",
      "Apellido Materno",
      "Razón Social",
      "Nro. Documento",
    ]) {
      expect(getTextInput(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /^buscar$/i })).toBeInTheDocument();
    expect(screen.getByText(/presione buscar para consultar/i)).toBeInTheDocument();
  });

  it("switches the visible filter inputs when the criterion changes", () => {
    renderSearchPage();

    const codigo = getTextInput("Código de contribuyente");
    expect(codigo).toBeVisible();
    expect(getTextInput("Nombres")).not.toBeVisible();

    fireEvent.click(screen.getByRole("radio", { name: "Criterio Nombres" }));
    expect(codigo).not.toBeVisible();
    expect(getTextInput("Nombres")).toBeVisible();
    expect(getTextInput("Apellido Paterno")).toBeVisible();
    expect(getTextInput("Apellido Materno")).toBeVisible();

    fireEvent.click(screen.getByRole("radio", { name: "Criterio Razón Social" }));
    expect(getTextInput("Razón Social")).toBeVisible();
    expect(getTextInput("Nombres")).not.toBeVisible();

    fireEvent.click(screen.getByRole("radio", { name: "Criterio Documento" }));
    expect(getTextInput("Nro. Documento")).toBeVisible();
    expect(getTextInput("Razón Social")).not.toBeVisible();
  });

  it("rejects letters in codigo and caps documento at eleven digits", () => {
    renderSearchPage();
    const codigo = getTextInput("Código de contribuyente");
    const documento = getTextInput("Nro. Documento");

    fireEvent.change(codigo, { target: { value: "ab12c3" } });
    fireEvent.change(documento, { target: { value: "12a3456789012" } });

    expect(codigo).toHaveValue("123");
    expect(documento).toHaveValue("12345678901");
    expect(codigo).toHaveAttribute("inputmode", "numeric");
    expect(documento).toHaveAttribute("maxlength", "11");
  });

  it("pads codigo to seven digits on blur and sends it with pageSize 20", async () => {
    renderSearchPage();
    const codigo = getTextInput("Código de contribuyente");

    fireEvent.change(codigo, { target: { value: "45" } });
    fireEvent.blur(codigo);
    expect(codigo).toHaveValue("0000045");

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    await vi.waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ tipoBusqueda: "C", codigo: "0000045" }),
        1,
        20,
      ),
    );
  });

  it("uppercases free-text filters and sends the active criterion", async () => {
    renderSearchPage();

    fireEvent.click(screen.getByRole("radio", { name: "Criterio Nombres" }));
    fireEvent.change(getTextInput("Nombres"), {
      target: { value: "juan" },
    });
    fireEvent.change(getTextInput("Apellido Paterno"), {
      target: { value: "perez" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    await vi.waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoBusqueda: "N",
          criterioNombre: "JUAN",
          criterioPaterno: "PEREZ",
        }),
        1,
        20,
      ),
    );
  });

  it("renders the four legacy grid columns and the Estado de Cuenta action", async () => {
    mockSearch.mockResolvedValueOnce(okResult());
    renderSearchPage();

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    const grid = await screen.findByRole("grid", {
      name: /resultados de búsqueda de contribuyentes/i,
    });
    const headers = within(grid).getAllByRole("columnheader");
    expect(headers).toHaveLength(5);
    expect(headers.map((header) => header.textContent)).toEqual([
      "Código",
      "Nombres",
      "Nro. Documento",
      "Dirección",
      "Acción",
    ]);
    expect(within(grid).getByText("JUAN PEREZ")).toBeInTheDocument();
    expect(within(grid).getByText("12345678")).toBeInTheDocument();
    expect(within(grid).getByText("AV. CENTRAL 123")).toBeInTheDocument();

    const action = within(grid).getByRole("button", { name: /estado de cuenta/i });
    expect(action).toHaveAttribute("title", "Estado de Cuenta Proyectado");
  });

  it("navigates to the destination route carrying codigo", async () => {
    mockSearch.mockResolvedValueOnce(okResult());
    renderSearchPage();

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    const grid = await screen.findByRole("grid");
    fireEvent.click(within(grid).getByRole("button", { name: /estado de cuenta/i }));

    expect(nav.push).toHaveBeenCalledWith(
      "/dashboard/administracion-tributaria/estado-cuenta-proyectado?codigo=0000123",
    );
  });

  it("requests the selected page with pageSize 20", async () => {
    mockSearch.mockResolvedValueOnce(okResult({ total: 45, totalPages: 3 }));
    renderSearchPage();

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await screen.findByRole("grid");

    mockSearch.mockResolvedValueOnce(okResult({ page: 2, total: 45, totalPages: 3 }));
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    await vi.waitFor(() =>
      expect(mockSearch).toHaveBeenLastCalledWith(expect.objectContaining({}), 2, 20),
    );
  });

  it("shows the canonical error message in an alert", async () => {
    mockSearch.mockResolvedValueOnce({
      success: false,
      code: "database_unavailable",
      message: "Base de datos no disponible",
    });
    renderSearchPage();

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Base de datos no disponible");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("renders an honest stub when codigo is present in the query string", () => {
    nav.searchParams = new URLSearchParams("codigo=0000123");
    renderSearchPage();

    expect(screen.getByText("0000123")).toBeInTheDocument();
    expect(
      screen.getByText(/se implementa en el siguiente work unit/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
