import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCertificadosAction,
  getDetalleCertificadoAction,
  getContribuyenteAction,
  getTiposDeudaAction,
  getTiposPeriodoAction,
  getAniosDeudaAction,
  getPrediosAction,
  generarCertificadoAction,
} from "./certificado-no-adeudo";

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
  expect(url).toContain(`/cobranza/certificado-no-adeudo${path}`);
  const options = fetchMock.mock.calls[0][1] as RequestInit;
  expect(options.method).toBe("POST");
  expect(options.cache).toBe("no-store");
  expect(options.headers).toMatchObject({
    "Content-Type": "application/json",
    Cookie: "SIGMUN_AUTH=test-auth-token",
  });
  expect(JSON.parse(options.body as string)).toEqual(body);
}

describe("acciones de cobranza/certificado-no-adeudo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta los certificados del contribuyente", async () => {
    const data = [
      {
        idTbl: "10",
        idRecibo: "20",
        codigo: "0123456",
        certNro: "3",
        certAnio: "2026",
        tipoDeuda: "00.30",
        tipoDeudaDescripcion: "Vehicular",
        tipoPeriodo: "1",
        tipoPeriodoDescripcion: "Anual",
        observacion: "Prueba",
        cantImpresion: "0",
        impresion: "",
        fechaImpresion: "2026-10-30",
        estado: "1",
        estImprime: "0",
        numCertif: "000001",
      },
    ];
    const fetchMock = mockJsonResponse({ success: true, data, total: 1 });

    const result = await getCertificadosAction("0123456");

    expectPost(fetchMock, "/certificados", { codigo: "0123456" });
    expect(result).toEqual({ success: true, data });
  });

  it("consulta el detalle de un certificado", async () => {
    const data = {
      idTbl: "10",
      idRecibo: "20",
      codigo: "0123456",
      certNro: "3",
      certAnio: "2026",
      tipoDeuda: "00.30",
      tipoPeriodo: "1",
      observacion: "Prueba",
      cantImpresion: "0",
      impresion: "",
      fechaImpresion: "2026-10-30",
      estado: "1",
      anioDeuda: "2026",
      numCertif: "000001",
    };
    const fetchMock = mockJsonResponse({ success: true, data });

    const result = await getDetalleCertificadoAction("3", "2026");

    expectPost(fetchMock, "/detalle", { certNro: 3, certAnio: "2026" });
    expect(result).toEqual({ success: true, data });
  });

  it("consulta la cabecera del contribuyente", async () => {
    const data = {
      codigo: "0123456",
      nombres: "Contribuyente Prueba",
      numDoc: "12345678",
      direccion: "Av. Principal 123",
    };
    const fetchMock = mockJsonResponse({ success: true, data });

    const result = await getContribuyenteAction("0123456");

    expectPost(fetchMock, "/contribuyente", { codigo: "0123456" });
    expect(result).toEqual({ success: true, data });
  });

  it("consulta los tipos de deuda", async () => {
    const data = [{ tipo: "00.30", detalle: "Impuesto vehicular" }];
    const fetchMock = mockJsonResponse({ success: true, data });

    const result = await getTiposDeudaAction();

    expectPost(fetchMock, "/tipos-deuda", {});
    expect(result).toEqual({ success: true, data });
  });

  it("consulta los tipos de periodo", async () => {
    const data = [{ idTbl: 1, detalle: "Anual" }];
    const fetchMock = mockJsonResponse({ success: true, data });

    const result = await getTiposPeriodoAction();

    expectPost(fetchMock, "/tipos-periodo", {});
    expect(result).toEqual({ success: true, data });
  });

  it("consulta los anios de deuda", async () => {
    const data = ["2026", "2025"];
    const fetchMock = mockJsonResponse({ success: true, data });

    const result = await getAniosDeudaAction();

    expectPost(fetchMock, "/anios-deuda", {});
    expect(result).toEqual({ success: true, data });
  });

  it("consulta predios sin idTbl en alta", async () => {
    const data = [
      {
        codigo: "0123456",
        anio: "2026",
        codPred: "P-001",
        anexo: "0002",
        subAnexo: "0001",
        anexos: "0002-0001",
        direccion: "Av. Predial 456",
        detalles: "",
        tipo: "1",
        areaTerreno: 120.5,
        porcenPropiedad: 100,
        totalAutoavaluo: 90000,
        chekeado: "0",
      },
    ];
    const fetchMock = mockJsonResponse({ success: true, data });

    const result = await getPrediosAction({
      codigo: "0123456",
      anio: "2026",
      tipoDeuda: "00.10",
    });

    expectPost(fetchMock, "/predios", {
      codigo: "0123456",
      anio: "2026",
      tipoDeuda: "00.10",
    });
    expect(result).toEqual({ success: true, data });
  });

  it("consulta predios con idTbl en edicion", async () => {
    const fetchMock = mockJsonResponse({ success: true, data: [] });

    await getPrediosAction({
      codigo: "0123456",
      anio: "2026",
      tipoDeuda: "00.30",
      idTbl: "10",
    });

    expectPost(fetchMock, "/predios", {
      codigo: "0123456",
      anio: "2026",
      tipoDeuda: "00.30",
      idTbl: 10,
    });
  });

  it("genera un certificado con el payload del backend", async () => {
    const fetchMock = mockJsonResponse({
      success: true,
      message: "Se registro correctamente",
      estado: "REGISTRADO",
    });
    const input = {
      codigo: "0123456",
      tipoDeuda: "00.30",
      tipoPeriodo: 1,
      observacion: "Sin deuda pendiente",
      aniosDeuda: "2026",
      detalles: [
        {
          codigo: "0123456",
          anio: "2026",
          codPred: "ABC-123",
          anexo: "0002",
          subAnexo: "0001",
        },
      ],
    };

    const result = await generarCertificadoAction(input);

    expectPost(fetchMock, "/generar", input);
    expect(result).toEqual({
      success: true,
      message: "Se registro correctamente",
      estado: "REGISTRADO",
    });
  });

  it("propaga el codigo DEUDA y el monto pendiente", async () => {
    mockJsonResponse({
      success: false,
      code: "DEUDA",
      message: "El contribuyente tiene deuda pendiente",
      montoDeuda: 125.5,
    });

    const result = await generarCertificadoAction({
      codigo: "0123456",
      tipoDeuda: "00.30",
      tipoPeriodo: 1,
      observacion: "Sin deuda pendiente",
      aniosDeuda: "2026",
      detalles: [],
    });

    expect(result).toEqual({
      success: false,
      code: "DEUDA",
      message: "El contribuyente tiene deuda pendiente",
      montoDeuda: 125.5,
    });
  });

  it("envia certNro y certAnio al editar", async () => {
    const fetchMock = mockJsonResponse({ success: true, estado: "REGISTRADO" });

    await generarCertificadoAction({
      codigo: "0123456",
      tipoDeuda: "00.30",
      tipoPeriodo: 1,
      observacion: "Edicion",
      aniosDeuda: "2026",
      detalles: [],
      certNro: 3,
      certAnio: "2026",
    });

    expectPost(fetchMock, "/generar", {
      codigo: "0123456",
      tipoDeuda: "00.30",
      tipoPeriodo: 1,
      observacion: "Edicion",
      aniosDeuda: "2026",
      detalles: [],
      certNro: 3,
      certAnio: "2026",
    });
  });

  it("devuelve error de conexion si fetch falla", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));

    const result = await getCertificadosAction("0123456");

    expect(result).toEqual({
      success: false,
      error: "Error de conexion con el servidor",
    });
  });
});
