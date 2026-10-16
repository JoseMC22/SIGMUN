import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import GenerarDeudaModal from "../generar-deuda-modal";
import {
  getGenerarDeudaConceptoAction,
  guardarGenerarDeudaAction,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { getStoredUser, getPcName, fetchPcName } from "@/lib/api";

// El modal consume el server action de declaración jurada (datos de concepto
// y guardado) y helpers de @/lib/api (usuario, hostname). Se mockean para no
// depender de next/headers ni de red en jsdom.
vi.mock("@/actions/administracion-tributaria/declaracion-jurada", () => ({
  getGenerarDeudaConceptoAction: vi.fn(),
  guardarGenerarDeudaAction: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getStoredUser: vi.fn(),
  getPcName: vi.fn(),
  fetchPcName: vi.fn(),
}));

const mockConceptos = vi.mocked(getGenerarDeudaConceptoAction);
const mockGuardar = vi.mocked(guardarGenerarDeudaAction);
const mockUser = vi.mocked(getStoredUser);
const mockGetPcName = vi.mocked(getPcName);
const mockFetchPcName = vi.mocked(fetchPcName);

// ── Fixtures ──────────────────────────────────────────────

const conceptos = [
  { tipo: "02.01", concepto: "Impuesto Predial" },
  { tipo: "02.02", concepto: "Arbitrios Municipales" },
];

const guardarOk = { success: true as const, data: { idMulta: "991" } };

// ── Helpers ───────────────────────────────────────────────

function renderOpen(overrides: Record<string, unknown> = {}) {
  const onClose = vi.fn();
  render(
    <GenerarDeudaModal
      isOpen
      onClose={onClose}
      codigoContribuyente="0279126"
      nombreContribuyente="QUISPE MAMANI JUAN CARLOS"
      {...overrides}
    />,
  );
  return { onClose };
}

async function waitForConceptos() {
  await waitFor(() => expect(mockConceptos).toHaveBeenCalledWith("01"));
  await waitFor(() =>
    expect(screen.getByLabelText("Concepto")).not.toBeDisabled(),
  );
}

function fillRequiredFields(monto = "150.50") {
  fireEvent.change(screen.getByLabelText("Concepto"), {
    target: { value: "02.01" },
  });
  fireEvent.change(screen.getByLabelText(/monto deuda/i), {
    target: { value: monto },
  });
}

// ── Tests ─────────────────────────────────────────────────

describe("GenerarDeudaModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue({ areaId: "01", username: "MVAEZ" } as never);
    // fetchPcName (async, al abrir) resuelve el hostname real; getPcName queda
    // como fallback distinto para probar que gana el valor resuelto.
    mockFetchPcName.mockResolvedValue("INFOSAT01");
    mockGetPcName.mockReturnValue("FALLBACK-PC");
    mockConceptos.mockResolvedValue({ success: true, data: conceptos });
    mockGuardar.mockResolvedValue(guardarOk);
  });

  it("no renderiza nada cuando isOpen=false", () => {
    render(<GenerarDeudaModal isOpen={false} onClose={vi.fn()} />);

    expect(
      screen.queryByRole("heading", { name: /generar deuda/i }),
    ).not.toBeInTheDocument();
    expect(mockConceptos).not.toHaveBeenCalled();
  });

  it("muestra el header con el nombre y el código del contribuyente", async () => {
    renderOpen();

    expect(
      screen.getByRole("heading", { name: "Generar Deuda" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("QUISPE MAMANI JUAN CARLOS · Cód. 0279126"),
    ).toBeInTheDocument();

    // Drena los efectos async (fetchPcName / conceptos) para evitar
    // actualizaciones de estado fuera de act().
    await waitFor(() => expect(mockFetchPcName).toHaveBeenCalled());
  });

  it("carga los conceptos con el área del usuario y los lista en el select", async () => {
    renderOpen();
    await waitForConceptos();

    const select = screen.getByLabelText("Concepto");
    expect(
      within(select).getByRole("option", { name: "02.01 — Impuesto Predial" }),
    ).toBeInTheDocument();
    expect(
      within(select).getByRole("option", {
        name: "02.02 — Arbitrios Municipales",
      }),
    ).toBeInTheDocument();
  });

  it("'Guardar' está deshabilitado hasta que Concepto y Monto > 0 son válidos", async () => {
    renderOpen();
    await waitForConceptos();

    const guardar = screen.getByRole("button", { name: /guardar/i });

    // Sin concepto ni monto → deshabilitado.
    expect(guardar).toBeDisabled();

    // Solo concepto → sigue deshabilitado.
    fireEvent.change(screen.getByLabelText("Concepto"), {
      target: { value: "02.01" },
    });
    expect(guardar).toBeDisabled();

    // Concepto + monto válido → habilitado.
    fireEvent.change(screen.getByLabelText(/monto deuda/i), {
      target: { value: "150.50" },
    });
    expect(guardar).toBeEnabled();
  });

  it("Guardar llama a la acción con el código, valores, operador y estación; y no cierra al éxito", async () => {
    const { onClose } = renderOpen();
    await waitForConceptos();

    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "2026-05-10" },
    });
    fillRequiredFields("150.50");

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(mockGuardar).toHaveBeenCalledTimes(1));
    expect(mockGuardar).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: "0279126",
        codigo_infraccion: "02.01",
        monto_multa: 150.5,
        fecha_multa: "2026-05-10",
        operador: "MVAEZ",
        estacion: "INFOSAT01",
      }),
    );

    expect(
      await screen.findByText("Se generó correctamente."),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("un guardado fallido muestra el error y no reporta éxito", async () => {
    mockGuardar.mockResolvedValueOnce({
      success: false,
      error: "Error del SP",
    });
    const { onClose } = renderOpen();
    await waitForConceptos();

    fillRequiredFields("150.50");
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("Error del SP")).toBeInTheDocument();
    expect(
      screen.queryByText("Se generó correctamente."),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
