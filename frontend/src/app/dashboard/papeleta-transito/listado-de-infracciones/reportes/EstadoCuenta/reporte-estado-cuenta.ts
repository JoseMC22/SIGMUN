import {
  escapeHtml,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";

export interface DatosEstadoCuenta {
  codigo?: string;
  nombre?: string;
  domicilio?: string;
  nombreInfractor?: string;
  numDoc?: string;
  placa?: string;
  direccion?: string;
  propietario?: string;
  infractor?: string;
  usuario?: string;
  fechaActualizacion?: string;
  fechaImpresion?: string;
  horaImpresion?: string;
  nroLiquidacion?: string;
  items: DatoItemEstadoCuenta[];
  totalValPape?: number;
  totalDescuento?: number;
  totalDeuda?: number;
  totalInsoluto?: number;
  sinInfracciones?: boolean;
}

export interface DatoItemEstadoCuenta {
  numPapeleta: string;
  fecInfraccion: string;
  fecVencimiento: string;
  codInfraccion: string;
  placa?: string;
  tributo?: string;
  valPapeleta: number;
  descuento: number;
  insoluto: number;
  reincidencia: number;
  costas: number;
  saldoDeuda: number;
  estado: string;
  propietario?: string;
}

export interface PlantillaReporteData {
  html: string;
  css: string;
}

function generarBloquesTributo(items: DatoItemEstadoCuenta[]): string {
  if (items.length === 0) return "";

  return items
    .map((item) => {
      const papeletaNum = escapeHtml(item.numPapeleta ?? "");
      const placa = escapeHtml(item.placa ?? "");
      const fechaAplic = escapeHtml(item.fecInfraccion ?? "");
      const infraccion = escapeHtml(item.codInfraccion ?? "");
      
      const valPape = Number(item.valPapeleta || 0);
      const valDesc = Number(item.descuento || 0);
      const valInsoluto = valPape > 0 ? valPape : (item.insoluto || 0);

      const insolutoStr = valInsoluto.toFixed(2);
      const descuentoStr = valDesc > 0 ? `-${valDesc.toFixed(2)}` : valDesc.toFixed(2);
      const totalDeudaStr = (Number(item.saldoDeuda ?? (valInsoluto - valDesc))).toFixed(2);

      return `
        <div style="text-align: center; font-size: 10px; margin-top: 4px;">Tributo</div>
        <div style="text-align: center; font-size: 13px; margin-bottom: 6px;">
          Papeleta(PIT) &nbsp; <strong>${papeletaNum}</strong>
        </div>
        <table class="tabla-deudas">
          <tr>
            <td class="col-label">Placa</td>
            <td class="col-val">${placa}</td>
          </tr>
          <tr>
            <td class="col-label">Fecha Aplic.</td>
            <td class="col-val">${fechaAplic}</td>
          </tr>
          <tr>
            <td class="col-label">Infraccion</td>
            <td class="col-val">${infraccion}</td>
          </tr>
          <tr>
            <td class="col-label">Insoluto</td>
            <td class="col-val">${insolutoStr}</td>
          </tr>
          <tr>
            <td class="col-label">Descuento</td>
            <td class="col-val">${descuentoStr}</td>
          </tr>
          <tr>
            <td class="col-label">Total Deuda</td>
            <td class="col-val">${totalDeudaStr}</td>
          </tr>
        </table>
      `;
    })
    .join("\n");
}

export function construirHtmlReporteEstadoCuenta(
  data: DatosEstadoCuenta,
  plantilla: PlantillaReporteData,
): string {
  const sinInfracciones = data.sinInfracciones || data.items.length === 0;
  const totalDeuda = data.totalDeuda ?? 0;

  const codigo = escapeHtml(data.codigo ?? "-");
  const nombre = escapeHtml(data.nombre ?? data.nombreInfractor ?? data.propietario ?? "-");
  const domicilio = escapeHtml(data.domicilio ?? data.direccion ?? "-");

  const filasHtml = sinInfracciones
    ? '<div style="text-align:center; padding:10px;">NO REGISTRA INFRACCIONES PENDIENTES</div>'
    : generarBloquesTributo(data.items);

  let html = plantilla.html;

  html = reemplazarBloques(html, {
    codigo,
    nombre,
    domicilio,
    fechaActualizacion: data.fechaActualizacion || new Date().toLocaleDateString("es-PE"),
    nroLiquidacion: data.nroLiquidacion ?? "-",
    filas: filasHtml,
    totalDeuda: totalDeuda.toFixed(2),
    usuario: escapeHtml(data.usuario || "SISTEMA"),
    fechaImpresion: data.fechaImpresion || new Date().toLocaleDateString("es-PE"),
    horaImpresion: data.horaImpresion || new Date().toLocaleTimeString("es-PE"),
  });

  return html.replace(
    '<link rel="stylesheet" href="./estilos-estado-cuenta.css">',
    `<style>${plantilla.css}</style>`,
  );
}

export function construirConfigPdfEstadoCuenta(
  data: DatosEstadoCuenta,
): ReportePdfConfig {
  return {
    filename: `liquidacion-${data.codigo || "cuenta"}.pdf`,
    titulo: "Servicio de Administración Tributaria de Ica",
    orientacion: "portrait",
    subtitulo: [
      ["Código", data.codigo || "-"],
      ["Nombre", data.nombre || data.nombreInfractor || "-"],
      ["Domici.", data.domicilio || data.direccion || "-"],
      ["N° Liquidación", data.nroLiquidacion || "-"],
    ],
    columnas: ["Tributo", "Papeleta(PIT)", "Placa", "Infraccion", "Total Deuda", "Descuento", "Insoluto", "Fecha Aplic."],
    filas: data.items.map((item) => [
      String(item.tributo ?? ""),
      String(item.numPapeleta ?? ""),
      String(item.placa ?? ""),
      String(item.codInfraccion ?? ""),
      (item.valPapeleta ?? 0).toFixed(2),
      (item.descuento ?? 0).toFixed(2),
      (item.insoluto ?? 0).toFixed(2),
      String(item.fecInfraccion ?? ""),
    ]),
  };
}
