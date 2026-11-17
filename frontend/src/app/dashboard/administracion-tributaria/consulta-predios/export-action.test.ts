import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import {
  exportarPredios,
  type ConsultaPrediosFilters,
  type ConsultaPrediosExportPayload,
} from "@/actions/administracion-tributaria/consulta-predios";

type FetchArgs = [
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
];
type FetchResponse = { ok: boolean; json: () => Promise<unknown> };

const fetchMock = vi.fn<FetchArgs, FetchResponse>();
const mockedCookies = vi.mocked(cookies);
const cookieStore = {
  get: () => ({ name: "SIGMUN_AUTH", value: "test-token" }),
};

const filters: ConsultaPrediosFilters = {
  codigo: "0000123",
  codPred: "",
  anno: "2026",
  codVia: "",
  urbBus: "",
  nro: "",
  dpto: "",
  mza: "",
  lte: "",
  sublote: "",
};

const payload: ConsultaPrediosExportPayload = {
  title: "TITULO DEL SP",
  mostrarPisos: false,
  columns: [{ key: "n", label: "N", sourceIndex: -1 }],
  rows: [["1"]],
};

describe("exportarPredios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    mockedCookies.mockResolvedValue(cookieStore as never);
    vi.stubGlobal("fetch", fetchMock);
  });

  it("reenvia SIGMUN_AUTH y el body con mostrarPisos al endpoint de export", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => payload });

    const result = await exportarPredios(filters, true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(
      "/administracion-tributaria/consulta-predios/export",
    );
    expect(init.method).toBe("POST");
    expect(init.headers.Cookie).toBe("SIGMUN_AUTH=test-token");
    expect(JSON.parse(init.body)).toEqual({ ...filters, mostrarPisos: true });
    expect(result).toEqual({ success: true, ...payload });
  });

  it("traduce el envelope canonico de error sin inventar un formato nuevo", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        code: "database_unavailable",
        message: "Base de datos no disponible",
        details: { retryable: true },
      }),
    });

    expect(await exportarPredios(filters, false)).toEqual({
      success: false,
      code: "database_unavailable",
      message: "Base de datos no disponible",
      details: { retryable: true },
    });
  });

  it("devuelve schema_mismatch cuando el backend responde un payload incompleto", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ title: "x", columns: [], rows: null }),
    });

    expect(await exportarPredios(filters, false)).toEqual({
      success: false,
      code: "schema_mismatch",
      message: "Respuesta inesperada del servidor",
    });
  });

  it("rechaza filtros invalidos antes de abrir la cookie de autenticacion", async () => {
    expect(await exportarPredios(null as never, true)).toEqual({
      success: false,
      code: "validation_error",
      message: "Validation failed",
      details: {
        errors: [
          { path: "filters", message: "Invalid filter values" },
          { path: "mostrarPisos", message: "Must be a boolean" },
        ],
      },
    });
    expect(mockedCookies).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
