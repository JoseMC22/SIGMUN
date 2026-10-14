import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import OrdenanzasPage from "./page";

// La página es "use client" y consulta el backend con fetch directo al proxy
// (convención de la sección mantenimiento-tablas, sin server action):
// mock global de fetch.
const mockFetch = vi.fn();
global.fetch = mockFetch;

// El modal de alta resuelve `estacion` con checkSessionAction (patrón
// baja-predio-modal); se mockea para no depender de next/headers en jsdom
// y para que el hostname resuelto sea determinístico en el body del POST.
vi.mock("@/actions/auth/auth", () => ({
  checkSessionAction: vi.fn(async () => ({
    authenticated: true,
    user: null,
    hostname: "",
  })),
}));

// `xlsx` se importa dinámico en la página (patrón mantenimiento-ingresos);
// se mockea el módulo con fns hoisted para asertar el contenido exportado
// sin escribir archivos reales.
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

const row1 = {
  idordenanza: 1,
  criterio: "1",
  descripcion: "Pronto Pago",
  fec_desde: "2013-09-01T00:00:00.000Z",
  fec_hasta: "2013-09-30T00:00:00.000Z",
  observacion: "Beneficio por pago oportuno",
  estado: "0",
  operador: "ADMIN",
  estacion: "SERVIDOR1",
  fech_ing: "2013-08-15T10:20:30.000Z",
};

const row2 = {
  ...row1,
  idordenanza: 2,
  criterio: "2",
  descripcion: "Fraccionamiento",
  observacion: "Cuotas trimestrales",
};

// 25 filas para el paginador en memoria (L5: 15 por página → 2 páginas).
const rows25 = Array.from({ length: 25 }, (_, i) => ({
  ...row1,
  idordenanza: i + 1,
  criterio: String(i + 1),
  descripcion: `Ordenanza ${i + 1}`,
}));

