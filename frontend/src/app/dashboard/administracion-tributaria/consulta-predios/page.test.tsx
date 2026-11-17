import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import ConsultaPrediosPage from "./page";
import {
  exportarPredios,
  searchConsultaPrediosAction,
} from "@/actions/administracion-tributaria/consulta-predios";
import type { ConsultaPrediosRow } from "@/actions/administracion-tributaria/consulta-predios";
import { downloadPrediosWorkbook } from "./export-utils";

// El page consume la server action; se mockea para no depender de next/headers
// (cookies) ni de red real en jsdom.
vi.mock("@/actions/administracion-tributaria/consulta-predios", () => ({
  searchConsultaPrediosAction: vi.fn(),
  exportarPredios: vi.fn(),
}));
vi.mock("./export-utils", () => ({
  downloadPrediosWorkbook: vi.fn(),
  EXPORT_FILENAME: "Reporte de predios.xls",
}));

const mockSearch = vi.mocked(searchConsultaPrediosAction);
const mockExport = vi.mocked(exportarPredios);
const mockDownload = vi.mocked(downloadPrediosWorkbook);

const predio: ConsultaPrediosRow = {
  codigo: "0000123",
  nombre: "JUAN PEREZ",
  cod_pred: "01-02-03",
  anexo: "1-0",
  direccion: "AV. CENTRAL 123",
  uso: "HABITACION",
  t_area_const: 120.5,
  area_terreno: 200,
  porcen: 100,
  val_terreno: 1000,
  val_constru: 2000,
  autoavaluo: 3000,
  id_instalas: "01",
  num_pisos: 2,
  categoria: "A",
};

