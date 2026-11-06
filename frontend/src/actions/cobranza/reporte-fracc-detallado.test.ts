import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchFraccDetalladoAction,
  fetchFraccDetalladoCatalogosAction,
} from "./reporte-fracc-detallado";

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: "test-auth-token" })),
  })),
}));

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    // El action usa response.text() en la rama de error HTTP; sin este metodo
    // el mock tira TypeError y el test pasa por la rama de error de conexion.
    text: () =>
      Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  });
  global.fetch = fetchMock;
  return fetchMock;
}

function expectPost(
  fetchMock: ReturnType<typeof vi.fn>,
  path: string,
  body: unknown,
) {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const url = fetchMock.mock.calls[0][0] as string;
  expect(url).toContain(`/cobranza/reporte-fracc-detallado${path}`);
  const options = fetchMock.mock.calls[0][1] as RequestInit;
  expect(options.method).toBe("POST");
  expect(options.cache).toBe("no-store");
  expect(options.headers).toMatchObject({
    "Content-Type": "application/json",
    Cookie: "SIGMUN_AUTH=test-auth-token",
  });
  expect(JSON.parse(options.body as string)).toEqual(body);
}

const filtros = { codigo: "02002", anno: "2026", idMes: 8 };

describe("acciones de cobranza/reporte-fracc-detallado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchFraccDetalladoAction", () => {
    it("consulta el reporte con las claves exactas del DTO y devuelve el envelope", async () => {
      const data = [
        {
          CODIGO: "0200274",
          nombre: "PEREZ JUAN",
          ANIO_CTA: "2024",
          CONVENIO: "C-001",
          FECHA: "05/03/2026",
          descrip: "CONVENIO DE PAGO",
          IMP_INSOL: 1234.5,
          NUM_CUOTAS: 12,
          CUOTAS_PENDIENTES: 7,
          T_INSOL_CONVENIO: 9999,
          SALDO: 800.25,
          ANIO_SALDO: "2026",
          MES_SALDO: "AGOSTO",
        },
      ];
      const fetchMock = mockJsonResponse({
        success: true,
        data,
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      });

      const result = await searchFraccDetalladoAction(filtros, 1, 15);

      expectPost(fetchMock, "/search", {
        page: 1,
        pageSize: 15,
        Codigo: "02002",
        Anno: "2026",
        IdMes: 8,
      });
      expect(result).toEqual({
        success: true,
        data,
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      });
    });

    it("usa exactamente las claves del DTO (trampa de casing) y manda IdMes sin ceros", async () => {
      const fetchMock = mockJsonResponse({ success: true, data: [] });

      await searchFraccDetalladoAction(filtros, 1, 15);

      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as RequestInit).body as string,
      );
      // Un casing errado ('codigo', 'anno', 'idMes') lo descarta Zod en silencio
      // y el reporte traería el universo completo sin error visible.
      expect(Object.keys(body).sort()).toEqual([
        "Anno",
        "Codigo",
        "IdMes",
        "page",
        "pageSize",
      ]);
      // id_mes va sin ceros a la izquierda (8, nunca '08').
      expect(body.IdMes).toBe(8);
      expect(body.IdMes).not.toBe("08");
    });

    it("manda Codigo vacío sin acotar cuando el filtro viene vacío (sin padCodigo)", async () => {
      const fetchMock = mockJsonResponse({ success: true, data: [] });

      await searchFraccDetalladoAction(
        { codigo: "", anno: "2026", idMes: 11 },
        1,
        15,
      );

      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as RequestInit).body as string,
      );
      // Vacío = sin acotar. No se rellena con ceros: un código parcial es
      // búsqueda válida y el SP hace LIKE contiene.
      expect(body.Codigo).toBe("");
      expect(body.Codigo).not.toBe("0000000");
    });

    it("propaga el error HTTP del backend", async () => {
      mockJsonResponse("Internal Server Error", false, 500);

      const result = await searchFraccDetalladoAction(filtros, 1, 15);

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.totalPages).toBe(0);
      // El mensaje del backend se propaga: NO cae en el catch generico.
      expect(result.error).toBe("Internal Server Error");
    });

    it("devuelve success:false cuando el envelope viene con success:false", async () => {
      mockJsonResponse({
        success: false,
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
        error: "Anno debe tener 4 dígitos",
      });

      const result = await searchFraccDetalladoAction(filtros, 1, 15);

      expect(result).toMatchObject({
        success: false,
        data: [],
        error: "Anno debe tener 4 dígitos",
      });
    });

    it("devuelve error de conexión si fetch falla", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network"));

      const result = await searchFraccDetalladoAction(filtros, 1, 15);

      expect(result).toMatchObject({
        success: false,
        error: "Error de conexión con el servidor",
      });
    });
  });

  describe("fetchFraccDetalladoCatalogosAction", () => {
    it("sin Anno pide solo los años (body sin la clave Anno)", async () => {
      const fetchMock = mockJsonResponse({
        success: true,
        anios: ["2026", "2025"],
        meses: [],
      });

      const result = await fetchFraccDetalladoCatalogosAction();

      expectPost(fetchMock, "/catalogos", {});
      expect(result).toEqual({
        success: true,
        anios: ["2026", "2025"],
        meses: [],
      });
    });

    it("con Anno pide también los meses de ese año", async () => {
      const fetchMock = mockJsonResponse({
        success: true,
        anios: ["2026", "2025"],
        meses: [
          { id_mes: 8, nom_mes: "AGOSTO" },
          { id_mes: 11, nom_mes: "NOVIEMBRE" },
        ],
      });

      const result = await fetchFraccDetalladoCatalogosAction("2026");

      expectPost(fetchMock, "/catalogos", { Anno: "2026" });
      expect(result.meses).toEqual([
        { id_mes: 8, nom_mes: "AGOSTO" },
        { id_mes: 11, nom_mes: "NOVIEMBRE" },
      ]);
    });

    it("devuelve success:false con catálogos vacíos cuando el backend falla", async () => {
      mockJsonResponse({
        success: false,
        anios: [],
        meses: [],
        error: "Error al consultar los catálogos",
      });

      const result = await fetchFraccDetalladoCatalogosAction("2026");

      expect(result).toEqual({
        success: false,
        anios: [],
        meses: [],
        error: "Error al consultar los catálogos",
      });
    });

    it("devuelve error de conexión si fetch falla", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network"));

      const result = await fetchFraccDetalladoCatalogosAction();

      expect(result).toEqual({
        success: false,
        anios: [],
        meses: [],
        error: "Error de conexión con el servidor",
      });
    });
  });
});
