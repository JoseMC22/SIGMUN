import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPcName, getPcName } from "./api";

// Claves reales del módulo (privadas, no exportadas): la resolución del
// nombre de PC vive en localStorage y alimenta `caja.mrecibos.estacion`.
const PC_NAME_KEY = "sigmun_pc_name";
const PC_NAME_MANUAL_KEY = "sigmun_pc_name_manual";

const API_BASE = "http://localhost:3001/api";

function mockClientInfo(hostname: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ hostname, ip: "::1" }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("getPcName", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("devuelve el valor manual cuando es válido", () => {
    localStorage.setItem(PC_NAME_MANUAL_KEY, "INFOSAT01");

    expect(getPcName()).toBe("INFOSAT01");
  });

  it("devuelve '' cuando el único valor guardado es inválido", () => {
    localStorage.setItem(PC_NAME_MANUAL_KEY, "127.0.0.1");

    expect(getPcName()).toBe("");
  });

  it("devuelve '' cuando el cache (sin manual) es inválido", () => {
    localStorage.setItem(PC_NAME_KEY, "GATEWAY");

    expect(getPcName()).toBe("");
  });

  it("ignora un manual inválido y cae a un cache válido", () => {
    localStorage.setItem(PC_NAME_MANUAL_KEY, "GATEWAY");
    localStorage.setItem(PC_NAME_KEY, "INFOSAT02");

    expect(getPcName()).toBe("INFOSAT02");
    // El manual inválido no se destruye: solo se ignora en lectura.
    expect(localStorage.getItem(PC_NAME_MANUAL_KEY)).toBe("GATEWAY");
  });
});

describe("fetchPcName", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("devuelve el hostname del SERVER aunque exista un manual válido distinto", async () => {
    // El defecto: un manual viejo/contaminado ('info') ganaba para siempre
    // porque el server (fuente autoritativa) nunca se consultaba. El manual
    // es sintácticamente válido, así que isValidPcName NO puede detectarlo:
    // lo que lo neutraliza es que el server resuelva INFOSAT01 y gane.
    localStorage.setItem(PC_NAME_MANUAL_KEY, "info");
    const fetchMock = mockClientInfo("INFOSAT01");

    await expect(fetchPcName()).resolves.toBe("INFOSAT01");

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/auth/client-info`,
      expect.objectContaining({ credentials: "include" }),
    );
    // El manual es del usuario: se ignora, pero NO se borra.
    expect(localStorage.getItem(PC_NAME_MANUAL_KEY)).toBe("info");
  });

  it("cachea en PC_NAME_KEY el valor que devolvió el server", async () => {
    const fetchMock = mockClientInfo("INFOSAT01");

    await expect(fetchPcName()).resolves.toBe("INFOSAT01");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(PC_NAME_KEY)).toBe("INFOSAT01");
  });

  it("cae al manual cuando el server falla y el manual es válido", async () => {
    localStorage.setItem(PC_NAME_MANUAL_KEY, "INFOSAT01");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchPcName()).resolves.toBe("INFOSAT01");
  });

  it("cae al manual cuando el server devuelve un hostname inválido", async () => {
    localStorage.setItem(PC_NAME_MANUAL_KEY, "INFOSAT01");
    mockClientInfo("GATEWAY");

    await expect(fetchPcName()).resolves.toBe("INFOSAT01");
    // El hostname inválido del server no queda cacheado.
    expect(localStorage.getItem(PC_NAME_KEY)).toBeNull();
  });

  it("cae al cache cuando el server falla y no hay manual", async () => {
    localStorage.setItem(PC_NAME_KEY, "INFOSAT02");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchPcName()).resolves.toBe("INFOSAT02");
  });

  it("devuelve '' si no hay server, ni manual, ni cache válidos", async () => {
    mockClientInfo("GATEWAY");

    await expect(fetchPcName()).resolves.toBe("");
    expect(localStorage.getItem(PC_NAME_KEY)).toBeNull();
  });
});
