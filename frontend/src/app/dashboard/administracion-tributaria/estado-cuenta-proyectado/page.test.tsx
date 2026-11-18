import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => nav.searchParams,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock("@/actions/administracion-tributaria/estado-cuenta-proyectado", async (importActual) => {
  const actual = await importActual<
    typeof import("@/actions/administracion-tributaria/estado-cuenta-proyectado")
  >();
  return {
    ...actual,
    searchContribuyentesProyectadosAction: vi.fn(),
    getCabeceraProyectadaAction: vi.fn(),
    getCatalogosProyectadoAction: vi.fn(),
    getRecibosProyectadoAction: vi.fn(),
  };
});

import EstadoCuentaProyectadoPage from "./page";
import {
  getCabeceraProyectadaAction,
  getCatalogosProyectadoAction,
  getRecibosProyectadoAction,
  searchContribuyentesProyectadosAction,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";
import type {
  CabeceraProyectado,
  CatalogosProyectado,
  ContribuyenteProyectadoRow,
  DetalleReciboProyectado,
  ReciboEmitidoProyectado,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";

const mockSearch = vi.mocked(searchContribuyentesProyectadosAction);
const mockCabecera = vi.mocked(getCabeceraProyectadaAction);
const mockCatalogos = vi.mocked(getCatalogosProyectadoAction);
const mockRecibos = vi.mocked(getRecibosProyectadoAction);
const fetchMock = vi.fn();

const ROW: ContribuyenteProyectadoRow = {
  codigo: "0000123",
  nombres: "JUAN PEREZ",
  documento: "12345678",
  direccion: "AV. CENTRAL 123",
};

const CABECERA: CabeceraProyectado = {
  codigo: "0000123",
  nombre: "JUAN PEREZ",
  dirfiscal: "AV. CENTRAL 123",
  num_doc: "12345678",
  flag_fraccionamiento: "0",
};

const CATALOGOS: CatalogosProyectado = {
  periodos: { minimo: "01", maximo: "03" },
  annos: { minimo: "2023", maximo: "2024" },
  predios: [
    {
      cod_pred: "0000003",
      anexo1: "01",
      direccion: "AV. NORTE 45",
      anno: "2024",
    },
  ],
  fechaProyectada: "17/11/2026",
};

const RECIBOS: ReciboEmitidoProyectado[] = [
  {
    num_ingr: "100",
    codigo: "0000123",
    caja: "CAJA 1",
    fec_pago: "17/11/2026",
    monto: "117.00",
    estado: "Cancelado",
    operador: "OPER1",
  },
];

const DETALLE_ROW: DetalleReciboProyectado = {
  idrecibo: "10",
  codigo: "0000123",
  tipo: "02.01",
  anno: "2024",
  cod_pred: "0000003",
  anexo: "01",
  sub_anexo: "00",
  tipo_rec: "",
  periodo: "01",
  imp_insol: "100.00",
  imp_reaj: "10.00",
  mora: "5.00",
  costo_emis: "2.00",
  des_tipo: "PREDIAL",
  des_cabecera: "PREDIAL 2024",
  det_anexo: "01-00",
  total: 117,
  benefic: 3,
  tot_pagado: 0,
  ubica: "EM-*",
};

const PREDIAL_VALUE = "*02.01*,*00.16*,*30.02*,*30.03*,*30.04*,*00.46*";

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

function okDetail<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

function renderSearchPage(): void {
  render(<EstadoCuentaProyectadoPage />);
}

function renderDetailPage(codigo = "0000123"): void {
  nav.searchParams = new URLSearchParams(`codigo=${codigo}`);
  render(<EstadoCuentaProyectadoPage />);
}

function consultaBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls.find((args) =>
    String(args[0]).endsWith("/consulta"),
  );
  expect(call).toBeDefined();
  return JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;
}

// Scope label queries to the text inputs so the criterion select and other
// labeled controls cannot produce ambiguous matches.
function getTextInput(label: string): HTMLElement {
  return screen.getByLabelText(label, { selector: 'input[type="text"]' });
}

const getCriterio = () => screen.getByRole("combobox", { name: "Tipo Búsqueda" });

describe("EstadoCuentaProyectadoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.searchParams = new URLSearchParams();
    mockSearch.mockResolvedValue(okResult({ data: [], total: 0, totalPages: 0 }));
    mockCabecera.mockResolvedValue(okDetail(CABECERA));
    mockCatalogos.mockResolvedValue(okDetail(CATALOGOS));
    mockRecibos.mockResolvedValue(okDetail(RECIBOS));
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the criterion select, all six inputs and the Buscar button", () => {
    renderSearchPage();

    expect(getCriterio()).toHaveValue("C");
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

    fireEvent.change(getCriterio(), { target: { value: "N" } });
    expect(codigo).not.toBeVisible();
    expect(getTextInput("Nombres")).toBeVisible();
    expect(getTextInput("Apellido Paterno")).toBeVisible();
    expect(getTextInput("Apellido Materno")).toBeVisible();

    fireEvent.change(getCriterio(), { target: { value: "R" } });
    expect(getTextInput("Razón Social")).toBeVisible();
    expect(getTextInput("Nombres")).not.toBeVisible();

    fireEvent.change(getCriterio(), { target: { value: "D" } });
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

    fireEvent.change(getCriterio(), { target: { value: "N" } });
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

  it("loads the header, catalog filters and receipts for the query codigo", async () => {
    renderDetailPage();

    expect(await screen.findByText("JUAN PEREZ")).toBeInTheDocument();
    expect(mockCabecera).toHaveBeenCalledWith("0000123");
    expect(mockCatalogos).toHaveBeenCalledWith("0000123");
    expect(mockRecibos).toHaveBeenCalledWith("0000123");
    expect(screen.getByRole("checkbox", { name: "Año 2023" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Año 2024" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Período 03" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Predio 0000003" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: /recibos emitidos/i }),
    ).not.toBeInTheDocument();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("posts the default consultation body with estado 0 and the projected date", async () => {
    renderDetailPage();
    await screen.findByText("JUAN PEREZ");

    fireEvent.click(screen.getByRole("button", { name: /^mostrar$/i }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(consultaBody()).toEqual({
      codigo: "0000123",
      annos: [],
      tipos: [],
      tiporec: "",
      perio: "",
      predio: "",
      estado: "0",
      fecha_proyectada: "17/11/2026",
    });
  });

  it("comma-joins the selected recibo, periodo and predio filters in the body", async () => {
    renderDetailPage();
    await screen.findByText("JUAN PEREZ");

    fireEvent.click(screen.getByRole("checkbox", { name: "Año 2024" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Año 2023" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Predial" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Arbitrio" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Barrido Vías" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Período 01" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Período 02" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Predio 0000003" }));
    fireEvent.click(screen.getByRole("radio", { name: "Cancelado" }));
    fireEvent.click(screen.getByRole("button", { name: /^mostrar$/i }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(consultaBody()).toEqual({
      codigo: "0000123",
      annos: ["2024", "2023"],
      tipos: [PREDIAL_VALUE, "*11.00*,*00.47*"],
      tiporec: "*11.02*",
      perio: "01,02",
      predio: "0000003",
      estado: "1",
      fecha_proyectada: "17/11/2026",
    });
  });

  it("renders detail rows and derived totals after the consultation", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [DETALLE_ROW] });
    renderDetailPage();
    await screen.findByText("JUAN PEREZ");

    fireEvent.click(screen.getByRole("button", { name: /^mostrar$/i }));

    const grid = await screen.findByRole("table", { name: /detalle de recibos/i });
    await vi.waitFor(() =>
      expect(within(grid).getByText("PREDIAL 2024")).toBeInTheDocument(),
    );
    const totalRow = within(grid)
      .getByRole("rowheader", { name: "TOTAL" })
      .closest("tr");
    expect(within(totalRow as HTMLElement).getByText("117.00")).toBeInTheDocument();
  });

  it("shows empty states when the consultation returns no rows", async () => {
    mockRecibos.mockResolvedValueOnce(okDetail([]));
    renderDetailPage();
    await screen.findByText("JUAN PEREZ");

    expect(
      screen.getByText(/no se encontraron registros de detalle/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no hay recibos emitidos/i)).not.toBeInTheDocument();
  });

  it("shows an alert when the header cannot be loaded", async () => {
    mockCabecera.mockResolvedValueOnce({
      success: false,
      code: "database_unavailable",
      message: "Base de datos no disponible",
    });

    renderDetailPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Base de datos no disponible",
    );
  });

  it("shows an alert when the consultation fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        code: "database_unavailable",
        message: "Base de datos no disponible",
      }),
    });
    renderDetailPage();
    await screen.findByText("JUAN PEREZ");

    fireEvent.click(screen.getByRole("button", { name: /^mostrar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Base de datos no disponible",
    );
  });
});
