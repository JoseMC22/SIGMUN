import {
  escapeHtml,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import type { CostaItem } from "@/actions/papeleta-transito/acciones-infraccion";

export interface DatosReporteCostas {
  codigo: string;
  nombreInfractor?: string;
  domicilio?: string;
  expediente?: string;
  anno?: string;
  periodo?: string;
  observacion?: string;
  items: CostaItem[];
  usuario?: string;
  fechaActualizacion?: string;
  fechaImpresion?: string;
  horaImpresion?: string;
}

export interface PlantillaReporteData {
  html: string;
  css: string;
}

// Convertidor básico de números a letras para Perú (Soles)
function numeroALetras(monto: number): string {
  const entero = Math.floor(monto);
  const decimales = Math.round((monto - entero) * 100);
  const decimalesStr = decimales < 10 ? `0${decimales}` : `${decimales}`;

  const unidades = [
    "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
    "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE",
    "DIECIOCHO", "DIECINUEVE", "VEINTE",
  ];

  const decenas = [
    "", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA",
  ];

  const cientos = [
    "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
    "SEISCIENTOS", "SETENCIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
  ];

  function convertir(num: number): string {
    if (num === 0) return "CERO";
    if (num === 100) return "CIEN";
    if (num <= 20) return unidades[num];
    if (num < 30) return `VEINTI${unidades[num - 20]}`;
    if (num < 100) {
      const u = num % 10;
      return `${decenas[Math.floor(num / 10)]}${u > 0 ? " Y " + unidades[u] : ""}`;
    }
    if (num < 1000) {
      const rem = num % 100;
      return `${cientos[Math.floor(num / 100)]}${rem > 0 ? " " + convertir(rem) : ""}`;
    }
    if (num < 1000000) {
      const miles = Math.floor(num / 1000);
      const rem = num % 1000;
      const strMiles = miles === 1 ? "MIL" : `${convertir(miles)} MIL`;
      return `${strMiles}${rem > 0 ? " " + convertir(rem) : ""}`;
    }
    return String(num);
  }

  const textoEntero = convertir(entero);
  return `${textoEntero} CON ${decimalesStr}/100 SOLES`;
}

export function construirHtmlReporteCostas(
  data: DatosReporteCostas,
  plantilla: PlantillaReporteData,
): string {
  const totalCostasNum = data.items.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
  const totalCostasStr = totalCostasNum.toFixed(2);
  const montoLetras = numeroALetras(totalCostasNum);

  const codigo = escapeHtml(data.codigo || "-");
  const nombreInfractor = escapeHtml(data.nombreInfractor || "-");
  const domicilio = escapeHtml(data.domicilio || "-");
  const expediente = escapeHtml(data.expediente || "-");

  let html = plantilla.html;

  html = reemplazarBloques(html, {
    codigo,
    nombreInfractor,
    domicilio,
    expediente,
    totalCostas: totalCostasStr,
    montoLetras: escapeHtml(montoLetras),
    usuario: escapeHtml(data.usuario || "SISTEMA"),
    fechaImpresion: data.fechaImpresion || new Date().toLocaleDateString("es-PE"),
    horaImpresion: data.horaImpresion || new Date().toLocaleTimeString("es-PE"),
  });

  // Inline CSS and inject a light-mode reset so the iframe never inherits
  // the host app's dark theme when html2canvas rasterizes the document.
  const lightReset = `<meta name="color-scheme" content="light"><style>
    html,body{color-scheme:light!important;background:#ffffff!important;color:#000000!important;}
  </style>`;

  return html
    .replace('<link rel="stylesheet" href="./estilos-costas.css">', `<style>${plantilla.css}</style>`)
    .replace('<meta charset="UTF-8">', `<meta charset="UTF-8">${lightReset}`);
}

export function construirConfigPdfCostas(data: DatosReporteCostas): ReportePdfConfig {
  const totalCostasNum = data.items.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);

  return {
    filename: `liquidacion-coactiva-${data.codigo || "contribuyente"}.pdf`,
    titulo: "SERVICIO DE ADMINISTRACIÓN TRIBUTARIA DE ICA - DEPARTAMENTO DE EJECUTORIA COACTIVA",
    orientacion: "portrait",
    subtitulo: [
      ["Código", data.codigo || "-"],
      ["Contribuyente", data.nombreInfractor || "-"],
      ["Expediente", data.expediente || "-"],
      ["Costas Total", `S/ ${totalCostasNum.toFixed(2)}`],
    ],
    columnas: ["Código", "Contribuyente", "Expediente", "Costas Total"],
    filas: [[
      data.codigo,
      data.nombreInfractor || "-",
      data.expediente || "-",
      totalCostasNum.toFixed(2),
    ]],
  };
}
