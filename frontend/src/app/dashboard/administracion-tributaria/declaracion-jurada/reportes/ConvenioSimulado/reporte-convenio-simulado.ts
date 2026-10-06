import {
  escapeHtml,
  llenarPlantilla,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import type { SimuladoConvenioData } from "@/actions/administracion-tributaria/declaracion-jurada";
import type { PlantillaReporteData } from "@/actions/administracion-tributaria/reporte-convenio-simulado";
import { toNum } from "@/lib/num";

/**
 * Formato de montos del legacy: number_format(x, 2, ".", " ")
 * → "1 234.56" (espacio como separador de miles).
 */
function fmtMonto(n: number): string {
  const [entero, decimales] = toNum(n).toFixed(2).split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${conMiles}.${decimales}`;
}

// ─── HTML (vista previa + impresión) ──────────────────────────────

/**
 * Llena la plantilla HTML del simulado de convenio con los datos del
 * backend (GeneraConvenio_simulado_deuda / _cuotas). Inyecta el CSS
 * inline (el <link> relativo no resuelve dentro del modal).
 */
export function construirHtmlReporteConvenioSimulado(
  data: SimuladoConvenioData,
  plantilla: PlantillaReporteData,
): string {
  const filasDeuda =
    data.deuda.length > 0
      ? data.deuda
          .map(
            (d) => `        <tr>
                    <td class="col-azul">${escapeHtml(d.anno)}</td>
                    <td class="col-azul">${escapeHtml(d.concepto)}</td>
                    <td class="col-azul">${escapeHtml(d.detalle)}</td>
                    <td class="col-azul">${escapeHtml(d.predio)}</td>
                    <td class="col-azul">${escapeHtml(d.periodos)}</td>
                    <td class="td-monto">${fmtMonto(d.monto)}</td>
                </tr>`,
          )
          .join("\n")
      : `        <tr><td colspan="6" style="text-align:center">Sin deuda.</td></tr>`;

  const filasCuotas =
    data.cuotas.length > 0
      ? data.cuotas
          .map(
            (c) => `        <tr>
                    <td class="col-azul-bold">${escapeHtml(c.cuota)}</td>
                    <td class="col-azul">${escapeHtml(c.anio)}</td>
                    <td class="col-azul">${escapeHtml(c.fecVenc)}</td>
                    <td>${fmtMonto(c.amort)}</td>
                    <td>${fmtMonto(c.interes)}</td>
                    <td class="td-monto">${fmtMonto(c.total)}</td>
                </tr>`,
          )
          .join("\n")
      : `        <tr><td colspan="6" style="text-align:center">Sin cuotas.</td></tr>`;

  const conFilas = reemplazarBloques(plantilla.html, {
    filasDeuda,
    filasCuotas,
  });

  const conValores = llenarPlantilla(conFilas, {
    nombreContri: data.contribuyente.nombre,
    domicilio: data.contribuyente.domicilio,
    codigo: data.contribuyente.codigo,
    documento: data.contribuyente.documento,
    responsable: data.responsable.nombre,
    docResponsable: data.responsable.documento,
    montoDeuda: fmtMonto(data.montoDeuda),
    numCuotas: String(data.numeroCuotas),
    fecha: data.fecha,
    usuario: data.usuario,
    totalDeuda: fmtMonto(data.totalDeuda),
    totalCuotas: fmtMonto(data.totalCuotas),
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-convenio-simulado.css">',
    `<style>${plantilla.css}</style>`,
  );
}

// ─── PDF (Guardar en la PC) ───────────────────────────────────────

/** Construye la configuración del PDF descargable del simulado. */
export function construirConfigPdfConvenioSimulado(
  data: SimuladoConvenioData,
): ReportePdfConfig {
  return {
    filename: `simulado-convenio-${data.contribuyente.codigo}.pdf`,
    titulo: "Simulación de Convenio de Fraccionamiento",
    orientacion: "portrait",
    subtitulo: [
      ["Código", data.contribuyente.codigo],
      ["Nombre", data.contribuyente.nombre],
      ["Documento", data.contribuyente.documento],
      ["Monto Deuda", fmtMonto(data.montoDeuda)],
      ["Cuotas", String(data.numeroCuotas)],
      ["Fecha", data.fecha],
      ["Usuario", data.usuario],
    ],
    columnas: ["Cuota", "Año", "Fec. Venc.", "Amort.", "Interés", "Total"],
    filas: data.cuotas.map((c) => [
      c.cuota,
      c.anio,
      c.fecVenc,
      fmtMonto(c.amort),
      fmtMonto(c.interes),
      fmtMonto(c.total),
    ]),
  };
}
