import { describe, it, expect, vi, beforeEach } from "vitest";
import { anularValorAction } from "./anular-valor";
import type { AnularValorInput } from "./anular-valor";

// Mock del cookie de auth del server action (patrón crear-alcabala.test.ts)
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: "test-auth-token" })),
  })),
}));

const input: AnularValorInput = {
  Codigo: "0279126",
  IdValor: "01",
  NumVal: "0018351",
  AnoVal: "2024",
  Motivo: "Error de carga del valor en el periodo 2024",
  Operador: "mvaez",
};

describe("anularValorAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hace POST a /cobranza/anular-valor/anular con el contrato del backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, message: "ok" }),
    });
    global.fetch = fetchMock;

    await anularValorAction(input);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/cobranza/anular-valor/anular");
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options.body as string)).toEqual({
      Codigo: "0279126",
      IdValor: "01",
      NumVal: "0018351",
      AnoVal: "2024",
      Motivo: "Error de carga del valor en el periodo 2024",
      Operador: "mvaez",
    });
  });

  it("devuelve message cuando el backend responde success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          message: "Valor anulado correctamente",
        }),
    });

    const res = await anularValorAction(input);

    expect(res.success).toBe(true);
    expect(res.message).toBe("Valor anulado correctamente");
    expect(res.error).toBeUndefined();
  });

  it("propaga el error del backend (success:false)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: false,
          error: "Solo se pueden anular valores en estado Pendiente",
        }),
    });

    const res = await anularValorAction(input);

    expect(res.success).toBe(false);
    expect(res.error).toBe(
      "Solo se pueden anular valores en estado Pendiente",
    );
    expect(res.message).toBeUndefined();
  });

  it("devuelve error cuando la respuesta HTTP no es ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("server error"),
    });

    const res = await anularValorAction(input);

    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("devuelve error de conexión si fetch tira", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));

    const res = await anularValorAction(input);

    expect(res.success).toBe(false);
    expect(res.error).toBe("Error de conexión con el servidor");
  });
});
