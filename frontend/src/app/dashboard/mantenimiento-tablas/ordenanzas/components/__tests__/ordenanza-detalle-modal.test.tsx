import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import OrdenanzaDetalleModal from "../ordenanza-detalle-modal";

// El modal hijo de edición resuelve `estacion` con checkSessionAction
// (patrón editar-ordenanza-modal); se mockea para no depender de
// next/headers en jsdom cuando el padre lo renderiza.
vi.mock("@/actions/auth/auth", () => ({
  checkSessionAction: vi.fn(async () => ({
    authenticated: true,
    user: null,
    hostname: "",
  })),
}));

// `xlsx` se importa dinámico en el modal (patrón page.tsx); se mockea el
// módulo con fns hoisted para asertar sobre las mismas instancias sin
// depender de la identidad del `import()` en el test.
const xlsxMocks = vi.hoisted(() => ({
  json_to_sheet: vi.fn((_rows: unknown) => ({ mockedSheet: true })),
  book_new: vi.fn(() => ({ mockedWb: true })),
  book_append_sheet: vi.fn((_wb: unknown, _ws: unknown, _name: string) => {}),
  writeFile: vi.fn((_wb: unknown, _file: string) => {}),
}));
vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: xlsxMocks.json_to_sheet,
    book_new: xlsxMocks.book_new,
    book_append_sheet: xlsxMocks.book_append_sheet,
  },
  writeFile: xlsxMocks.writeFile,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const ordenanza = {
  idordenanza: 7,
  criterio: "1",
  descripcion: "Pronto Pago",
};

const rows = [
  {
    anno: "2013",
    tipoRec: "02.01",
    concepto: "IMPUESTO AL PATRIMONIO PREDIAL",
    impInsol: 100,
    impReaj: 10,
    mora: 5,
    costoEmis: 2.5,
  },
  {
    anno: "2014",
    tipoRec: "02.02",
    concepto: "SERVICIO DE LIMPIEZA PUBLICA",
    impInsol: 50,
    impReaj: 20,
    mora: 1.5,
    costoEmis: 7.25,
  },
];

const fmtMonto = (n: number) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function openModal() {
  render(
    <OrdenanzaDetalleModal
      isOpen
      onClose={() => {}}
      ordenanza={ordenanza}
    />,
  );
}

describe("OrdenanzaDetalleModal T1 — totales, sticky y orden", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: rows }),
    });
  });

  it("muestra el footer de totales con la suma de los 4 montos en es-PE", async () => {
    openModal();
    const totales = await screen.findByTestId("detalle-totales");
    expect(totales).toHaveTextContent(fmtMonto(150));
    expect(totales).toHaveTextContent(fmtMonto(30));
    expect(totales).toHaveTextContent(fmtMonto(6.5));
    expect(totales).toHaveTextContent(fmtMonto(9.75));
  });

  it("usa thead sticky", async () => {
    openModal();
    await screen.findByTestId("detalle-table");
    const thead = document.querySelector("thead");
    expect(thead?.className).toMatch(/sticky/);
  });

  it("ordena asc/desc al hacer click en el encabezado de monto y respeta la paginación", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...rows[0],
      concepto: `CONCEPTO ${i}`,
      impInsol: 120 - i * 10,
    }));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: many }),
    });
    openModal();
    const tabla = await screen.findByTestId("detalle-table");
    const firstCell = () =>
      tabla.querySelector<HTMLTableRowElement>("tbody tr")!.cells[4]
        .textContent;

    // Orden original: primer valor 120
    expect(firstCell()).toBe(fmtMonto(120));

    // Click asc: menor primero (10)
    fireEvent.click(
      screen.getByRole("button", { name: /imp\. insol\./i }),
    );
    await waitFor(() => expect(firstCell()).toBe(fmtMonto(10)));
    expect(
      screen.getByRole("button", { name: /imp\. insol\./i }),
    ).toHaveTextContent(/▲/);

    // Click desc: mayor primero (120)
    fireEvent.click(
      screen.getByRole("button", { name: /imp\. insol\./i }),
    );
    await waitFor(() => expect(firstCell()).toBe(fmtMonto(120)));

    // Respeta paginación: sigue en página 1 de 2
    expect(screen.getByTestId("detalle-footer").textContent).toContain(
      "Mostrando 1 – 10 de 12",
    );
  });
});

