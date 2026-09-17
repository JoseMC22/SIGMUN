import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchPruebasAction } from "./listado-pruebas";

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: "test-auth-token" })),
  })),
}));

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function errResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("searchPruebasAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs filters + page + pageSize and returns { success: true, ...result } on 200", async () => {
    const result = {
      data: [{ placa: "ABC-123", estado: "PENDIENTE" }],
      total: 1,
      page: 1,
      pageSize: 15,
      totalPages: 1,
    };
    global.fetch = vi.fn().mockResolvedValue(okResponse(result));

    const filters = { placa: "ABC-123", anioInfraccion: "2026" };
    const out = await searchPruebasAction(filters, 1, 15);

    expect(out).toEqual({ success: true, ...result });
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/papeleta-transito/listado-pruebas/search");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      placa: "ABC-123",
      anioInfraccion: "2026",
      page: 1,
      pageSize: 15,
    });
  });

  it("uses default page=1 and pageSize=15 when not provided", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ data: [], total: 0 }));

    await searchPruebasAction({});

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({ page: 1, pageSize: 15 });
  });

  it("sends the SIGMUN_AUTH cookie as header", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ data: [], total: 0 }));

    await searchPruebasAction({});

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Cookie).toBe("SIGMUN_AUTH=test-auth-token");
  });

  it("returns { success: false, error } when the endpoint responds non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      errResponse(500, { message: "SP error" }),
    );

    const out = await searchPruebasAction({});

    expect(out.success).toBe(false);
    expect(out.error).toBe("SP error");
  });

  it("returns { success: false, error } when the fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const out = await searchPruebasAction({});

    expect(out).toEqual({ success: false, error: "Network failure" });
  });
});