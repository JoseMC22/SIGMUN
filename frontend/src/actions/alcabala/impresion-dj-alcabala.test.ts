import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOpPdfBase64Action,
  getDeclaracionHtmlAction,
} from "./impresion-dj-alcabala";

// Mock next/headers so the server action can run under Vitest (jsdom).
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: "test-auth-token" })),
  })),
}));

const pdfBytes = new Uint8Array([1, 2, 3, 4, 5]);
const expectedBase64 = Buffer.from(pdfBytes).toString("base64");

describe("getOpPdfBase64Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a base64 string when the endpoint responds 200 with a PDF body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(pdfBytes.buffer),
    });

    const result = await getOpPdfBase64Action(11772);

    expect(result).toBe(expectedBase64);
    const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(callUrl).toContain("/alcabala/impresion-dj-alcabala/op-pdf/11772");
  });

  it("returns null when the endpoint responds 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });

    const result = await getOpPdfBase64Action(999999);

    expect(result).toBeNull();
  });

  it("returns null when the fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const result = await getOpPdfBase64Action(11772);

    expect(result).toBeNull();
  });
});

describe("getDeclaracionHtmlAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the HTML string when the endpoint responds 200", async () => {
    const declaracionHtml = "<html><body>Declaración de Alcabala</body></html>";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(declaracionHtml),
    });

    const result = await getDeclaracionHtmlAction(11772);

    expect(result).toBe(declaracionHtml);
    const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(callUrl).toContain("/alcabala/impresion-dj-alcabala/declaracion-pdf/11772");
  });

  it("returns null when the endpoint responds 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockRejectedValue(new Error("Not found")),
    });

    const result = await getDeclaracionHtmlAction(999999);

    expect(result).toBeNull();
  });

  it("returns null when the fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const result = await getDeclaracionHtmlAction(11772);

    expect(result).toBeNull();
  });
});