describe("OrdenanzaDetalleModal T2 — filtros", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: rows }),
    });
  });

  it("deriva los selects de año y tipoRec de los datos", async () => {
    openModal();
    await screen.findByTestId("detalle-table");
    const annoOpts = within(
      screen.getByLabelText(/filtrar por año/i),
    ).getAllByRole("option");
    const tipoOpts = within(
      screen.getByLabelText(/filtrar por tipo/i),
    ).getAllByRole("option");
    expect(annoOpts.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(["2013", "2014"]),
    );
    expect(tipoOpts.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(["02.01", "02.02"]),
    );
  });

  it("filtra por año, refleja el conteo y resetea a página 1", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...rows[0],
      anno: i === 11 ? "2020" : "2013",
      concepto: `CONCEPTO ${i}`,
    }));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: many }),
    });
    openModal();
    await screen.findByTestId("detalle-table");

    // Ir a página 2 antes de filtrar
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByTestId("detalle-footer").textContent).toContain(
      "Mostrando 11 – 12 de 12",
    );

    // Filtrar por 2020 → 1 fila, vuelve a página 1
    fireEvent.change(screen.getByLabelText(/filtrar por año/i), {
      target: { value: "2020" },
    });
    expect(screen.getByTestId("detalle-footer").textContent).toContain(
      "Mostrando 1 – 1 de 1",
    );
    expect(
      screen
        .getByTestId("detalle-table")
        .querySelector<HTMLTableRowElement>("tbody tr")!.cells[3],
    ).toHaveTextContent("CONCEPTO 11");
  });

  it("busca concepto case-insensitive e ignora espacios (trim)", async () => {
    openModal();
    await screen.findByTestId("detalle-table");
    fireEvent.change(screen.getByLabelText(/buscar concepto/i), {
      target: { value: "  predial " },
    });
    const filas = screen
      .getByTestId("detalle-table")
      .querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(filas).toHaveLength(1);
    expect(filas[0].cells[3]).toHaveTextContent(
      "IMPUESTO AL PATRIMONIO PREDIAL",
    );
  });

  it("muestra vacío filtrado con botón para limpiar filtros", async () => {
    openModal();
    await screen.findByTestId("detalle-table");
    fireEvent.change(screen.getByLabelText(/buscar concepto/i), {
      target: { value: "zzz-sin-coincidencia" },
    });
    expect(
      await screen.findByText(/sin resultados para los filtros/i),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /limpiar filtros/i }),
    );
    expect(await screen.findByTestId("detalle-table")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("detalle-table")
        .querySelectorAll<HTMLTableRowElement>("tbody tr"),
    ).toHaveLength(2);
  });
});

