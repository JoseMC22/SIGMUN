import { describe, it, expect, vi } from "vitest";

import {
  buildConstanciaExigibilidadPrintData,
  imprimirConstanciaExigibilidad,
  type ConstanciaExigibilidadImpresion,
} from "./export-utils";
import { descargarPdfDesdeHtml } from "@/lib/reportes/reporte-service";

// Se mantiene `llenarPlantilla` real (escape incluido) y solo se intercepta la
// impresión, para verificar el HTML relleno y el nombre de archivo (S8).
vi.mock("@/lib/reportes/reporte-service", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/reportes/reporte-service")>();
  return { ...original, descargarPdfDesdeHtml: vi.fn(async () => {}) };
});

const mockDescargar = vi.mocked(descargarPdfDesdeHtml);

const base: ConstanciaExigibilidadImpresion = {
  nombre: "PEREZ JUAN",
  numexig: "45",
  anoexig: "2026",
  valorCompleto: "IMPUESTO PREDIAL 2026 N° 0001234",
  fnotifica: "15/10/2026",
  nrocargo: "000777",
  fechaEmision: new Date(2026, 10, 9), // 9 de noviembre de 2026
};

describe("buildConstanciaExigibilidadPrintData", () => {
  it("deriva el contrato S8: nroconstancia, dia DD, mes MMMM es-ES y anio", () => {
    expect(buildConstanciaExigibilidadPrintData(base)).toEqual({
      nombre: "PEREZ JUAN",
      nroconstancia: "45-2026",
      valor_completo: "IMPUESTO PREDIAL 2026 N° 0001234",
      fnotifica: "15/10/2026",
      nrocargo: "000777",
      dia: "09",
      mes: "noviembre",
      anio: "2026",
    });
  });

  it("rellena el dia con cero a la izquierda y mapea diciembre", () => {
    const data = buildConstanciaExigibilidadPrintData({
      ...base,
      fechaEmision: new Date(2026, 11, 5),
    });
    expect(data.dia).toBe("05");
    expect(data.mes).toBe("diciembre");
  });

  it("usa la fecha actual cuando no se indica fechaEmision", () => {
    const hoy = new Date();
    const data = buildConstanciaExigibilidadPrintData({
      nombre: base.nombre,
      numexig: base.numexig,
      anoexig: base.anoexig,
      valorCompleto: base.valorCompleto,
      fnotifica: base.fnotifica,
      nrocargo: base.nrocargo,
    });
    expect(data.anio).toBe(String(hoy.getFullYear()));
    expect(data.mes).toHaveLength(data.mes.length);
  });
});

describe("imprimirConstanciaExigibilidad", () => {
  it("rellena la plantilla sin placeholders pendientes y la imprime con el nombre S8", async () => {
    const template =
      "<html><body><h1>Constancia N° {{nroconstancia}}</h1>" +
      "<p>{{nombre}} — {{valor_completo}} — {{fnotifica}} — {{nrocargo}}</p>" +
      "<p>Ica, a los {{dia}} días del mes de {{mes}} de {{anio}}.</p></body></html>";

    const html = await imprimirConstanciaExigibilidad(template, base);

    expect(html).not.toContain("{{");
    expect(html).toContain("Constancia N° 45-2026");
    expect(html).toContain("PEREZ JUAN — IMPUESTO PREDIAL 2026 N° 0001234");
    expect(html).toContain("15/10/2026");
    expect(html).toContain("Ica, a los 09 días del mes de noviembre de 2026.");
    expect(mockDescargar).toHaveBeenCalledWith(
      html,
      "Constancia_45_2026.pdf",
    );
  });

  it("escapa HTML en los datos (convención llenarPlantilla)", async () => {
    const html = await imprimirConstanciaExigibilidad("{{nombre}}", {
      ...base,
      nombre: '<script>alert("x")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