// Misma expresión de fecha que la página: primeros 10 chars del ISO
// ("YYYY-MM-DD") anclados al mediodía local → DD/MM/YYYY es-PE determinístico.
const fmtFecha = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// Misma expresión de montos del modal de detalle: es-PE con 2 decimales.
const fmtMonto = (n: number) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Fixtures: detalle (iteración 4: SP @msquery=4 re-modelado — el SP ya
// filtra server-side por idordenanza y el JOIN trae CONCEPTO; sin ID /
// Estado / Fec. venc.) ────────────────────────────────────────────────────

const detalleRow = {
  anno: "2013",
  tipoRec: "02.01",
  concepto: "IMPUESTO AL PATRIMONIO PREDIAL",
  impInsol: 46.2,
  impReaj: 0,
  mora: 10.5,
  costoEmis: 2.5,
};

const detalleRow2 = {
  ...detalleRow,
  anno: "2014",
  tipoRec: "02.02",
  concepto: "SERVICIO DE LIMPIEZA PUBLICA",
  impInsol: 58.36,
  mora: 0,
};

// 23 filas (volumen real del SP: idordenanza=1 → 115) para el paginador
// en memoria de 10 DENTRO del modal → 3 páginas (10/10/3).
const detalleRows23 = Array.from({ length: 23 }, (_, i) => ({
  ...detalleRow,
  anno: String(2012 + (i % 4)),
  tipoRec: `0${(i % 9) + 1}.01`,
  concepto: i % 2 === 0 ? "IMPUESTO AL PATRIMONIO PREDIAL" : "SERVICIO DE LIMPIEZA PUBLICA",
  impInsol: 40 + i,
  impReaj: i,
  mora: i % 3,
  costoEmis: 2.5,
}));

describe("OrdenanzasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auto-consulta al montar y mapeo de filas (S1/S3) ────

  it("consulta al montar el endpoint S3 y renderiza las filas mapeadas", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [row1, row2] }),
    });

    render(<OrdenanzasPage />);

    // Auto-consulta al montar con la URL del contrato
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/mantenimiento-tablas/ordenanzas",
    );

    // Filas mapeadas en la tabla
    const grid = await screen.findByTestId("ordenanzas-grid");
    const filas = grid.querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(filas).toHaveLength(2);

    const [f1, f2] = filas;
    // Columnas: ID, Criterio, Descripción, Vigencia, Observación, Estado
    expect(f1.cells[0]).toHaveTextContent("1");
    expect(f1.cells[1]).toHaveTextContent("1");
    expect(f1.cells[2]).toHaveTextContent("Pronto Pago");
    expect(f1.cells[3]).toHaveTextContent(
      `${fmtFecha(row1.fec_desde)} – ${fmtFecha(row1.fec_hasta)}`,
    );
    expect(f1.cells[4]).toHaveTextContent(row1.observacion);
    // T4: dominio de estado confirmado — '0' se muestra como "Activo".
    expect(f1.cells[5]).toHaveTextContent("Activo");

    expect(f2.cells[0]).toHaveTextContent("2");
    expect(f2.cells[2]).toHaveTextContent("Fraccionamiento");
    expect(f2.cells[3]).toHaveTextContent(
      `${fmtFecha(row2.fec_desde)} – ${fmtFecha(row2.fec_hasta)}`,
    );

    // Contador de registros en el header de la tabla
    expect(screen.getByText("2 registros")).toBeInTheDocument();
  });

  // ── Estado del listado (T4: dominio '0'→Activo, '1'→No activo) ──

  it("mapea el dominio de estado: '0' → Activo (badge verde), '1' → No activo (badge gris), otro valor crudo tal cual", async () => {
    const rowNoActivo = { ...row1, idordenanza: 3, estado: "1" };
    const rowRaro = { ...row1, idordenanza: 4, estado: "9" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [row1, rowNoActivo, rowRaro] }),
    });

    render(<OrdenanzasPage />);

    const grid = await screen.findByTestId("ordenanzas-grid");
    const filas = grid.querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(filas).toHaveLength(3);

    expect(filas[0].cells[5]).toHaveTextContent("Activo");
    expect(
      filas[0].cells[5].querySelector("span")?.className,
    ).toMatch(/emerald/);

    expect(filas[1].cells[5]).toHaveTextContent("No activo");
    expect(filas[1].cells[5].querySelector("span")?.className).toMatch(
      /slate/,
    );
    expect(
      filas[1].cells[5].querySelector("span")?.className,
    ).not.toMatch(/emerald/);

    // Valor fuera del dominio: defensivo, se muestra crudo.
    expect(filas[2].cells[5]).toHaveTextContent("9");
  });

  it("exporta el listado usando la etiqueta de estado (Activo/No activo), no el valor crudo", async () => {
    const listado = [
      row1,
      { ...row1, idordenanza: 2, estado: "1" },
    ];
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: listado }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: listado }),
      });

    render(<OrdenanzasPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /exportar a excel/i }),
    );

    await waitFor(() => {
      expect(xlsxMocks.json_to_sheet).toHaveBeenCalledTimes(1);
    });
    const sheetArg = xlsxMocks.json_to_sheet.mock.calls[0]?.[0] as unknown as Array<
      Record<string, unknown>
    >;
    expect(sheetArg.map((r) => r["Estado"])).toEqual([
      "Activo",
      "No activo",
    ]);
  });

  // ── Estado vacío (S1/S3) ────────────────────────────────

  it("muestra el estado vacío cuando data = []", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<OrdenanzasPage />);

    expect(
      await screen.findByText(/no se encontraron ordenanzas/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("ordenanzas-grid")).not.toBeInTheDocument();
  });

  // ── Estado de error + Reintentar (S1/S3) ────────────────

  it("muestra el error cuando fetch rechaza y Reintentar re-ejecuta la consulta", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [row1] }),
      });

    render(<OrdenanzasPage />);

    expect(await screen.findByText(/error de conexión/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    // Reintentar vuelve a consultar el mismo endpoint
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/mantenimiento-tablas/ordenanzas",
    );
    expect(await screen.findByTestId("ordenanzas-grid")).toBeInTheDocument();
    expect(screen.getByText("1 registro")).toBeInTheDocument();
  });

  // ── Paginador en memoria de 15 (L5/T5) ──────────────────

  it("pagina en memoria de a 15 registros y navega a la página 2 con las filas 16-25", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: rows25 }),
    });

    render(<OrdenanzasPage />);

    // Página 1: primeras 15 filas + footer del patrón mantenimiento-ingresos
    const grid = await screen.findByTestId("ordenanzas-grid");
    expect(grid.querySelectorAll<HTMLTableRowElement>("tbody tr")).toHaveLength(
      15,
    );
    expect(
      grid.querySelector<HTMLTableRowElement>("tbody tr")!.cells[0],
    ).toHaveTextContent("1");

    const footer = screen.getByTestId("ordenanzas-footer");
    expect(footer.textContent).toContain("Mostrando 1 – 15 de 25 resultados");

    // Números de página: la activa (1) con el estilo del patrón
    const page2Btn = screen.getByRole("button", { name: "2" });
    expect(page2Btn).not.toHaveClass("bg-sat-cyan");
    fireEvent.click(page2Btn);

    // Página 2: filas 16-25 (10 filas)
    const filas = screen
      .getByTestId("ordenanzas-grid")
      .querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(filas).toHaveLength(10);
    expect(filas[0].cells[0]).toHaveTextContent("16");
    expect(filas[9].cells[0]).toHaveTextContent("25");
    expect(screen.getByTestId("ordenanzas-footer").textContent).toContain(
      "Mostrando 16 – 25 de 25 resultados",
    );
    expect(screen.getByRole("button", { name: "2" })).toHaveClass(
      "bg-sat-cyan",
    );
  });

  it("oculta los controles de paginación cuando hay una sola página", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [row1, row2] }),
    });

    render(<OrdenanzasPage />);

    // El footer sigue mostrando el rango, pero sin controles de navegación
    expect(
      await screen.findByTestId("ordenanzas-footer"),
    ).toHaveTextContent(/mostrando 1 – 2 de 2 resultados/i);
    expect(
      screen.queryByRole("button", { name: /anterior/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /siguiente/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });

  // ── Exportar a Excel solo con datos (L5/T5) ──────────────

  it("muestra el botón Exportar a Excel solo cuando hay datos", async () => {
    // Sin datos: no hay botón de exportación
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });
    const { unmount } = render(<OrdenanzasPage />);
    await screen.findByText(/no se encontraron ordenanzas/i);
    expect(
      screen.queryByRole("button", { name: /exportar a excel/i }),
    ).not.toBeInTheDocument();
    unmount();

    // Con datos: el botón aparece en el header de resultados
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [row1, row2] }),
    });
    render(<OrdenanzasPage />);
    expect(
      await screen.findByRole("button", { name: /exportar a excel/i }),
    ).toBeInTheDocument();
  });

  // ── Modal de alta: apertura + submit exitoso re-consulta (L5/T5) ──

  it("abre el modal de alta, registra la ordenanza y re-consulta la lista", async () => {
    mockFetch
      // GET al montar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [row1] }),
      })
      // POST del alta
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Ordenanza creada exitosamente" }),
      })
      // GET de re-consulta tras el alta
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [row1, row2] }),
      });

    render(<OrdenanzasPage />);

    // Apertura del modal desde el botón del header de resultados
    fireEvent.click(
      await screen.findByRole("button", { name: /nueva ordenanza/i }),
    );
    expect(
      screen.getByRole("heading", { name: /nueva ordenanza/i }),
    ).toBeInTheDocument();

    // Criterio con default 11; campos requeridos vacíos al abrir
    expect(screen.getByLabelText(/criterio/i)).toHaveValue(11);
    expect(screen.getByLabelText(/descripción/i)).toHaveValue("");

    // Completar el alta
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "Pronto Pago 2024" },
    });
    fireEvent.change(screen.getByLabelText(/vigencia desde/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/vigencia hasta/i), {
      target: { value: "2024-12-31" },
    });

    // Enviar el formulario del modal (patrón editar-valor-modal.test)
    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    // POST al mismo endpoint con el body del alta (estación resuelta de la
    // sesión del cliente, sin hostname en jsdom → "")
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/mantenimiento-tablas/ordenanzas",
      expect.objectContaining({ method: "POST" }),
    );
    const postBody = JSON.parse(mockFetch.mock.calls[1][1]?.body ?? "{}");
    expect(postBody).toEqual({
      criterio: 11,
      descripcion: "Pronto Pago 2024",
      fdesde: "2024-01-01",
      fhasta: "2024-12-31",
      observacion: "",
      estacion: "",
    });

    // Re-consulta GET tras el alta exitosa
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "/api/mantenimiento-tablas/ordenanzas",
    );

    // Modal cerrado + feedback sutil de éxito + lista refrescada
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /nueva ordenanza/i }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/ordenanza creada exitosamente/i),
    ).toBeInTheDocument();
    expect(await screen.findByText("2 registros")).toBeInTheDocument();
  });

  // ── Modal de alta: error 4xx del backend mostrado inline ──

  it("muestra el mensaje de error de la respuesta 4xx del backend inline en el modal", async () => {
    mockFetch
      // GET al montar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [row1, row2] }),
      })
      // POST rechazado por Zod (400 del backend)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: "La vigencia desde debe tener formato YYYY-MM-DD",
          statusCode: 400,
        }),
      });

    render(<OrdenanzasPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /nueva ordenanza/i }),
    );

    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "Pronto Pago 2024" },
    });
    fireEvent.change(screen.getByLabelText(/vigencia desde/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/vigencia hasta/i), {
      target: { value: "2024-12-31" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    // Mensaje del backend inline, modal sigue abierto y NO se re-consulta.
    expect(
      await screen.findByText(
        /la vigencia desde debe tener formato yyyy-mm-dd/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /nueva ordenanza/i }),
    ).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // ── Acciones por fila (T8/iteración 3) ───────────────────

  it("renderiza Ver detalle (habilitado) y Editar (deshabilitado con tooltip del SP sin UPDATE) en cada fila", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [row1, row2] }),
    });

    render(<OrdenanzasPage />);

    const verBtns = await screen.findAllByRole("button", {
      name: "Ver detalle",
    });
    expect(verBtns).toHaveLength(2);

    const editBtns = screen.getAllByRole("button", { name: "Editar" });
    expect(editBtns).toHaveLength(2);
    // Decisión del usuario (T6): sin UPDATE en el SP el botón de editar es
    // SIEMPRE deshabilitado con el tooltip del cambio pendiente — jamás
    // wireado a msquery 1 (alta) o 5 (no-op).
    for (const btn of editBtns) {
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("title", "Pendiente cambio de SP (UPDATE)");
    }
  });

  it("abre el modal de detalle desde el ícono de la fila, consulta el endpoint con el id del master y renderiza las columnas nuevas (sin ID/Estado/Fec. venc.)", async () => {
    mockFetch
      // GET del listado al montar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [row1, row2] }),
      })
      // GET del detalle (msquery=4 re-modelado) para la ordenanza 1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [detalleRow, detalleRow2] }),
      });

    render(<OrdenanzasPage />);

    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Ver detalle" }))[0],
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "/api/mantenimiento-tablas/ordenanzas/detalle?idordenanza=1",
      );
    });

    expect(
      await screen.findByRole("heading", { name: /detalle de la ordenanza/i }),
    ).toBeInTheDocument();

    // Tabla del detalle con las columnas reales del SP re-modelado
    // (iteración 4): N°, Año, Tipo rec., Concepto, Imp. insol., Imp. reaj.,
    // Mora, Costo emis. — SOLO 8 columnheads (ya no existen ID/Estado/
    // Fec. venc., scoped al modal porque la grilla detrás también tiene
    // headers con esos nombres).
    const modal = screen.getByTestId("ordenanza-detalle-modal");
    expect(
      within(modal).queryByRole("columnheader", { name: /estado/i }),
    ).not.toBeInTheDocument();
    expect(
      within(modal).queryByRole("columnheader", { name: /fec\. venc\./i }),
    ).not.toBeInTheDocument();

    const tabla = screen.getByTestId("detalle-table");
    const filas = tabla.querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(filas).toHaveLength(2);

    // Fila 1: N°, año, tipo rec., concepto y montos es-PE con 2 decimales
    const c1 = filas[0].cells;
    expect(c1[0]).toHaveTextContent("1");
    expect(c1[1]).toHaveTextContent("2013");
    expect(c1[2]).toHaveTextContent("02.01");
    expect(c1[3]).toHaveTextContent("IMPUESTO AL PATRIMONIO PREDIAL");
    expect(c1[4]).toHaveTextContent(fmtMonto(detalleRow.impInsol));
    expect(c1[5]).toHaveTextContent(fmtMonto(detalleRow.impReaj));
    expect(c1[6]).toHaveTextContent(fmtMonto(detalleRow.mora));
    expect(c1[7]).toHaveTextContent(fmtMonto(detalleRow.costoEmis));

    // Fila 2 (el SP ya filtró por idordenanza: todas las filas son del master)
    expect(filas[1].cells[1]).toHaveTextContent("2014");
    expect(filas[1].cells[3]).toHaveTextContent(
      "SERVICIO DE LIMPIEZA PUBLICA",
    );
    expect(filas[1].cells[4]).toHaveTextContent(
      fmtMonto(detalleRow2.impInsol),
    );
  });

  it("muestra 'Sin detalle' cuando el master no tiene filas en DOrdenanzas", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [row1] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

    render(<OrdenanzasPage />);

    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Ver detalle" }))[0],
    );

    expect(await screen.findByText("Sin detalle")).toBeInTheDocument();
  });

  it("pagina el detalle de a 10 DENTRO del modal: 23 filas → página 1 con 10 + footer, página 2 con las filas 11-20 y página 3 con el resto", async () => {
    mockFetch
      // GET del listado al montar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [row1, row2] }),
      })
      // GET del detalle con volumen de 23 filas (el SP real da 115 para el
      // master 1; ≥12 filas es lo que exige el paginador de esta prueba)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: detalleRows23 }),
      });

    render(<OrdenanzasPage />);

    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Ver detalle" }))[0],
    );

    // Página 1: primeras 10 filas + footer del patrón page.tsx
    const tabla = await screen.findByTestId("detalle-table");
    expect(tabla.querySelectorAll<HTMLTableRowElement>("tbody tr")).toHaveLength(
      10,
    );
    expect(
      tabla.querySelector<HTMLTableRowElement>("tbody tr")!.cells[0],
    ).toHaveTextContent("1");
    expect(screen.getByTestId("detalle-footer").textContent).toContain(
      "Mostrando 1 – 10 de 23",
    );

    // Página 2: filas 11-20 (el N° continúa entre páginas)
    fireEvent.click(screen.getByRole("button", { name: "2" }));

    const filas2 = screen
      .getByTestId("detalle-table")
      .querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(filas2).toHaveLength(10);
    expect(filas2[0].cells[0]).toHaveTextContent("11");
    expect(filas2[9].cells[0]).toHaveTextContent("20");
    expect(screen.getByTestId("detalle-footer").textContent).toContain(
      "Mostrando 11 – 20 de 23",
    );
    expect(screen.getByRole("button", { name: "2" })).toHaveClass(
      "bg-sat-cyan",
    );

    // Página 3 (última): las 3 filas restantes
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    const filas3 = screen
      .getByTestId("detalle-table")
      .querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(filas3).toHaveLength(3);
    expect(filas3[2].cells[0]).toHaveTextContent("23");
    expect(screen.getByTestId("detalle-footer").textContent).toContain(
      "Mostrando 21 – 23 de 23",
    );
  });

  it("resetea el paginador del detalle a la página 1 cuando Reintentar vuelve a consultar", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [row1] }),
      })
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: detalleRows23 }),
      });

    render(<OrdenanzasPage />);

    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Ver detalle" }))[0],
    );

    // Error con Reintentar (la primera consulta falla)
    expect(
      await screen.findByText(/error al consultar el detalle/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    // Tras el retry el modal vuelve a página 1: footer "Mostrando 1 – 10 de 23"
    expect(await screen.findByTestId("detalle-table")).toBeInTheDocument();
    expect(screen.getByTestId("detalle-footer").textContent).toContain(
      "Mostrando 1 – 10 de 23",
    );
    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/mantenimiento-tablas/ordenanzas/detalle?idordenanza=1",
    );
  });
});