describe("OrdenanzaDetalleModal T5 — orden por defecto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Datos desordenados a propósito: el SP no garantiza orden.
  const desordenadas = [
    {
      anno: "2014",
      tipoRec: "02.02",
      concepto: "SERVICIO DE LIMPIEZA PUBLICA",
      impInsol: 50,
      impReaj: 20,
      mora: 1.5,
      costoEmis: 7.25,
    },
    {
      anno: "2013",
      tipoRec: "02.02",
      concepto: "TASA DE SEGUNDA",
      impInsol: 70,
      impReaj: 5,
      mora: 2,
      costoEmis: 1,
    },
    {
      anno: "2013",
      tipoRec: "02.01",
      concepto: "IMPUESTO AL PATRIMONIO PREDIAL",
      impInsol: 100,
      impReaj: 10,
      mora: 5,
      costoEmis: 2.5,
    },
  ];

  const annoTipoDe = (tabla: HTMLElement) =>
    Array.from(
      tabla.querySelectorAll<HTMLTableRowElement>("tbody tr"),
      (f) => `${f.cells[1].textContent}/${f.cells[2].textContent}`,
    );

  it("ordena por defecto por año asc y luego tipoRec asc sin orden por montos activo", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: desordenadas }),
    });
    openModal();
    const tabla = await screen.findByTestId("detalle-table");
    expect(annoTipoDe(tabla)).toEqual([
      "2013/02.01",
      "2013/02.02",
      "2014/02.02",
    ]);
  });

  it("el export respeta el orden por defecto (filtros, paginación, totales y export heredan `sorted`)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: desordenadas }),
    });
    openModal();
    await screen.findByTestId("detalle-table");

    fireEvent.click(screen.getByRole("button", { name: /^exportar$/i }));

    await waitFor(() => {
      expect(xlsxMocks.json_to_sheet).toHaveBeenCalledTimes(1);
    });
    const sheetArg = xlsxMocks.json_to_sheet.mock.calls[0]?.[0] as unknown as Array<
      Record<string, unknown>
    >;
    expect(sheetArg.map((r) => `${r["Año"]}/${r["Tipo rec."]}`)).toEqual([
      "2013/02.01",
      "2013/02.02",
      "2014/02.02",
    ]);
  });

  it("el click en un monto sigue funcionando como override del orden por defecto", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: desordenadas }),
    });
    openModal();
    const tabla = await screen.findByTestId("detalle-table");
    const firstImpInsol = () =>
      tabla.querySelector<HTMLTableRowElement>("tbody tr")!.cells[4]
        .textContent;

    // Orden por defecto: 2013/02.01 primero (impInsol 100)
    expect(firstImpInsol()).toBe(fmtMonto(100));

    // Click asc en Imp. insol.: override por montos (50 primero)
    fireEvent.click(
      screen.getByRole("button", { name: /imp\. insol\./i }),
    );
    await waitFor(() => expect(firstImpInsol()).toBe(fmtMonto(50)));
  });
});

describe("OrdenanzaDetalleModal T3 — exportar y fetch robusto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: rows }),
    });
  });

  it("exporta el detalle FILTRADO a xlsx con las 7 columnas y nombre ordenanza-<id>-detalle-<fecha>.xlsx", async () => {
    openModal();
    await screen.findByTestId("detalle-table");

    // Filtrar a 1 fila antes de exportar
    fireEvent.change(screen.getByLabelText(/buscar concepto/i), {
      target: { value: "predial" },
    });
    expect(
      screen
        .getByTestId("detalle-table")
        .querySelectorAll<HTMLTableRowElement>("tbody tr"),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /^exportar$/i }));

    await waitFor(() => {
      expect(xlsxMocks.json_to_sheet).toHaveBeenCalledTimes(1);
    });
    const sheetArg = xlsxMocks.json_to_sheet.mock.calls[0]?.[0] as unknown as Array<
      Record<string, unknown>
    >;
    expect(sheetArg).toHaveLength(1);
    expect(Object.keys(sheetArg[0]).sort()).toEqual(
      [
        "Año",
        "Concepto",
        "Costo emis.",
        "Imp. insol.",
        "Imp. reaj.",
        "Mora",
        "Tipo rec.",
      ].sort(),
    );
    expect(xlsxMocks.book_append_sheet).toHaveBeenCalledTimes(1);
    expect(xlsxMocks.writeFile).toHaveBeenCalledTimes(1);
    const fileName = xlsxMocks.writeFile.mock.calls[0]?.[1] as unknown as string;
    expect(fileName).toMatch(/^ordenanza-7-detalle-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("deshabilita Exportar sin datos", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });
    openModal();
    expect(await screen.findByText("Sin detalle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^exportar$/i })).toBeDisabled();
  });

  it("cachea por idordenanza en memoria y Reintentar invalida la caché", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: rows }),
      });
    const { rerender } = render(
      <OrdenanzaDetalleModal
        isOpen
        onClose={() => {}}
        ordenanza={ordenanza}
      />,
    );

    // Primer intento falla → Reintentar re-consulta (invalida caché)
    expect(
      await screen.findByText(/error al consultar el detalle/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByTestId("detalle-table")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Cerrar y reabrir el mismo master → sirve de caché, sin fetch nuevo
    rerender(
      <OrdenanzaDetalleModal
        isOpen={false}
        onClose={() => {}}
        ordenanza={ordenanza}
      />,
    );
    rerender(
      <OrdenanzaDetalleModal
        isOpen
        onClose={() => {}}
        ordenanza={ordenanza}
      />,
    );
    expect(await screen.findByTestId("detalle-table")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("ignora la respuesta tardía de un master anterior al cambiar de master (race)", async () => {
    let resolveFirst!: (value: unknown) => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const ordenanzaA = { ...ordenanza, idordenanza: 7 };
    const ordenanzaB = {
      ...ordenanza,
      idordenanza: 8,
      descripcion: "Otra ordenanza",
    };
    const { rerender } = render(
      <OrdenanzaDetalleModal
        isOpen
        onClose={() => {}}
        ordenanza={ordenanzaA}
      />,
    );

    // Cambiar de master antes de que responda el primero
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [rows[1]] }),
    });
    rerender(
      <OrdenanzaDetalleModal
        isOpen
        onClose={() => {}}
        ordenanza={ordenanzaB}
      />,
    );
    await screen.findByText("SERVICIO DE LIMPIEZA PUBLICA");

    // Llega tarde la respuesta del master A → se ignora
    resolveFirst({
      ok: true,
      json: async () => ({ data: rows }),
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    // Dar un tick para que una actualización indebida se manifieste
    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen
        .getByTestId("detalle-table")
        .querySelectorAll<HTMLTableRowElement>("tbody tr"),
    ).toHaveLength(1);
    expect(screen.getByTestId("detalle-footer").textContent).toContain("de 1");
  });
});

