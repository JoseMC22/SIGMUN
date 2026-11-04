import { generatePdf } from 'html-pdf-node';
import { join } from 'path';
import { loadLogoDataUri } from '../../alcabala/impresion-dj-alcabala/declaracion-pdf-generator';
import { CertificadoImpresionRow } from './certificado-no-adeudo.types';

/**
 * Generador del PDF del Certificado de No Adeudo.
 *
 * Reproduce `Z:\public\reportes\rpt_CertificadoNoAdeudo-qr.jrxml` (JasperReports
 * A4, 595x842 pt, margenes 60/60/20/20 pt). El codigo del QR legacy exigia
 * portar `encriptar.TextoEncryptor` (clase Java con una clave embebida que no
 * esta en el repositorio y no se transcribe aca), que queda fuera del alcance
 * de esta tarea.
 *
 * El SP `Certificado.sp_Imprime_Certificado @busc=2` devuelve una fila por
 * predio, repitiendo la cabecera: la primera fila da el encabezado y todas
 * aportan un predio.
 */
export interface CertificadoPdfOptions {
  logoDataUri: string | null;
  escudoDataUri: string | null;
  /** SVG inline del QR de verificacion; `null` deja el certificado sin QR. */
  qrSvg: string | null;
}

/**
 * Escapa un valor de la DB antes de interpolarlo en el HTML. Un `observacion`
 * con `<`, `>`, `&`, `"` o `'` romperia el documento.
 */
export function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Predios unicos y no vacios, en el orden en que los devuelve el SP. */
function prediosUnicos(rows: CertificadoImpresionRow[]): string[] {
  const vistos = new Set<string>();
  const predios: string[] = [];
  for (const row of rows) {
    const predio = row.predios.trim();
    if (!predio || vistos.has(predio)) continue;
    vistos.add(predio);
    predios.push(predio);
  }
  return predios;
}

