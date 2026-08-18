import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import AccessControlled from "./access-controlled";
import { AccessProvider, useAccess } from "@/lib/access-context";

vi.mock("@/lib/access-actions", () => ({
  fetchObjectPermissionsAction: vi.fn(),
}));

import { fetchObjectPermissionsAction } from "@/lib/access-actions";
const mockedFetch = vi.mocked(fetchObjectPermissionsAction);

/** Calls loadPermissions in useEffect, then renders children */
function AutoLoader({
  idAcceso,
  children,
}: {
  idAcceso: string;
  children: React.ReactNode;
}) {
  const { loadPermissions } = useAccess();
  useEffect(() => {
    void loadPermissions(idAcceso);
  }, [loadPermissions, idAcceso]);
  return <>{children}</>;
}

describe("AccessControlled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when loading (no flash of unauthorized content)", () => {
    render(
      <AccessProvider>
        <AccessControlled id="btnGuardar">
          <button>Guardar</button>
        </AccessControlled>
      </AccessProvider>,
    );
    expect(screen.queryByText("Guardar")).not.toBeInTheDocument();
  });

  it("renders children when bacceso=1", async () => {
    mockedFetch.mockResolvedValue({
      success: true,
      data: [{ id_objeto: "btnGuardar", bacceso: 1 }],
    });

    render(
      <AccessProvider>
        <AutoLoader idAcceso="42">
          <AccessControlled id="btnGuardar">
            <button>Guardar</button>
          </AccessControlled>
        </AutoLoader>
      </AccessProvider>,
    );

    const btn = await screen.findByText("Guardar");
    expect(btn).toBeInTheDocument();
  });

  it("returns null when bacceso=0", async () => {
    mockedFetch.mockResolvedValue({
      success: true,
      data: [{ id_objeto: "btnEliminar", bacceso: 0 }],
    });

    render(
      <AccessProvider>
        <AutoLoader idAcceso="42">
          <AccessControlled id="btnEliminar">
            <button>Eliminar</button>
          </AccessControlled>
        </AutoLoader>
      </AccessProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
    });
  });

  it("returns null for unknown id_objeto", async () => {
    mockedFetch.mockResolvedValue({
      success: true,
      data: [{ id_objeto: "btnGuardar", bacceso: 1 }],
    });

    render(
      <AccessProvider>
        <AutoLoader idAcceso="42">
          <AccessControlled id="unknown-id">
            <button>Unknown</button>
          </AccessControlled>
        </AutoLoader>
      </AccessProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    });
  });

  it("renders fallback when bacceso=0 and fallback is provided", async () => {
    mockedFetch.mockResolvedValue({
      success: true,
      data: [{ id_objeto: "btnExportar", bacceso: 0 }],
    });

    render(
      <AccessProvider>
        <AutoLoader idAcceso="42">
          <AccessControlled
            id="btnExportar"
            fallback={<span>No access</span>}
          >
            <button>Exportar</button>
          </AccessControlled>
        </AutoLoader>
      </AccessProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.queryByText("Exportar")).not.toBeInTheDocument();
      expect(screen.getByText("No access")).toBeInTheDocument();
    });
  });

  it("renders children (not fallback) when bacceso=1 and fallback is provided", async () => {
    mockedFetch.mockResolvedValue({
      success: true,
      data: [{ id_objeto: "btnExportar", bacceso: 1 }],
    });

    render(
      <AccessProvider>
        <AutoLoader idAcceso="42">
          <AccessControlled
            id="btnExportar"
            fallback={<span>No access</span>}
          >
            <button>Exportar</button>
          </AccessControlled>
        </AutoLoader>
      </AccessProvider>,
    );

    const btn = await screen.findByText("Exportar");
    expect(btn).toBeInTheDocument();
    expect(screen.queryByText("No access")).not.toBeInTheDocument();
  });
});
