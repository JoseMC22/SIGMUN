// Utilidades para abrir en el navegador un PDF que llega como base64.
//
// Este flujo (decode -> Blob -> object URL -> window.open) vivía inline en
// generar-op-modal.tsx; se aisló acá para que consulta-valores pueda abrir la
// Orden de Pago de una fila sin duplicar el código cliente.

/**
 * Decodifica un PDF en base64 y lo envuelve en un Blob.
 * Pura: no toca el DOM ni el navegador.
 */
export function base64ToPdfBlob(base64: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array<number>(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], {
    type: "application/pdf",
  });
}

/**
 * Abre el PDF en una pestaña nueva.
 *
 * El object URL se revoca diferido: la pestaña nueva carga el blob de forma
 * asincrónica y revocarlo en el acto cortaría la carga del documento.
 */
export function abrirPdfBase64(base64: string): void {
  const blobUrl = URL.createObjectURL(base64ToPdfBlob(base64));
  window.open(blobUrl, "_blank");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
