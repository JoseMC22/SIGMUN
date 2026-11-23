import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ValoresUnitariosPage from "./page";

interface TestRow {
  region: string;
  anno: string;
  codi: string;
  valor: number;
  operador: string;
  estacion: string;
  fechor_ing: string;
}

const row: TestRow = {
  region: "1",
  anno: "2027",
  codi: "A1",
  valor: 123.45,
  operador: "mvaez",
  estacion: "10.0.0.1",
  fechor_ing: "2026-11-23T12:00:00Z",
};

const BASE = "/api/mantenimiento-tablas/valores-unitarios";

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

describe("ValoresUnitariosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.includes("/years")) {
        return Promise.resolve(jsonResponse({ years: ["2027", "2026"] }));
      }
      if (url.includes("?anno=")) {
        return Promise.resolve(jsonResponse({ data: [row] }));
      }
      return Promise.resolve(jsonResponse({ message: "ok" }));
    });
  });

  it("renderiza la grilla con la fila devuelta por la búsqueda inicial", async () => {
    render(<ValoresUnitariosPage />);

    const grid = await screen.findByTestId("valores-unitarios-grid");
    expect(grid).toHaveAttribute("role", "grid");
    expect(within(grid).getByText("2027")).toBeInTheDocument();
    expect(within(grid).getByText("A1")).toBeInTheDocument();
    expect(within(grid).getByText("123.45")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/years`);
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}?anno=2027`);
  });

  it("envía un único POST bulk con los códigos completados y refresca la grilla", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByTestId("valores-unitarios-bulk-grid"),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Región")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Año")).toHaveValue("2027");

    await userEvent.type(within(dialog).getByLabelText("Valor A1"), "123.45");
    await userEvent.type(within(dialog).getByLabelText("Valor I7"), "99.9");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(`${BASE}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: "1",
          anno: "2027",
          items: [
            { codi: "A1", valor: 123.45 },
            { codi: "I7", valor: 99.9 },
          ],
        }),
      });
    });
    expect(
      mockFetch.mock.calls.filter(
        (call) => String(call[0]).endsWith("/bulk") && call[1]?.method === "POST",
      ),
    ).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}?anno=2027`);
  });

  it("muestra error de validación sin enviar la petición", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(
      within(dialog).getByText("Ingrese al menos un valor"),
    ).toBeInTheDocument();

    await userEvent.clear(within(dialog).getByLabelText("Región"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(
      within(dialog).getByText("La región debe tener 1 dígito"),
    ).toBeInTheDocument();
    expect(
      mockFetch.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(0);
  });

  it("renderiza las 70 cajas de los códigos A1 a J7", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    const grid = within(dialog).getByTestId("valores-unitarios-bulk-grid");

    expect(within(grid).getAllByRole("spinbutton")).toHaveLength(70);
    expect(within(grid).getByLabelText("Valor A1")).toBeInTheDocument();
    expect(within(grid).getByLabelText("Valor J7")).toBeInTheDocument();
    expect(within(grid).getByText("A1")).toBeInTheDocument();
    expect(within(grid).getByText("J7")).toBeInTheDocument();
  });

  it("envía el payload correcto al editar con claves de solo lectura", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(
      screen.getByRole("button", { name: "Editar fila 2027-1-A1" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Año")).toHaveAttribute("readonly");
    expect(within(dialog).getByLabelText("Código")).toHaveAttribute("readonly");

    await userEvent.clear(within(dialog).getByLabelText("Valor"));
    await userEvent.type(within(dialog).getByLabelText("Valor"), "200.50");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: "1",
          anno: "2027",
          codi: "A1",
          valor: 200.5,
        }),
      });
    });
  });

  it("elimina por clave natural con codi codificado y refresca la grilla", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(
      screen.getByRole("button", { name: "Eliminar fila 2027-1-A1" }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Sí, eliminar" }),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(`${BASE}/1/2027/A1`, {
        method: "DELETE",
      });
    });
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}?anno=2027`);
  });
});
