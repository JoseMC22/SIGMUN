import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import EditarDetalleModal from "../editar-detalle-modal";

// El modal de edición del detalle resuelve `estacion` con
// checkSessionAction (patrón editar-ordenanza-modal); se mockea para no
// depender de next/headers en jsdom y para que la estación resuelta sea
// determinística en el PATCH (header x-estacion).
vi.mock("@/actions/auth/auth", () => ({
  checkSessionAction: vi.fn(async () => ({
    authenticated: true,
    user: null,
    hostname: "",
  })),
}));

// El modal es "use client" y actualiza vía PATCH al proxy (convención de la
// sección mantenimiento-tablas): mock global de fetch.
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Fila del detalle tal como la entrega el GET con llaves T3 (idDetalle =
// PK del detalle para el WHERE del modo 8, cidordenanza = master).
const detalle = {
  idDetalle: 9,
  cidordenanza: 2,
  anno: "2013",
  tipoRec: "02.01",
  concepto: "IMPUESTO AL PATRIMONIO PREDIAL",
  impInsol: 46.2,
  impReaj: 0,
  mora: 10.5,
  costoEmis: 2.5,
};

function openModal(props = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(
    <EditarDetalleModal
      isOpen
      detalle={detalle}
      onClose={onClose}
      onSuccess={onSuccess}
      {...props}
    />,
  );
  return { onClose, onSuccess };
}

describe("EditarDetalleModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pre-carga anno/tipo_rec/montos editables y muestra concepto+master solo lectura", () => {
    openModal();

    expect(
      screen.getByRole("heading", { name: /editar detalle/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/año/i)).toHaveValue("2013");
    expect(screen.getByLabelText(/tipo rec/i)).toHaveValue("02.01");
    expect(screen.getByLabelText(/imp\. insol/i)).toHaveValue(46.2);
    expect(screen.getByLabelText(/imp\. reaj/i)).toHaveValue(0);
    expect(screen.getByLabelText(/mora/i)).toHaveValue(10.5);
    expect(screen.getByLabelText(/costo emis/i)).toHaveValue(2.5);
    // Concepto (JOIN, no editable) y master (solo lectura) visibles.
    expect(
      screen.getByText(/impuesto al patrimonio predial/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/#2\b/)).toBeInTheDocument();
  });

  it("guarda vía PATCH al endpoint del detalle con la PK y llama onSuccess sin auto-cerrar", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Detalle de ordenanza actualizado exitosamente",
      }),
    });

    const { onSuccess, onClose } = openModal();

    fireEvent.change(screen.getByLabelText(/mora/i), {
      target: { value: "12.75" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    // PATCH al detalle con la PK (sin `signal`: cancelación lógica del
    // padre, patrón ordenanza-detalle-modal) + estación por header.
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/mantenimiento-tablas/ordenanzas/detalle/9",
      expect.objectContaining({ method: "PATCH" }),
    );
    const patchCall = mockFetch.mock.calls[0][1] ?? {};
    expect(patchCall).not.toHaveProperty("signal");
    expect(patchCall.headers).toMatchObject({ "x-estacion": "" });
    const patchBody = JSON.parse(patchCall.body ?? "{}");
    expect(patchBody).toEqual({
      cidordenanza: 2,
      anno: "2013",
      tipoRec: "02.01",
      impInsol: 46.2,
      impReaj: 0,
      mora: 12.75,
      costoEmis: 2.5,
    });

    // Al guardar: onSuccess (el padre invalida caché + re-consulta +
    // feedback + cierra); el modal NO se auto-cierra.
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de error de la respuesta 4xx del backend inline sin cerrar ni llamar onSuccess", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message: "anno debe tener el formato YYYY",
        statusCode: 400,
      }),
    });

    const { onSuccess, onClose } = openModal();

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    expect(
      await screen.findByText(/anno debe tener el formato yyyy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /editar detalle/i }),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("bloquea el submit con anno inválido o montos negativos sin llamar al backend", () => {
    openModal();

    fireEvent.change(screen.getByLabelText(/año/i), {
      target: { value: "13" },
    });
    fireEvent.change(screen.getByLabelText(/mora/i), {
      target: { value: "-1" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    expect(screen.getByText(/formato yyyy/i)).toBeInTheDocument();
    expect(screen.getByText(/mayor o igual a 0/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
