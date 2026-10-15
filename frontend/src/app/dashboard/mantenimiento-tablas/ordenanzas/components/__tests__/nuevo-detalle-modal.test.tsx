import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import NuevoDetalleModal from "../nuevo-detalle-modal";

// El modal de alta resuelve `estacion` con checkSessionAction (patrón
// editar-detalle-modal); se mockea para no depender de next/headers en
// jsdom y para que la estación resuelta sea determinística en el POST
// (header x-estacion).
vi.mock("@/actions/auth/auth", () => ({
  checkSessionAction: vi.fn(async () => ({
    authenticated: true,
    user: null,
    hostname: "",
  })),
}));

// El modal es "use client" y guarda vía POST al proxy (convención de la
// sección mantenimiento-tablas): mock global de fetch.
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Master fijo por contexto (solo lectura): el alta hereda el cidordenanza
// del modal padre (ordenanza-detalle-modal).
const master = { cidordenanza: 2, descripcion: "Pronto Pago" };

function openModal(props = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(
    <NuevoDetalleModal
      isOpen
      master={master}
      onClose={onClose}
      onSuccess={onSuccess}
      {...props}
    />,
  );
  return { onClose, onSuccess };
}

// Completa el formulario válido: anno, tipo, tipo_rec, 4 montos y
// observación. estado y fecha de vencimiento YA NO son campos del cliente
// (los fija el servidor), así que no se completan.
function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/año/i), {
    target: { value: "2013" },
  });
  fireEvent.change(screen.getByLabelText(/^tipo \*$/i), {
    target: { value: "02.01" },
  });
  fireEvent.change(screen.getByLabelText(/tipo rec/i), {
    target: { value: "02.01" },
  });
  fireEvent.change(screen.getByLabelText(/imp\. insol/i), {
    target: { value: "46.2" },
  });
  fireEvent.change(screen.getByLabelText(/imp\. reaj/i), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText(/mora/i), {
    target: { value: "10.5" },
  });
  fireEvent.change(screen.getByLabelText(/costo emis/i), {
    target: { value: "2.5" },
  });
  fireEvent.change(screen.getByLabelText(/observaci/i), {
    target: { value: "" },
  });
}

describe("NuevoDetalleModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Algunos casos congelan el reloj para el "hoy" mostrado.
    vi.useRealTimers();
  });

  it("muestra el master fijo y estado/vencimiento como solo lectura (sin inputs editables)", () => {
    // Reloj congelado: el día mostrado se calcula en partes locales.
    // 2026-10-15T12:00:00Z → 2026-10-15.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));

    openModal();

    expect(
      screen.getByRole("heading", { name: /nuevo detalle/i }),
    ).toBeInTheDocument();
    // Master fijo por contexto (solo lectura, sin inputs editables).
    expect(screen.getByText(/#2\b/)).toBeInTheDocument();
    expect(screen.getByText(/pronto pago/i)).toBeInTheDocument();
    // Formulario: anno, tipo, tipo_rec y 4 montos editables (vacío).
    expect(screen.getByLabelText(/año/i)).toHaveValue("");
    expect(screen.getByLabelText(/^tipo \*$/i)).toHaveValue("");
    expect(screen.getByLabelText(/tipo rec/i)).toHaveValue("");
    expect(screen.getByLabelText(/imp\. insol/i)).toHaveValue(null);
    // estado y fecha de vencimiento NO son inputs del cliente: no hay campo
    // de vencimiento ni los ids de input; se muestran solo lectura.
    expect(screen.queryByLabelText(/vencimiento/i)).toBeNull();
    expect(document.getElementById("nuevo-detalle-estado")).toBeNull();
    expect(document.getElementById("nuevo-detalle-fecvenc")).toBeNull();
    expect(screen.getByTestId("nuevo-detalle-estado-fijo")).toHaveTextContent(
      "1",
    );
    expect(screen.getByTestId("nuevo-detalle-fecvenc-fijo")).toHaveTextContent(
      "2026-10-15",
    );
  });

  it("guarda vía POST al endpoint del detalle sin estado/fecvenc y llama onSuccess sin auto-cerrar", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Detalle de ordenanza registrado exitosamente",
      }),
    });

    const { onSuccess, onClose } = openModal();
    fillValidForm();

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    // POST al detalle (sin `signal`: cancelación lógica del padre, patrón
    // ordenanza-detalle-modal) + estación por header.
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/mantenimiento-tablas/ordenanzas/detalle",
      expect.objectContaining({ method: "POST" }),
    );
    const postCall = mockFetch.mock.calls[0][1] ?? {};
    expect(postCall).not.toHaveProperty("signal");
    expect(postCall.headers).toMatchObject({ "x-estacion": "" });
    const postBody = JSON.parse(postCall.body ?? "{}");
    // estado y fecvenc NO viajan: el backend es la autoridad. Se afirma el
    // set EXACTO de claves (no solo la ausencia de las dos).
    expect(Object.keys(postBody).sort()).toEqual([
      "anno",
      "cidordenanza",
      "costoEmis",
      "impInsol",
      "impReaj",
      "mora",
      "observacion",
      "tipo",
      "tipoRec",
    ]);
    expect(postBody).toEqual({
      cidordenanza: 2,
      anno: "2013",
      tipo: "02.01",
      tipoRec: "02.01",
      impInsol: 46.2,
      impReaj: 0,
      mora: 10.5,
      costoEmis: 2.5,
      observacion: "",
    });

    // Al guardar: onSuccess (el padre invalida caché + re-consulta +
    // feedback + cierra); el modal NO se auto-cierra.
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("muestra el 409 por duplicado (año, tipo_rec) inline sin cerrar ni llamar onSuccess", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message:
          "Ya existe otra fila con año 2013 y tipo 02.01 en esta ordenanza",
        statusCode: 409,
      }),
    });

    const { onSuccess, onClose } = openModal();
    fillValidForm();

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    expect(
      await screen.findByText(/ya existe otra fila con año 2013/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /nuevo detalle/i }),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("bloquea el submit con anno inválido, tipo/tipoRec vacíos o montos negativos sin llamar al backend", () => {
    openModal();
    fillValidForm();

    fireEvent.change(screen.getByLabelText(/año/i), {
      target: { value: "13" },
    });
    fireEvent.change(screen.getByLabelText(/^tipo \*$/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/tipo rec/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/mora/i), {
      target: { value: "-1" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    expect(screen.getByText(/formato yyyy/i)).toBeInTheDocument();
    expect(screen.getByText(/^el tipo es obligatorio$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/tipo de recurso es obligatorio/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/mayor o igual a 0/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
