import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { base64ToPdfBlob, abrirPdfBase64 } from "./op-pdf";

// "%PDF" (la firma de todo PDF) codificada a mano para no depender de btoa:
// [37, 80, 68, 70] -> "JVBERg==".
const BASE64_PDF = "JVBERg==";
const BYTES_PDF = [37, 80, 68, 70];

// "PDF" sin padding (3 bytes exactos -> 4 chars) para ejercitar el decode
// cuando el base64 no termina en "=".
const BASE64_SIN_PADDING = "UERG";
const BYTES_SIN_PADDING = [80, 68, 70];

// El Blob de jsdom no implementa arrayBuffer(): se lee con FileReader, que
// sí está disponible en el entorno de test.
function leerBlob(blob: Blob): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe("base64ToPdfBlob", () => {
  it("decodifica el base64 en un Blob con el contenido original", async () => {
    const blob = base64ToPdfBlob(BASE64_PDF);

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBe(BYTES_PDF.length);
    expect(await leerBlob(blob)).toEqual(BYTES_PDF);
  });

  it("decodifica cadenas base64 sin padding byte a byte", async () => {
    const blob = base64ToPdfBlob(BASE64_SIN_PADDING);

    expect(blob.type).toBe("application/pdf");
    expect(await leerBlob(blob)).toEqual(BYTES_SIN_PADDING);
  });
});

describe("abrirPdfBase64", () => {
  let createObjectURL: Mock;
  let revokeObjectURL: Mock;
  let windowOpen: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn(() => "blob:op-pdf-test");
    revokeObjectURL = vi.fn();
    windowOpen = vi.fn();

    // jsdom no implementa URL.createObjectURL ni window.open: se stubbean
    // para observar el flujo blob -> object URL -> pestaña nueva.
    URL.createObjectURL =
      createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL =
      revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    window.open = windowOpen as unknown as typeof window.open;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("abre el object URL del blob en una pestaña nueva", () => {
    abrirPdfBase64(BASE64_PDF);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("application/pdf");

    expect(windowOpen).toHaveBeenCalledTimes(1);
    expect(windowOpen).toHaveBeenCalledWith("blob:op-pdf-test", "_blank");
  });

  it("revoca el object URL recien despues del delay de carga", () => {
    abrirPdfBase64(BASE64_PDF);

    // La pestaña nueva carga el blob de forma async: revocar en el acto
    // cortaria la descarga del documento.
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:op-pdf-test");
  });
});
