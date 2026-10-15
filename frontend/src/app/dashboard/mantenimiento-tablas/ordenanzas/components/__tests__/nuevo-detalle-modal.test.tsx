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

// Completa el formulario válido: rango de años (desde/hasta), tipo, tipo_rec,
// 4 montos y observación. estado y fecha de vencimiento YA NO son campos del
// cliente (los fija el servidor), así que no se completan.
function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/año desde/i), {
    target: { value: "2013" },
  });
  fireEvent.change(screen.getByLabelText(/año hasta/i), {
    target: { value: "2014" },
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

function submitForm() {
  fireEvent.submit(
    screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
  );
}

describe("NuevoDetalleModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Algunos casos congelan el reloj para el "hoy" mostrado.
    vi.useRealTimers();
  });

  it("muestra el master fijo, el rango de años editable y estado/vencimiento como solo lectura", () => {
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
    // Formulario: rango de años (desde/hasta), tipo, tipo_rec y 4 montos
    // editables (vacíos).
    expect(screen.getByLabelText(/año desde/i)).toHaveValue("");
    expect(screen.getByLabelText(/año hasta/i)).toHaveValue("");
    expect(screen.getByLabelText(/^tipo \*$/i)).toHaveValue("");
    expect(screen.getByLabelText(/tipo rec/i)).toHaveValue("");
    expect(screen.getByLabelText(/imp\. insol/i)).toHaveValue(null);
    // El input único de año ya NO existe (se reemplazó por el rango).
    expect(document.getElementById("nuevo-detalle-anno")).toBeNull();
    expect(document.getElementById("nuevo-detalle-anno-desde")).not.toBeNull();
    expect(document.getElementById("nuevo-detalle-anno-hasta")).not.toBeNull();
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

  it("guarda vía POST al endpoint del detalle con el rango (sin anno/estado/fecvenc) y llama onSuccess sin auto-cerrar", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Se registraron 2 años (2013 a 2014).",
        creados: ["2013", "2014"],
        salteados: [],
      }),
    });

    const { onSuccess, onClose } = openModal();
    fillValidForm();

    submitForm();

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
    // anno/estado/fecvenc NO viajan: el backend es la autoridad y el alta
    // ahora manda un RANGO. Se afirma el set EXACTO de claves.
    expect(Object.keys(postBody).sort()).toEqual([
      "annoDesde",
      "annoHasta",
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
      annoDesde: "2013",
      annoHasta: "2014",
      tipo: "02.01",
      tipoRec: "02.01",
      impInsol: 46.2,
      impReaj: 0,
      mora: 10.5,
      costoEmis: 2.5,
      observacion: "",
    });

    // Sin años salteados → comportamiento actual: onSuccess (el padre
    // invalida caché + re-consulta + feedback + cierra); el modal NO se
    // auto-cierra.
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("muestra el 409 por duplicado inline sin cerrar ni llamar onSuccess", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message:
          "No se registró ningún año del rango 2013 a 2013: todos ya existen para el tipo 02.01",
        statusCode: 409,
      }),
    });

    const { onSuccess, onClose } = openModal();
    fillValidForm();

    submitForm();

    expect(
      await screen.findByText(/ya existen para el tipo 02.01/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /nuevo detalle/i }),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("muestra el banner ámbar y el botón Listo cuando el backend saltea años (sin onSuccess inmediato)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message:
          "Se registraron 3 años (2013 a 2016). Se salteó 1 por ya existir: 2014.",
        creados: ["2013", "2015", "2016"],
        salteados: ["2014"],
      }),
    });

    const { onSuccess, onClose } = openModal();
    fillValidForm();

    submitForm();

    expect(
      await screen.findByText(/se salteó 1 por ya existir: 2014/i),
    ).toBeInTheDocument();
    // Mientras hay resultado: los botones de footer normales se ocultan y
    // NO se llamó onSuccess todavía (el usuario debe confirmar con Listo).
    expect(screen.queryByRole("button", { name: /^guardar$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^cancelar$/i })).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^listo$/i }));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("bloquea el submit con año inválido, tipo/tipoRec vacíos o montos negativos sin llamar al backend", () => {
    openModal();
    fillValidForm();

    fireEvent.change(screen.getByLabelText(/año desde/i), {
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

    submitForm();

    expect(screen.getByText(/formato yyyy/i)).toBeInTheDocument();
    expect(screen.getByText(/^el tipo es obligatorio$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/tipo de recurso es obligatorio/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/mayor o igual a 0/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("bloquea el submit cuando el año desde es mayor que el año hasta", () => {
    openModal();
    fillValidForm();

    fireEvent.change(screen.getByLabelText(/año desde/i), {
      target: { value: "2020" },
    });
    fireEvent.change(screen.getByLabelText(/año hasta/i), {
      target: { value: "2010" },
    });

    submitForm();

    expect(
      screen.getByText(/no puede ser mayor que el año hasta/i),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("bloquea el submit cuando el rango supera los 100 años", () => {
    openModal();
    fillValidForm();

    fireEvent.change(screen.getByLabelText(/año desde/i), {
      target: { value: "1900" },
    });
    fireEvent.change(screen.getByLabelText(/año hasta/i), {
      target: { value: "2100" },
    });

    submitForm();

    expect(
      screen.getByText(/no puede superar los 100 años/i),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
