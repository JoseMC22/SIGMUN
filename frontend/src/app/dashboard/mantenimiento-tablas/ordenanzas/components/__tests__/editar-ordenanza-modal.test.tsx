import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import EditarOrdenanzaModal from "../editar-ordenanza-modal";

// El modal de edición resuelve `estacion` con checkSessionAction (patrón
// nueva-ordenanza-modal); se mockea para no depender de next/headers en
// jsdom y para que el hostname resuelto sea determinístico en el PATCH.
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

// Fila master tal como la entrega el GET S3 (fechas ISO en passthrough).
const ordenanza = {
  idordenanza: 5,
  criterio: "1",
  descripcion: "Pronto Pago",
  fec_desde: "2013-09-01T00:00:00.000Z",
  fec_hasta: "2013-09-30T00:00:00.000Z",
  observacion: "Beneficio por pago oportuno",
  estado: "1",
  operador: "ADMIN",
  estacion: "SERVIDOR1",
  fech_ing: "2013-08-15T10:20:30.000Z",
};

function openModal(props = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(
    <EditarOrdenanzaModal
      isOpen
      ordenanza={ordenanza}
      onClose={onClose}
      onSuccess={onSuccess}
      {...props}
    />,
  );
  return { onClose, onSuccess };
}

describe("EditarOrdenanzaModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pre-carga los campos con los valores de la fila master (fechas en YYYY-MM-DD)", () => {
    openModal();

    expect(
      screen.getByRole("heading", { name: /editar ordenanza/i }),
    ).toBeInTheDocument();
    // Criterio fijo en 12 y deshabilitado (aunque el master traiga otro).
    expect(screen.getByLabelText(/criterio/i)).toHaveValue(12);
    expect(screen.getByLabelText(/criterio/i)).toBeDisabled();
    expect(screen.getByLabelText(/descripción/i)).toHaveValue("Pronto Pago");
    // ISO datetime del master → YYYY-MM-DD del input date.
    expect(screen.getByLabelText(/vigencia desde/i)).toHaveValue("2013-09-01");
    expect(screen.getByLabelText(/vigencia hasta/i)).toHaveValue("2013-09-30");
    expect(screen.getByLabelText(/observación/i)).toHaveValue(
      "Beneficio por pago oportuno",
    );
  });

  it("guarda vía PATCH al endpoint con el id del master y llama onSuccess", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Ordenanza actualizada exitosamente" }),
    });

    const { onSuccess, onClose } = openModal();

    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "Pronto Pago 2024" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    // PATCH (msquery=7 en el backend) con criterio fijo en 12 aunque el
    // master traiga otro valor + campos editados; estación resuelta de la
    // sesión del cliente ("" en jsdom).
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/mantenimiento-tablas/ordenanzas/5",
      expect.objectContaining({ method: "PATCH" }),
    );
    const patchBody = JSON.parse(mockFetch.mock.calls[0][1]?.body ?? "{}");
    expect(patchBody).toEqual({
      criterio: 12,
      descripcion: "Pronto Pago 2024",
      fdesde: "2013-09-01",
      fhasta: "2013-09-30",
      observacion: "Beneficio por pago oportuno",
      estacion: "",
    });

    // Al guardar: onSuccess (el padre cierra + refresca + feedback).
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de error de la respuesta 4xx del backend inline sin cerrar ni llamar onSuccess", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message: "La vigencia hasta debe tener formato YYYY-MM-DD",
        statusCode: 400,
      }),
    });

    const { onSuccess, onClose } = openModal();

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    expect(
      await screen.findByText(
        /la vigencia hasta debe tener formato yyyy-mm-dd/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /editar ordenanza/i }),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("bloquea el submit con la descripción vacía sin llamar al backend", () => {
    openModal();

    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "   " },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: /^guardar$/i }).closest("form")!,
    );

    expect(
      screen.getByText(/la descripción es obligatoria/i),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
