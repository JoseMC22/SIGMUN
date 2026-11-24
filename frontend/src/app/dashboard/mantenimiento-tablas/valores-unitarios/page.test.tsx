import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ValoresUnitariosPage from "./page";
import { VALORES_UNITARIOS_CODES } from "./types";

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
const BULK = `${BASE}/bulk`;

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const bulkPayload = (values: Record<string, number> = {}) => ({
  region: "1",
  anno: "2027",
  items: VALORES_UNITARIOS_CODES.map((codi) => ({
    codi,
    valor: values[codi] ?? 0,
  })),
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

describe("ValoresUnitariosPage", () => {
  const postCalls = () =>
    mockFetch.mock.calls.filter(
      (call) => call[1]?.method === "POST",
    );
  const bulkCalls = () =>
    mockFetch.mock.calls.filter(
      (call) => String(call[0]) === BULK && call[1]?.method === "POST",
    );
  const refreshes = () =>
    mockFetch.mock.calls.filter((call) => String(call[0]).includes("?anno="));

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

  it("abre el modal de registro por año en lugar del formulario individual", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Registro de valores unitarios" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Región")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Año")).toHaveValue("2027");
    expect(within(dialog).getByLabelText("Categoría")).toHaveValue("");
    expect(within(dialog).getByLabelText("Valor")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Agregar" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Grabar" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Guardar" })).toBeNull();
  });

  it("agrega A2 con 99.9 y grabar envía un único POST con los 70 códigos", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Categoría"), "A2");
    await userEvent.type(within(dialog).getByLabelText("Valor"), "99.9");
    await userEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));

    const list = within(dialog).getByTestId("valores-unitarios-added-list");
    expect(within(list).getByText("A2")).toBeInTheDocument();
    expect(within(list).getByText("99.9")).toBeInTheDocument();
    expect(bulkCalls()).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole("button", { name: "Grabar" }));

    await waitFor(() => {
      expect(bulkCalls()).toHaveLength(1);
    });
    expect(mockFetch).toHaveBeenCalledWith(BULK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bulkPayload({ A2: 99.9 })),
    });
    expect(
      mockFetch.mock.calls.filter(
        (call) => String(call[0]) === BASE && call[1]?.method === "POST",
      ),
    ).toHaveLength(0);
    expect(postCalls()).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("permite grabar sin categorías agregadas con los 70 valores en cero", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByTestId("valores-unitarios-added-list"),
    ).toBeEmptyDOMElement();
    await userEvent.click(within(dialog).getByRole("button", { name: "Grabar" }));

    await waitFor(() => {
      expect(bulkCalls()).toHaveLength(1);
    });
    expect(mockFetch).toHaveBeenCalledWith(BULK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bulkPayload()),
    });
  });

  it("rechaza una categoría duplicada sin agregar una segunda fila", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    const categoria = within(dialog).getByLabelText("Categoría");
    const valor = within(dialog).getByLabelText("Valor");
    const agregar = () =>
      userEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));

    await userEvent.type(categoria, "A2");
    await userEvent.type(valor, "99.9");
    await agregar();
    expect((categoria as HTMLInputElement).value).toBe("");
    expect((valor as HTMLInputElement).value).toBe("");

    await userEvent.type(categoria, "A2");
    await userEvent.type(valor, "50");
    await agregar();

    expect(
      within(dialog).getByText("La categoría ya fue agregada"),
    ).toBeInTheDocument();
    const list = within(dialog).getByTestId("valores-unitarios-added-list");
    expect(within(list).getAllByText("A2")).toHaveLength(1);
    expect(within(list).queryByText("50")).toBeNull();
    expect(postCalls()).toHaveLength(0);
  });

  it("valida antes de grabar y acepta J7 sin enviar peticiones con datos inválidos", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    const region = within(dialog).getByLabelText("Región");
    const anno = within(dialog).getByLabelText("Año");
    const categoria = within(dialog).getByLabelText("Categoría");
    const valor = within(dialog).getByLabelText("Valor");
    const agregar = () =>
      userEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));

    await userEvent.clear(region);
    await agregar();
    expect(
      within(dialog).getByText("La región debe tener 1 dígito"),
    ).toBeInTheDocument();

    await userEvent.type(region, "1");
    await userEvent.clear(anno);
    await userEvent.type(anno, "20");
    await agregar();
    expect(
      within(dialog).getByText("El año debe tener 4 dígitos"),
    ).toBeInTheDocument();

    await userEvent.type(anno, "27");
    for (const invalida of ["K1", "A8"]) {
      await userEvent.type(categoria, invalida);
      await agregar();
      expect(
        within(dialog).getByText("La categoría debe estar entre A1 y J7"),
      ).toBeInTheDocument();
      await userEvent.clear(categoria);
    }

    await userEvent.type(categoria, "J7");
    await agregar();
    expect(
      within(dialog).getByText("El valor debe estar entre 0 y 99999.99"),
    ).toBeInTheDocument();

    await userEvent.type(valor, "10");
    await agregar();
    expect(
      within(dialog).queryByText("La categoría debe estar entre A1 y J7"),
    ).toBeNull();
    const list = within(dialog).getByTestId("valores-unitarios-added-list");
    expect(within(list).getByText("J7")).toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole("button", { name: "Grabar" }));
    await waitFor(() => {
      expect(bulkCalls()).toHaveLength(1);
    });
    expect(mockFetch).toHaveBeenCalledWith(BULK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bulkPayload({ J7: 10 })),
    });
  });

  it("muestra el conflicto 409 sin cerrar el modal ni refrescar la grilla", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");
    expect(refreshes()).toHaveLength(1);

    mockFetch.mockImplementation(
      (input: unknown, init?: { method?: string }) => {
        if (String(input) === BULK && init?.method === "POST") {
          return Promise.resolve(
            jsonResponse({ code: "conflict", message: "La fila ya existe" }, 409),
          );
        }
        return Promise.resolve(jsonResponse({ data: [row] }));
      },
    );

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Categoría"), "A1");
    await userEvent.type(within(dialog).getByLabelText("Valor"), "10");
    await userEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Grabar" }));

    await waitFor(() => {
      expect(within(dialog).getByText("La fila ya existe")).toBeInTheDocument();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refreshes()).toHaveLength(1);
  });

  it("envía el payload correcto al editar con claves de solo lectura", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(
      screen.getByRole("button", { name: "Editar fila 2027-1-A1" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Región")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Región")).toHaveAttribute("readonly");
    expect(within(dialog).getByLabelText("Año")).toHaveAttribute("readonly");
    expect(within(dialog).getByLabelText("Categoría")).toHaveAttribute(
      "readonly",
    );

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
    expect(refreshes()).toHaveLength(2);
  });

  it("inicializa la región en 1 al registrar y conserva la de la fila al editar", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    let dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Región")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Región")).not.toHaveAttribute(
      "readonly",
    );

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancelar" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Editar fila 2027-1-A1" }),
    );
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Región")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Región")).toHaveAttribute("readonly");
  });

  it("convierte la categoría a mayúsculas al escribir y la envía en el bulk", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    const categoria = within(dialog).getByLabelText("Categoría");

    await userEvent.type(categoria, "a2");
    expect(categoria).toHaveValue("A2");
    await userEvent.type(within(dialog).getByLabelText("Valor"), "99.9");
    await userEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Grabar" }));

    await waitFor(() => {
      expect(bulkCalls()).toHaveLength(1);
    });
    expect(mockFetch).toHaveBeenCalledWith(BULK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bulkPayload({ A2: 99.9 })),
    });
  });

  it("descarta caracteres no numéricos del año y lo envía al bulk", async () => {
    render(<ValoresUnitariosPage />);
    await screen.findByTestId("valores-unitarios-grid");

    await userEvent.click(screen.getByRole("button", { name: "Nuevo valor" }));
    const dialog = screen.getByRole("dialog");
    const anno = within(dialog).getByLabelText("Año");

    await userEvent.clear(anno);
    await userEvent.type(anno, "20ab27");
    expect(anno).toHaveValue("2027");

    await userEvent.type(within(dialog).getByLabelText("Categoría"), "A2");
    await userEvent.type(within(dialog).getByLabelText("Valor"), "10");
    await userEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Grabar" }));

    await waitFor(() => {
      expect(bulkCalls()).toHaveLength(1);
    });
    expect(mockFetch).toHaveBeenCalledWith(BULK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bulkPayload({ A2: 10 })),
    });
  });
});
