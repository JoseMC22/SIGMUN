import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type {
  CabeceraProyectado,
  CatalogosProyectado,
  DetalleEstadoCuentaFilters,
  DetalleReciboProyectado,
  ReciboEmitidoProyectado,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";
import EstadoCuentaProyectadoDetalleView from "./estado-cuenta-proyectado-detalle-view";

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

const DETALLE_ROWS: DetalleReciboProyectado[] = [
  {
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
  },
  {
    idrecibo: "11",
    codigo: "0000123",
    tipo: "11.00",
    anno: "2023",
    cod_pred: "0000004",
    anexo: "02",
    sub_anexo: "01",
    tipo_rec: "*11.02*",
    periodo: "02",
    imp_insol: "50.00",
    imp_reaj: "0.00",
    mora: "0.00",
    costo_emis: "1.00",
    des_tipo: "BARRIDO VIAS",
    des_cabecera: "ARBITRIO 2023",
    det_anexo: "02-01",
    total: 50,
    benefic: 1,
    tot_pagado: 10,
    ubica: "VT",
  },
];

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
  {
    num_ingr: "101",
    codigo: "0000123",
    caja: "CAJA 1",
    fec_pago: "18/11/2026",
    monto: "50.00",
    estado: "Anulado",
    operador: "OPER2",
  },
];

const PREDIAL_VALUE = "*02.01*,*00.16*,*30.02*,*30.03*,*30.04*,*00.46*";

interface HarnessOverrides {
  detalle?: DetalleReciboProyectado[];
  recibos?: ReciboEmitidoProyectado[];
  error?: string | null;
}

function renderView(overrides: HarnessOverrides = {}) {
  const onMostrar = vi.fn();
  render(
    <EstadoCuentaProyectadoDetalleView
      codigo="0000123"
      cabecera={CABECERA}
      catalogos={CATALOGOS}
      detalle={overrides.detalle ?? DETALLE_ROWS}
      recibos={overrides.recibos ?? RECIBOS}
      error={overrides.error ?? null}
      onMostrar={onMostrar}
    />,
  );
  return { onMostrar };
}

describe("EstadoCuentaProyectadoDetalleView", () => {
  it("renders the taxpayer header with codigo, nombre, direccion and documento", () => {
    renderView();

    const header = screen.getByRole("region", {
      name: /datos del contribuyente/i,
    });
    expect(
      screen.getByRole("heading", { name: /estado de cuenta proyectado/i }),
    ).toBeInTheDocument();
    expect(within(header).getByText("0000123")).toBeInTheDocument();
    expect(within(header).getByText("JUAN PEREZ")).toBeInTheDocument();
    expect(within(header).getByText("AV. CENTRAL 123")).toBeInTheDocument();
    expect(within(header).getByText("12345678")).toBeInTheDocument();
  });

  it("generates year, period and predio checkboxes from the catalog ranges", () => {
    renderView();

    for (const anno of ["2023", "2024"]) {
      expect(
        screen.getByRole("checkbox", { name: `Año ${anno}` }),
      ).toBeInTheDocument();
    }
    for (const periodo of ["01", "02", "03"]) {
      expect(
        screen.getByRole("checkbox", { name: `Período ${periodo}` }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("checkbox", { name: "Predio 0000003" }),
    ).toBeInTheDocument();
  });

  it("renders legacy concept and arbitrio values on accessible checkboxes", () => {
    renderView();

    const predial = screen.getByRole("checkbox", { name: "Predial" });
    expect(predial).toHaveAttribute("value", PREDIAL_VALUE);
    const barrido = screen.getByRole("checkbox", { name: "Barrido Vías" });
    expect(barrido).toHaveAttribute("value", "*11.02*");
    expect(screen.getByRole("checkbox", { name: "Serenazgo." })).toHaveAttribute(
      "value",
      "*11.04*",
    );
  });

  it("defaults the status to Pendiente and shows the projection date", () => {
    renderView();

    expect(screen.getByRole("radio", { name: "Pendiente" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Cancelado" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Todos" })).not.toBeChecked();
    expect(screen.getByLabelText("Fecha de proyección")).toHaveValue(
      "17/11/2026",
    );
  });

  it("emits the selected filters when Mostrar is pressed", () => {
    const { onMostrar } = renderView();

    fireEvent.click(screen.getByRole("checkbox", { name: "Año 2024" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Período 02" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Predial" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Barrido Vías" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Predio 0000003" }));
    fireEvent.click(screen.getByRole("radio", { name: "Todos" }));
    fireEvent.change(screen.getByLabelText("Fecha de proyección"), {
      target: { value: "18/11/2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^mostrar$/i }));

    const expected: DetalleEstadoCuentaFilters = {
      annos: ["2024"],
      tipos: [PREDIAL_VALUE],
      tiporec: ["*11.02*"],
      perio: ["02"],
      predio: ["0000003"],
      estado: "%",
      fecha_proyectada: "18/11/2026",
    };
    expect(onMostrar).toHaveBeenCalledWith(expected);
  });

  it("renders the detail grid in legacy order with derived totals", () => {
    renderView();

    const grid = screen.getByRole("table", { name: /detalle de recibos/i });
    const headers = within(grid).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual([
      "Descripción",
      "Tributo",
      "Año",
      "Predio",
      "Anexo",
      "Período",
      "Imp. Insol",
      "Imp. Reaj",
      "Interés",
      "Costo Emis.",
      "Tot. Pago",
      "(Bnf)",
      "Total",
    ]);
    expect(within(grid).getByText("PREDIAL 2024")).toBeInTheDocument();
    expect(within(grid).getByText("ARBITRIO 2023")).toBeInTheDocument();
    expect(within(grid).getByText("01-00")).toBeInTheDocument();

    const totalRow = within(grid)
      .getByRole("rowheader", { name: "TOTAL" })
      .closest("tr");
    expect(totalRow).not.toBeNull();
    for (const value of ["3.00", "10.00", "4.00", "167.00"]) {
      expect(within(totalRow as HTMLElement).getByText(value)).toBeInTheDocument();
    }
  });

  it("renders issued receipts and visually marks Anulado rows", () => {
    renderView();

    const panel = screen.getByRole("table", { name: /recibos emitidos/i });
    expect(within(panel).getAllByText("CAJA 1")).toHaveLength(2);
    expect(within(panel).getByText("OPER1")).toBeInTheDocument();
    const anulado = within(panel).getByText("Anulado").closest("tr");
    expect(anulado).toHaveAttribute("data-anulado", "true");
    expect(anulado).toHaveClass("line-through");
  });

  it("renders readable empty states for detail and receipts", () => {
    renderView({ detalle: [], recibos: [] });

    expect(
      screen.getByText(/no se encontraron registros de detalle/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no hay recibos emitidos/i)).toBeInTheDocument();
  });

  it("uses semantic tables with captions and scoped headers", () => {
    renderView();

    for (const name of [/detalle de recibos/i, /recibos emitidos/i]) {
      const table = screen.getByRole("table", { name });
      expect(table.querySelector("caption")).not.toBeNull();
      const columnHeaders = within(table).getAllByRole("columnheader");
      expect(columnHeaders.length).toBeGreaterThan(0);
      for (const header of columnHeaders) {
        expect(header).toHaveAttribute("scope", "col");
      }
    }
  });

  it("shows the canonical error message in an alert", () => {
    renderView({ error: "Base de datos no disponible" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Base de datos no disponible",
    );
  });
});