type OkResult = {
  success: true;
  data: ConsultaPrediosRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function okResult(overrides: Partial<OkResult> = {}): OkResult {
  return {
    success: true,
    data: [predio],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    ...overrides,
  };
}

type OkExportResult = {
  success: true;
  title: string;
  mostrarPisos: boolean;
  columns: { key: string; label: string; sourceIndex: number }[];
  rows: string[][];
};

function okExportResult(overrides: Partial<OkExportResult> = {}): OkExportResult {
  return {
    success: true,
    title: "TITULO DEL SP",
    mostrarPisos: false,
    columns: [{ key: "n", label: "N", sourceIndex: -1 }],
    rows: [["1"]],
    ...overrides,
  };
}

describe("ConsultaPrediosPage", () => {
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue(okResult({ data: [], total: 0, totalPages: 0 }));
    mockExport.mockResolvedValue(okExportResult());
  });

  it("renderiza los nueve filtros de texto, el combo Año y el checkbox Mostrar Pisos", () => {
    render(<ConsultaPrediosPage />);

    expect(screen.getByLabelText(/^código$/i)).toHaveAttribute("maxlength", "7");
    expect(screen.getByLabelText(/código de predio/i)).toBeInTheDocument();
    for (const label of [/^vía$/i, /urbanización/i, /número/i, /dpto\./i, /mza\./i, /lte\./i, /sublote/i]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }

    const anno = screen.getByLabelText(/^año$/i) as HTMLSelectElement;
    expect(anno).toHaveValue(String(currentYear));
    expect(anno.options).toHaveLength(currentYear - 1998 + 1);
    expect(anno.options[0]).toHaveValue("1998");
    expect(screen.getByRole("button", { name: /^buscar$/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /mostrar pisos/i })).not.toBeChecked();
    expect(screen.getByText(/presione buscar para consultar/i)).toBeInTheDocument();
  });

  it("rechaza letras en el código, rellena con ceros al salir y busca con Enter", async () => {
    render(<ConsultaPrediosPage />);
    const codigo = screen.getByLabelText(/^código$/i);

    fireEvent.change(codigo, { target: { value: "ab" } });
    expect(codigo).toHaveValue("");

    fireEvent.change(codigo, { target: { value: "12a3" } });
    expect(codigo).toHaveValue("123");

    fireEvent.change(codigo, { target: { value: "123" } });
    fireEvent.blur(codigo);
    expect(codigo).toHaveValue("0000123");

    fireEvent.change(codigo, { target: { value: "45" } });
    fireEvent.keyDown(codigo, { key: "Enter" });

    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: "0000045" }),
        1,
        20,
      ),
    );
  });

  it("admite solo dígitos en el código de predio", () => {
    render(<ConsultaPrediosPage />);
    const codPred = screen.getByLabelText(/código de predio/i);

    fireEvent.change(codPred, { target: { value: "ab-12 c3" } });

    expect(codPred).toHaveValue("123");
  });

  it("pasa a mayúsculas los filtros de texto mientras se escriben", () => {
    render(<ConsultaPrediosPage />);
    const cases = [
      [/^vía$/i, "av central"],
      [/urbanización/i, "lima sur"],
      [/^dpto\.$/i, "lima"],
      [/^mza\.$/i, "a1"],
      [/^lte\.$/i, "b2"],
      [/sublote/i, "c3"],
    ] as const;

    for (const [label, typed] of cases) {
      const input = screen.getByLabelText(label);
      fireEvent.change(input, { target: { value: typed } });
      expect(input).toHaveValue(typed.toUpperCase());
    }
  });

  it("expone atributos numéricos en los códigos y clase uppercase en los filtros de texto", () => {
    render(<ConsultaPrediosPage />);
    const codigo = screen.getByLabelText(/^código$/i);
    const codPred = screen.getByLabelText(/código de predio/i);

    for (const input of [codigo, codPred]) {
      expect(input).toHaveAttribute("inputmode", "numeric");
      expect(input).toHaveAttribute("pattern", "[0-9]*");
    }
    for (const label of [
      /^vía$/i,
      /urbanización/i,
      /^dpto\.$/i,
      /^mza\.$/i,
      /^lte\.$/i,
      /sublote/i,
    ]) {
      expect(screen.getByLabelText(label)).toHaveClass("uppercase");
    }
  });

  it("renderiza las 15 columnas de datos mas la numeracion UI-only tras una busqueda exitosa", async () => {
    mockSearch.mockResolvedValueOnce(okResult());
    render(<ConsultaPrediosPage />);

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    const grid = await screen.findByRole("grid", { name: /resultados de consulta de predios/i });
    expect(within(grid).getAllByRole("columnheader")).toHaveLength(16);
    expect(within(grid).getByText("Dirección")).toBeInTheDocument();
    expect(within(grid).getByText("% Propiedad")).toBeInTheDocument();
    expect(within(grid).getByText("JUAN PEREZ")).toBeInTheDocument();

    const dataRow = within(grid).getAllByRole("row")[1];
    const cells = within(dataRow).getAllByRole("cell");
    expect(cells).toHaveLength(16);
    expect(cells[0]).toHaveTextContent("1");
    expect(cells[1]).toHaveTextContent("0000123");
  });

  it("pide la pagina seleccionada con pageSize 20", async () => {
    mockSearch.mockResolvedValueOnce(okResult({ total: 45, totalPages: 3 }));
    render(<ConsultaPrediosPage />);

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await screen.findByRole("grid");

    mockSearch.mockResolvedValueOnce(okResult({ page: 2, total: 45, totalPages: 3 }));
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    await waitFor(() =>
      expect(mockSearch).toHaveBeenLastCalledWith(expect.objectContaining({}), 2, 20),
    );
  });

  it("muestra el mensaje del envelope canonico en un alert de error", async () => {
    mockSearch.mockResolvedValueOnce({
      success: false,
      code: "database_unavailable",
      message: "Base de datos no disponible",
    });
    render(<ConsultaPrediosPage />);

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Base de datos no disponible");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("muestra 'No se encontraron predios' cuando la busqueda no devuelve filas", async () => {
    mockSearch.mockResolvedValueOnce(okResult({ data: [], total: 0, totalPages: 0 }));
    render(<ConsultaPrediosPage />);

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    expect(await screen.findByText("No se encontraron predios")).toBeInTheDocument();
  });

  it("mantiene el estado del checkbox Mostrar Pisos en la pagina", () => {
    render(<ConsultaPrediosPage />);
    const checkbox = screen.getByRole("checkbox", { name: /mostrar pisos/i });

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it("habilita Exportar solo despues de una busqueda con filas", async () => {
    render(<ConsultaPrediosPage />);
    const exportButton = screen.getByRole("button", { name: /exportar/i });
    expect(exportButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    expect(await screen.findByText("No se encontraron predios")).toBeInTheDocument();
    expect(exportButton).toBeDisabled();

    mockSearch.mockResolvedValueOnce(okResult());
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await screen.findByRole("grid", { name: /resultados de consulta de predios/i });

    expect(exportButton).toBeEnabled();
  });

  it("envia mostrarPisos desde el estado al exportar y descarga el libro", async () => {
    render(<ConsultaPrediosPage />);
    fireEvent.click(screen.getByRole("checkbox", { name: /mostrar pisos/i }));

    mockSearch.mockResolvedValueOnce(okResult());
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await screen.findByRole("grid", { name: /resultados de consulta de predios/i });

    const exportResult = okExportResult({ mostrarPisos: true });
    mockExport.mockResolvedValueOnce(exportResult);
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }));

    await waitFor(() =>
      expect(mockExport).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: "",
          anno: String(currentYear),
        }),
        true,
      ),
    );
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith(exportResult));
  });

  it("muestra el error de export en un alert separado sin borrar la grilla", async () => {
    mockSearch.mockResolvedValueOnce(okResult());
    render(<ConsultaPrediosPage />);

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await screen.findByRole("grid", { name: /resultados de consulta de predios/i });

    mockExport.mockResolvedValueOnce({
      success: false,
      code: "export_failed",
      message: "No se pudo generar el XLS",
    });
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudo generar el XLS");
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(mockDownload).not.toHaveBeenCalled();
  });
});
