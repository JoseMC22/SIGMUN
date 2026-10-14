import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import OrdenanzaDetalleModal from "../ordenanza-detalle-modal";

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