describe("OrdenanzaDetalleModal T4 — editar detalle por fila", () => {
  // Filas con las llaves T3 del GET (idDetalle = PK del detalle para el
  // WHERE del modo 8, cidordenanza = master) + las 3 preservadas T7.
  const keyedRows = [
    { idDetalle: 9, cidordenanza: 7, ...rows[0], tipo: "02.01", observacion: "", estado: "1" },
    { idDetalle: 10, cidordenanza: 7, ...rows[1], tipo: "02.02", observacion: "", estado: "1" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: unknown, init?: RequestInit) => {
      if (
        typeof url === "string" &&
        /\/detalle\/\d+$/.test(url) &&
        init?.method === "PATCH"
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: "Detalle de ordenanza actualizado exitosamente",
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: keyedRows }),
      });
    });
  });

  it("muestra un botón Editar por fila que abre el modal de edición con la fila (idDetalle+cidordenanza)", async () => {
    openModal();
    const tabla = await screen.findByTestId("detalle-table");
    const editButtons = within(tabla).getAllByRole("button", {
      name: /editar/i,
    });
    expect(editButtons).toHaveLength(2);

    fireEvent.click(editButtons[0]);

    // Modal de edición pre-cargado con la fila (año/tipo_rec/montos).
    expect(
      await screen.findByRole("heading", { name: /editar detalle/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("2013")).toHaveAttribute("id", "editar-detalle-anno");
    expect(screen.getByDisplayValue("02.01")).toHaveAttribute("id", "editar-detalle-tiporec");
    expect(screen.getByDisplayValue("100")).toHaveAttribute("id", "editar-detalle-impinsol");
  });

  it("al guardar invalida la caché T3 del master, re-consulta y muestra feedback", async () => {
    openModal();
    const tabla = await screen.findByTestId("detalle-table");
    fireEvent.click(
      within(tabla).getAllByRole("button", { name: /editar/i })[0],
    );
    await screen.findByRole("heading", { name: /editar detalle/i });

    // GET inicial = 1 llamada.
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Guardar sin cambios → PATCH a la PK + re-consulta del detalle.
    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patchCalls).toHaveLength(1);
    });
    const [patchUrl, patchInit] = mockFetch.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    ) as [string, RequestInit];
    expect(patchUrl).toBe(
      "/api/mantenimiento-tablas/ordenanzas/detalle/9",
    );
    expect(JSON.parse((patchInit.body as string) ?? "{}")).toMatchObject({
      cidordenanza: 7,
      anno: "2013",
      // Preservados T7: viajan tal cual desde la fila, sin inputs visibles.
      tipo: "02.01",
      observacion: "",
      estado: "1",
    });

    // Re-consulta: el GET se repite (caché invalidada) + feedback visible +
    // modal de edición cerrado.
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(
      await screen.findByTestId("detalle-saved-feedback"),
    ).toHaveTextContent(/actualizado exitosamente/i);
    expect(
      screen.queryByRole("heading", { name: /editar detalle/i }),
    ).not.toBeInTheDocument();
  });
});
