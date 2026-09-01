import {
  escapeHtml,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";

export interface ItemRecordPendiente {
  papeleta: string;
  placa: string;
  infraccion: string;
  fecha: string;
  propietario: string;
  valor: number;
  descuento: number;
  montoFinal: number;
  estado: string;
}

export interface DatosRecordPendiente {
  codigo: string;
  infractor: string;
  items: ItemRecordPendiente[];
  totalDescuento: number;
  totalCostas: number;
  totalImporte: number;
  usuario?: string;
  fechaActual?: string;
}

export interface PlantillaReporteData {
  html: string;
  css: string;
}

function generarFilasRecord(items: ItemRecordPendiente[]): string {
  if (items.length === 0) {
    return '<tr><td colspan="4" style="text-align:center; padding:15px;">NO REGISTRA PAPELETAS PENDIENTES</td></tr>';
  }

  return items
    .map((item) => {
      const papeleta = escapeHtml(item.papeleta || "-");
      const placa = escapeHtml(item.placa || "-");
      const infraccion = escapeHtml(item.infraccion || "-");
      const fecha = escapeHtml(item.fecha || "-");
      const propietario = escapeHtml(item.propietario || "-");
      const estado = escapeHtml(item.estado || "PENDIENTE");

      const valorStr = item.infraccion === "M.40" ? "" : item.valor.toFixed(2);
      const montoFinalStr = item.infraccion === "M.40" ? "" : item.montoFinal.toFixed(2);

      return `
        <tr class="fila-principal">
          <td><strong>${papeleta}</strong></td>
          <td>${placa}</td>
          <td>${infraccion}<br>${valorStr}</td>
          <td>${fecha}<br>${montoFinalStr}</td>
        </tr>
        <tr class="fila-secundaria">
          <td colspan="4">
            <span style="font-weight:bold;">${estado}</span><br>
            <span style="color:#555;">Propietario:</span> ${propietario}
          </td>
        </tr>
        <tr><td colspan="4"><hr style="border:none; border-top:1px solid #ddd; margin:4px 0;"></td></tr>
      `;
    })
    .join("\n");
}

export function construirHtmlReporteRecord(
  data: DatosRecordPendiente,
  plantilla: PlantillaReporteData,
): string {
  const ahora = new Date();
  const fechaHoy = ahora.toLocaleDateString("es-PE");
  const horaHoy = ahora.toLocaleTimeString("es-PE");

  const filasHtml = generarFilasRecord(data.items);

  let html = plantilla.html;

  html = reemplazarBloques(html, {
    codigo: escapeHtml(data.codigo || "-"),
    infractor: escapeHtml(data.infractor || "-"),
    fechaHoy,
    horaHoy,
    filas: filasHtml,
    totalDescuento: (data.totalDescuento || 0).toFixed(2),
    totalCostas: (data.totalCostas || 0).toFixed(2),
    totalImporte: (data.totalImporte || 0).toFixed(2),
    fechaActual: data.fechaActual || `${fechaHoy} ${horaHoy}`,
    usuario: escapeHtml(data.usuario || "SISTEMA"),
  });

  return html.replace(
    '<link rel="stylesheet" href="./estilos-record.css">',
    `<style>${plantilla.css}</style>`,
  );
}

export function construirConfigPdfRecord(
  data: DatosRecordPendiente,
): ReportePdfConfig {
  return {
    filename: `record-${data.codigo || "infractor"}.pdf`,
    titulo: "SAT - ICA | RECORD DE PAPELETA DEL INFRACTOR",
    orientacion: "portrait",
    subtitulo: [
      ["Código", data.codigo || "-"],
      ["Infractor", data.infractor || "-"],
    ],
    columnas: ["Papeleta", "Placa", "Infracción", "Fecha Infr.", "Deuda", "Deuda-Dscto"],
    filas: data.items.map((i) => [
      i.papeleta,
      i.placa,
      i.infraccion,
      i.fecha,
      i.valor.toFixed(2),
      i.montoFinal.toFixed(2),
    ]),
  };
}