function buildStyles(): string {
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #000;
    }
    .doc {
      min-height: 272mm;
      display: flex;
      flex-direction: column;
    }
    .cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .logo { height: 60pt; }
    .escudo { height: 70pt; }
    .municipalidad {
      font-size: 9pt;
      text-align: center;
      margin-top: 4pt;
      max-width: 100pt;
    }
    h1 {
      margin: 8pt 0 0;
      font-size: 20pt;
      font-weight: bold;
      text-align: center;
    }
    .numero {
      margin: 6pt 0 0;
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
      text-align: center;
    }
    .fecha {
      margin: 10pt 0 0;
      text-align: right;
      font-weight: bold;
    }
    .cuerpo {
      margin: 16pt 0 0;
      text-align: justify;
      line-height: 1.45;
    }
    .predios {
      width: 100%;
      margin-top: 14pt;
      border-collapse: collapse;
    }
    .predios td {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 3pt 2pt;
      font-size: 10pt;
      text-align: center;
    }
    .recibo {
      margin: 8pt 0 0;
      text-align: center;
      font-weight: bold;
      text-decoration: underline;
    }
    .solicitud {
      margin: 22pt 0 0;
      font-size: 10pt;
    }
    .firma {
      margin-top: 18pt;
      width: 240pt;
    }
    .firma .linea {
      border-top: 1px solid #000;
      height: 1px;
    }
    .firma .nombre {
      margin: 4pt 0 0;
      text-align: center;
      font-weight: bold;
    }
    .firma .conyuge {
      margin: 2pt 0 0;
      text-align: center;
      font-size: 10pt;
    }
    .firma-fila {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .firma-fila .firma {
      margin-top: 0;
    }
    .qr svg {
      width: 140pt;
      height: 140pt;
      display: block;
    }
    .pie {
      margin-top: auto;
      padding-top: 10pt;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
    }
  `;
}

/** Construye el HTML A4 del certificado a partir de las filas del SP. */
export function buildCertificadoPdfHtml(
  rows: CertificadoImpresionRow[],
  opts: CertificadoPdfOptions,
): string {
  if (rows.length === 0) {
    throw new Error('Sin filas para generar el certificado');
  }

  const cab = rows[0];
  const predios = prediosUnicos(rows);
  const logo = opts.logoDataUri
    ? `<img class="logo" src="${esc(opts.logoDataUri)}" alt="logo" />`
    : '';
  const escudo = opts.escudoDataUri
    ? `<img class="escudo" src="${esc(opts.escudoDataUri)}" alt="escudo" />`
    : '';
  const municipio =
    '<div class="municipalidad">Municipalidad Provincial de Ica</div>';
  const numero = `N° ${cab.certNro}-${cab.certAnio}-DC-SGO-G/SAT ICA`;
  const conceptos = [cab.concepto, cab.periodo, cab.anioHr, cab.observacion]
    .map((parte) => parte.trim())
    .filter(Boolean)
    .join(' ');

  const filasPredios = predios
    .map((predio) => `<tr><td>${esc(predio)}</td></tr>`)
    .join('');
  const tablaPredios = filasPredios
    ? `<table class="predios"><tbody>${filasPredios}</tbody></table>`
    : '';

  const recibo = cab.numIngr.trim()
    ? `<p class="recibo">RECIBO DE PAGO N° ${esc(cab.numIngr)}</p>`
    : '';
  const conyuge = cab.conyuge.trim()
    ? `<p class="conyuge">Conyuge ${esc(cab.conyuge)}</p>`
    : '';
  const qr = opts.qrSvg ? `<div class="qr">${opts.qrSvg}</div>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><style>${buildStyles()}</style></head>
<body>
  <div class="doc">
    <div class="cabecera">
      <div>${logo}</div>
      <div>${escudo}${municipio}</div>
    </div>
    <h1>CERTIFICADO DE NO ADEUDO</h1>
    <p class="numero">${esc(numero)}</p>
    <p class="fecha">Ica, ${esc(cab.fecha)}</p>
    <p class="cuerpo">
      El que suscribe, El Jefe del Departamento de Cobranza del Servicio de
      Administracion Tributaria de la Municipalidad provincial de ICA, Certifica:
    </p>
    <p class="cuerpo">
      Que, el Contribuyente <b>${esc(cab.nombre)}</b> Identificado con Codigo de
      Contribuyente <b>N° ${esc(cab.codigo)}</b>, luego de la revision en nuestra
      Base de Datos, <b>NO REGISTRA DEUDA</b> por concepto de
      ${esc(conceptos)}; segun lo establecido en el Decreto Legislativo N° 776 -
      Ley de Tributacion Municipal; por el(los) predio(s) que a continuacion se
      detalla(n):
    </p>
    ${tablaPredios}
    ${recibo}
    <p class="solicitud">Se extiende el presente certificado a solicitud del contribuyente.</p>
    <div class="firma-fila">
      <div class="firma">
        <div class="linea"></div>
        <p class="nombre">${esc(cab.nombre)}</p>
        ${conyuge}
      </div>
      ${qr}
    </div>
    <div class="pie">
      <span>${esc(cab.usuReg)}</span>
      <span>${esc(cab.estacionReg)}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Genera el PDF A4 del certificado. Los margenes van como opciones de puppeteer
 * (no como CSS `@page`) porque la opcion pisa al `@page`.
 */
export async function generateCertificadoPdf(
  rows: CertificadoImpresionRow[],
  opts: CertificadoPdfOptions,
): Promise<Buffer> {
  return generatePdf(
    { content: buildCertificadoPdfHtml(rows, opts) },
    {
      format: 'A4',
      margin: { top: '7mm', right: '21mm', bottom: '7mm', left: '21mm' },
      printBackground: true,
    },
  );
}

/**
 * Logo y escudo del reporte. `REPORT_IMG_RUTA` es la ruta de imagenes de
 * reportes; si no esta, se cae al logo publico del frontend. Ambos son
 * opcionales: el PDF se genera igual, sin imagen.
 */
export async function resolveCertificadoImagenes(): Promise<{
  logoDataUri: string | null;
  escudoDataUri: string | null;
}> {
  const reportImgRuta = process.env.REPORT_IMG_RUTA;

  const logoDesdeReporte = reportImgRuta
    ? await loadLogoDataUri(join(reportImgRuta, 'logo.png'))
    : null;
  const logoFrontend = await loadLogoDataUri(
    join(process.cwd(), '..', 'frontend', 'public', 'logo_sat_2026.jpeg'),
  );
  const escudoDataUri = reportImgRuta
    ? await loadLogoDataUri(join(reportImgRuta, 'escudo_ica.jpg'))
    : null;

  return { logoDataUri: logoDesdeReporte ?? logoFrontend, escudoDataUri };
}
