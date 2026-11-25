import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ObrasComplementariasPage from "./page";
import { ObraComplementariaRow } from "./types";

const BASE = "/api/mantenimiento-tablas/obras-complementarias";

const row: ObraComplementariaRow = {
  id_instala: "001",
  anno: "2027",
  categ: "A1",
  instala: "Obra complementaria",
  uni_med: "UND",
  valor: 123.45,
  descri_gener: "Descripción general",
  nestado: 1,
  vusernm: "mvaez",
  vhostnm: "SERVIDOR-01",
  ddatetm: "2026-11-25T12:00:00Z",
};

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

describe("ObrasComplementariasPage", () => {
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

  it("carga los años y ejecuta la búsqueda inicial sin filtro de categoría", async () => {
    render(<ObrasComplementariasPage />);

    const grid = await screen.findByTestId("obras-complementarias-grid");
    expect(grid).toHaveAttribute("role", "grid");
    expect(within(grid).getByText("2027")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/years`);
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}?anno=2027`);
  });

  it("no envía categ cuando el campo de categoría está vacío y el usuario presiona buscar", async () => {
    render(<ObrasComplementariasPage />);
    await screen.findByTestId("obras-complementarias-grid");

    const categoria = screen.getByLabelText("Categoría");
    expect((categoria as HTMLInputElement).value).toBe("");

    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      const calls = mockFetch.mock.calls.map((call) => String(call[0]));
      expect(calls).toContain(`${BASE}?anno=2027`);
      expect(calls).not.toContain(`${BASE}?anno=2027&categ=`);
    });
  });

  it("envía categ cuando el usuario ingresa una categoría y presiona buscar", async () => {
    render(<ObrasComplementariasPage />);
    await screen.findByTestId("obras-complementarias-grid");

    const categoria = screen.getByLabelText("Categoría");
    await userEvent.type(categoria, "A1");
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(`${BASE}?anno=2027&categ=A1`);
    });
  });
});
