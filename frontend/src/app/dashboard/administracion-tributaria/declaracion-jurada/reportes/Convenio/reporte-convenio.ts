import {
  escapeHtml,
  llenarPlantilla,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import type { ConvenioReporteData } from "@/actions/administracion-tributaria/declaracion-jurada";
import type { PlantillaReporteData } from "@/actions/administracion-tributaria/reporte-convenio";

/**
 * Formato de montos del legacy: number_format(x, 2, ".", " ")
 * → "1 234.56" (espacio como separador de miles).
 */
function fmtMonto(n: number | string): string {
  const num = typeof n === "number" ? n : Number(String(n).replace(/[,\s]/g, ""));
  if (!Number.isFinite(num)) return String(n);
  const [entero, decimales] = num.toFixed(2).split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${conMiles}.${decimales}`;
}

/**
 * Fecha/hora actual dd/MM/yyyy HH:mm:ss (variable $V{Ahora} del jrxml).
 */
function ahora(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ─── HTML (vista previa + impresión) ──────────────────────────────

/**
 * Llena la plantilla HTML del convenio con los datos de
 * Rentas.ImprimeConvenio. Replica las expresiones condicionales del
 * JasperReport ReporteConvenio.jrxml (labels INFRACTOR/CONTRIBUYENTE,
 * bloque de propietario/representante, firma, disposiciones PIT).
 */
export function construirHtmlReporteConvenio(
  data: ConvenioReporteData,
  plantilla: PlantillaReporteData,
): string {
  const c = data.cabecera;
  // Lookup case-insensitive: el SP emite columnas con mayúsculas variables
  // (CodResp vs codResp, fev_conve vs fec_conve). JS es case-sensitive.
  const get = (k: string): string => {
    const direct = c[k];
    if (direct !== undefined) return String(direct).trim();
    const key = Object.keys(c).find((kk) => kk.toLowerCase() === k.toLowerCase());
    return key ? String(c[key]).trim() : "";
  };

  const codigo = get("codigo");
  const convenio = get("convenio");
  const codResp = get("codResp");
  const codPropVeh = get("codPropVeh");
  const esPIT = convenio.startsWith("PIT");

  // ── Labels de bloques (expresiones del jrxml) ──
  const labelBloque1 = esPIT ? "INFRACTOR" : "CONTRIBUYENTE";

  // Segundo bloque: REPRESENTANTE (apoderado) o PROPIETARIO (PIT).
  // Para contribuyente la columna real del SP es codResp/nombResp/dirResp/DocResp;
  // solo para PIT se usa CodPropVeh/nombPropVeh/dirPropVeh/DocPropVeh (vehículo).
  const tieneApoderado = codResp !== "" && codResp !== codigo;
  const bloque2Data = tieneApoderado
    ? {
        cod: codResp,
        nombre: get("nombResp"),
        dir: get("dirResp"),
        doc: get("DocResp"),
      }
    : codPropVeh !== "" && codPropVeh !== codigo
      ? {
          cod: codPropVeh,
          nombre: get("nombPropVeh"),
          dir: get("dirPropVeh"),
          doc: get("DocPropVeh"),
        }
      : null;
  const labelBloque2 = esPIT ? "PROPIETARIO" : "REPRESENTANTE";

  const bloque2 = bloque2Data
    ? `<table class="conv-datos">
            <tbody>
                <tr>
                    <td class="conv-label">${labelBloque2}:</td>
                    <td class="conv-codigo">${escapeHtml(bloque2Data.cod)}</td>
                    <td class="conv-nombre">${escapeHtml(bloque2Data.nombre)}</td>
                    <td class="conv-label">Doc.:</td>
                    <td class="conv-doc">${escapeHtml(bloque2Data.doc)}</td>
                </tr>
                <tr>
                    <td class="conv-label">Domicilio Fiscal:</td>
                    <td colspan="4">${escapeHtml(bloque2Data.dir)}</td>
                </tr>
            </tbody>
        </table>`
    : "";

  // ── Firma: apoderado si hubiese; si no, el contribuyente mismo ──
  const firmaNombre = tieneApoderado ? get("nombResp") : get("nombres");
  const identificacion = tieneApoderado
    ? get("DocResp")
    : get("Documento");

  const docTipo = identificacion.length > 8 ? "RUC" : "DNI";
  const rol = tieneApoderado
    ? "Apoderado"
    : esPIT
      ? "Infractor"
      : "Contribuyente";
  const firmaDoc = `${docTipo} ${identificacion} (${rol})`;

  // ── Disposiciones complementarias (solo reportes PIT: convenio inicia "PIT") ──
  const disposiciones = esPIT
    ? `<div class="conv-dispos">
            <p class="conv-dispos-titulo">DISPOSICIONES COMPLEMENTARIAS</p>
            <p class="conv-dispos-p">El presente convenio de fraccionamiento deberá tener en cuenta lo Siguiente:</p>
            <p class="conv-dispos-p">1.- Se efectúa a petición y acogimiento del interesado. Por lo tanto su voluntad implica automáticamente el reconocimiento de la obligación pendiente de pago, por lo que no podrá interponer cualquier acto de impugnación o desistimiento de la pretensión que pueda realizar sobre la obligación ya fraccionada. Siendo nulo todo acto posterior al convenio celebrado.</p>
            <p class="conv-dispos-p">2.- No tiene validez para el retiro del vehículo del depósito municipal hasta la cancelación total del convenio de fraccionamiento, de acuerdo a lo señalado en el art. 301° del reglamento de tránsito "D.S.N° 016-2009-MTC", en donde señala que se deberá realizar la cancelación total de la infracción para poder retirar el vehículo del depósito municipal más los derechos de permanencia.</p>
        </div>`
    : "";

  // ── Filas de detalle ──
  const filasDeuda =
    data.deuda.length > 0
      ? data.deuda
          .map(
            (d) => `        <tr>
                    <td>${escapeHtml(d.anno)}</td>
                    <td>${escapeHtml(d.concepto)}</td>
                    <td>${escapeHtml(d.detalle)}</td>
                    <td>${escapeHtml(d.predio)}</td>
                    <td>${escapeHtml(d.periodos)}</td>
                    <td class="td-monto">${fmtMonto(d.monto)}</td>
                </tr>`,
          )
          .join("\n")
      : `        <tr><td colspan="6" style="text-align:center">Sin deuda.</td></tr>`;

  const filasCuotas =
    data.cuotas.length > 0
      ? data.cuotas
          .map(
            (q) => `        <tr>
                    <td>${escapeHtml(q.cuota)}</td>
                    <td>${escapeHtml(q.fecVenc)}</td>
                    <td>${fmtMonto(q.amort)}</td>
                    <td>${fmtMonto(q.interes)}</td>
                    <td class="td-monto">${fmtMonto(q.total)}</td>
                    <td>${escapeHtml(q.observacion)}</td>
                </tr>`,
          )
          .join("\n")
      : `        <tr><td colspan="6" style="text-align:center">Sin cuotas.</td></tr>`;

  const funcionario =
    get("NombFunc") !== ""
      ? `${get("NombFunc")}${get("Funcionario") ? ` (${get("Funcionario")})` : ""}`
      : get("operador");

  const conFilas = reemplazarBloques(plantilla.html, {
    filasDeuda,
    filasCuotas,
    bloque2,
    disposiciones,
  });

  const conValores = llenarPlantilla(conFilas, {
    logoUrl: "/logo_sat_2026.jpeg",
    convenio,
    fecConve: get("fev_conve") || get("fec_conve"),
    labelBloque1,
    codigo,
    documento: get("Documento"),
    nombres: get("nombres"),
    dirfiscal: get("dirfiscal"),
    tipoDeuda: get("TipoDeuda"),
    deudaIni: fmtMonto(get("deuda_ini")),
    montoLetra: get("montoletra"),
    numCuotas: get("num_cuotas") || String(data.cuotas.length),
    firmaNombre,
    firmaDoc,
    funcionario,
    ahora: ahora(),
    totalDeuda: fmtMonto(data.totalDeuda),
    totalCuotas: fmtMonto(data.totalCuotas),
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-convenio.css">',
    `<style>${plantilla.css}</style>`,
  );
}

// ─── PDF (Guardar en la PC) ───────────────────────────────────────

/** Construye la configuración del PDF descargable del convenio. */
export function construirConfigPdfConvenio(
  data: ConvenioReporteData,
): ReportePdfConfig {
  const c = data.cabecera;
  return {
    filename: `convenio-${(c.convenio ?? "").trim() || (c.codigo ?? "").trim()}.pdf`,
    titulo: `Convenio de Fraccionamiento N° ${(c.convenio ?? "").trim()}`,
    orientacion: "portrait",
    subtitulo: [
      ["Código", (c.codigo ?? "").trim()],
      ["Nombre", (c.nombres ?? "").trim()],
      ["Documento", (c.Documento ?? "").trim()],
      ["Fecha Convenio", (c.fec_conve ?? "").trim()],
    ],
    columnas: ["Cuota", "Año", "Fec. Venc.", "Amort.", "Interés", "Total"],
    filas: data.cuotas.map((q) => [
      q.cuota,
      q.anio,
      q.fecVenc,
      fmtMonto(q.amort),
      fmtMonto(q.interes),
      fmtMonto(q.total),
    ]),
  };
}
