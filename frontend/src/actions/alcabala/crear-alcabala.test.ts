import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearAlcabalaAction } from "./crear-alcabala";
import type { CrearAlcabalaDto } from "./crear-alcabala";

// Mock next/headers for server action auth cookie
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: "test-auth-token" })),
  })),
}));

const validDto: CrearAlcabalaDto = {
  codigoCompra: "0012345",
  nombres: "JUAN CARLOS",
  numDoc: "12345678",
  direccFiscal: "Av. Principal 123",
  codigoVenta: "V001",
  nombres1: "MARIA",
  numDoc1: "87654321",
  direccFiscal1: "Jr. Secundaria 456",
  codPred: "P001",
  anioPred: "2026",
  tipoPred: "CASA",
  direccionPredio: "Av. Real 789",
  fechaContrato: "2026-07-30",
  contrato: "C-001-2026",
  transferencia: "COMPRA VENTA",
  observacion: "",
  montoInafecto: 0,
  montoAfecto: 100000,
  montoAlcabala: 3000,
  autoavaluo: 80000,
  anexo: "",
  subAnexo: "",
};

describe("crearAlcabalaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with idAlcabala on 201 response", async () => {
    const mockResponse = { success: true, idAlcabala: 42 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await crearAlcabalaAction(validDto);

    expect(result.success).toBe(true);
    expect(result.idAlcabala).toBe(42);
    expect(result.error).toBeUndefined();
  });

  it("returns error with message on 400 Bad Request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: "El campo codigoCompra es obligatorio",
        }),
    });

    const result = await crearAlcabalaAction(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe("El campo codigoCompra es obligatorio");
    expect(result.idAlcabala).toBeUndefined();
  });

  it("returns error with message on 500 Server Error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: "Error al crear alcabala",
        }),
    });

    const result = await crearAlcabalaAction(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Error al crear alcabala");
  });

  it("handles network error and returns connection error message", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const result = await crearAlcabalaAction(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Error de conexión");
    expect(result.idAlcabala).toBeUndefined();
  });

  it("sends POST request to correct endpoint with JSON body", async () => {
    const mockResponse = { success: true, idAlcabala: 42 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(mockResponse),
    });
    global.fetch = fetchMock;

    await crearAlcabalaAction(validDto);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callUrl = fetchMock.mock.calls[0][0] as string;
    expect(callUrl).toContain("/alcabala/determinar-alcabala/crear");
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(callOptions.method).toBe("POST");
    expect(callOptions.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    const body = JSON.parse(callOptions.body as string);
    expect(body.codigoCompra).toBe("0012345");
    expect(body.montoAfecto).toBe(100000);
  });
});
