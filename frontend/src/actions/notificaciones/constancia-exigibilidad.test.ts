import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import {
  emitirConstanciaExigibilidadAction,
  imprimirConstanciaExigibilidadAction,
  listTiposValorAction,
  obtenerPlantillaConstanciaExigibilidadAction,
  validarConstanciaExigibilidadAction,
} from "./constancia-exigibilidad";
import { cookies } from "next/headers";

const mockedCookies = vi.mocked(cookies);
const API_BASE = "http://localhost:3001/api";
const BASE = `${API_BASE}/notificaciones/constancia-exigibilidad`;

const AUTH_COOKIE: RequestCookie = { name: "SIGMUN_AUTH", value: "test-token" };

function createMockRequestCookies(): ReadonlyRequestCookies {
  return {
    get: () => AUTH_COOKIE,
    getAll: () => [AUTH_COOKIE],
    has: () => true,
    set: vi.fn(),
    delete: vi.fn(),
    size: 0,
    toString: () => "SIGMUN_AUTH=test-token",
    [Symbol.iterator]() {
      return new Map<string, RequestCookie>([["SIGMUN_AUTH", AUTH_COOKIE]]).entries();
    },
  } as unknown as ReadonlyRequestCookies;
}

function mockJsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

describe("constancia-exigibilidad actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCookies.mockResolvedValue(createMockRequestCookies());
  });

  it("listTiposValorAction hace GET a /tipos-valor con la cookie de auth", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: [{ id_valor: "01", nomb_val: "Impuesto Predial" }],
        total: 1,
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await listTiposValorAction();

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/tipos-valor`,
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ Cookie: "SIGMUN_AUTH=test-token" }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("validarConstanciaExigibilidadAction envía el DTO exacto a /validar", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: [
          {
            administrado: "Contribuyente",
            fecVal: null,
            monto: 100,
            cargo: "0000042",
            fNotifica: null,
            nroExigibilidad: "0",
            fExigibilidad: null,
            codigo: "0012345",
            idValor: "01",
            anoVal: "2026",
            numVal: "0000001",
            canGenerate: true,
            canPrint: false,
            message: "Proceder con la Generación de la Constancia",
          },
        ],
        total: 1,
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await validarConstanciaExigibilidadAction({
      tipoValor: "01",
      anio: 2026,
      numero: "0000001",
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/validar`);
    expect(JSON.parse(String(init.body))).toEqual({
      tipoValor: "01",
      anio: 2026,
      numero: "0000001",
    });
    expect(result.data[0]?.canGenerate).toBe(true);
  });

  it("emitirConstanciaExigibilidadAction envía el DTO exacto a /emitir y devuelve numexig/anoexig", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: [{ numexig: "0000007", anoexig: "2026" }],
        total: 1,
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await emitirConstanciaExigibilidadAction({
      tipoValor: "01",
      anio: 2026,
      numero: "0000001",
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/emitir`);
    expect(JSON.parse(String(init.body))).toEqual({
      tipoValor: "01",
      anio: 2026,
      numero: "0000001",
    });
    expect(result.data).toEqual([{ numexig: "0000007", anoexig: "2026" }]);
  });

  it("imprimirConstanciaExigibilidadAction envía SOLO numexig y anoexig a /impresion", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: [
          {
            nombre: "Contribuyente",
            constancia: "0000007-2026",
            valor: "IPRE 2026 0000001",
            fnotifica: "2026-10-29T00:00:00.000Z",
            cargo: "0000042",
          },
        ],
        total: 1,
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    await imprimirConstanciaExigibilidadAction({
      numexig: "0000007",
      anoexig: "2026",
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/impresion`);
    expect(JSON.parse(String(init.body))).toEqual({
      numexig: "0000007",
      anoexig: "2026",
    });
  });

  it("propaga el envelope de fallo del backend (business rule) como success:false + error", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: false,
        data: [],
        total: 0,
        error: "Ya cuenta con Constancia de Exigibilidad",
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await emitirConstanciaExigibilidadAction({
      tipoValor: "01",
      anio: 2026,
      numero: "0000001",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Ya cuenta con Constancia de Exigibilidad");
  });

  it("HTTP no-2xx devuelve success:false con el detalle del cuerpo", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(
        { error: "Unauthorized" },
        { ok: false, status: 401 },
      ),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await validarConstanciaExigibilidadAction({
      tipoValor: "01",
      anio: 2026,
      numero: "0000001",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("fallo de red devuelve 'Error de conexión con el servidor'", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

    const result = await listTiposValorAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Error de conexión con el servidor");
  });

  it("obtenerPlantillaConstanciaExigibilidadAction lee PlantillaConstanciaExigibilidad.html (S8)", async () => {
    const result = await obtenerPlantillaConstanciaExigibilidadAction();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.html).toContain("{{nroconstancia}}");
      expect(result.data.html).toContain("{{nombre}}");
    }
  });
});
