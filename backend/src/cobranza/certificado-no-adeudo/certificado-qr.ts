import { Logger } from '@nestjs/common';
import { toString as qrToString } from 'qrcode';
import {
  CertificadoQrConfig,
  resolveCertificadoQrConfig,
} from './certificado-qr.config';

export type { CertificadoQrConfig } from './certificado-qr.config';

/**
 * QR del Certificado de No Adeudo.
 *
 * El QR codifica la URL del servidor de reportes JasperReports que regenera
 * el PDF oficial, con la estructura que usaba el legacy:
 *
 *     <baseUrl>?tipo=pdf2&nombrereporte=rpt_CertificadoNoAdeudo-qr
 *       &param=codigo^<codigo>|cert_nro^<certNro>|cert_anio^<certAnio>
 *
 * El reporte se reconstruye server-side al consultar esa URL. Los parametros
 * `usuario` y `fecha` que declara `rpt_CertificadoNoAdeudo-qr.jrxml` no se
 * referencian en el reporte y el servidor los ignora: no forman parte del QR.
 */

/** Tipo de salida que pide el QR al servidor de reportes. */
const QR_TIPO_REPORTE = 'pdf2';

/** Reporte Jasper que regenera el PDF oficial del certificado. */
const QR_NOMBRE_REPORTE = 'rpt_CertificadoNoAdeudo-qr';

const logger = new Logger('CertificadoQr');

export interface CertificadoQrPayload {
  codigo: string;
  certNro: string | number;
  certAnio: string;
}

/**
 * URL del servidor de reportes que codifica el QR: al consultarla, Jasper
 * regenera el PDF oficial del certificado.
 */
export function buildCertificadoQrUrl(
  payload: CertificadoQrPayload,
  config: CertificadoQrConfig,
): string {
  const url = new URL(config.baseUrl);
  url.searchParams.set('tipo', QR_TIPO_REPORTE);
  url.searchParams.set('nombrereporte', QR_NOMBRE_REPORTE);
  url.searchParams.set(
    'param',
    `codigo^${payload.codigo}|cert_nro^${payload.certNro}|cert_anio^${payload.certAnio}`,
  );
  return url.toString();
}

/** SVG del QR (se embebe inline en el HTML del PDF, sin imagenes externas). */
export async function buildCertificadoQrSvg(url: string): Promise<string> {
  return qrToString(url, {
    type: 'svg',
    margin: 2,
    width: 160,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Problemas de configuracion ya reportados. La emision de certificados puede
 * ser frecuente y el mismo error se repetiria en cada PDF: se informa una vez
 * por proceso, no una vez por emision.
 */
const reportedConfigErrors = new Set<string>();

/**
 * QR listo para el PDF, o `null` si falta configuracion o falla la generacion.
 * El certificado se emite igual sin QR (mismo criterio que el logo).
 */
export async function resolveCertificadoQr(
  payload: CertificadoQrPayload,
): Promise<string | null> {
  const resolved = resolveCertificadoQrConfig();
  if (!resolved.ok) {
    // Sin QR el documento sale sin verificacion: el fallo no puede ser mudo.
    if (!reportedConfigErrors.has(resolved.error)) {
      reportedConfigErrors.add(resolved.error);
      logger.warn(
        `El certificado se emite sin QR por una configuracion invalida: ${resolved.error}`,
      );
    }
    return null;
  }

  try {
    return await buildCertificadoQrSvg(
      buildCertificadoQrUrl(payload, resolved.config),
    );
  } catch (error) {
    // El certificado se emite igual sin QR, pero el fallo no puede ser mudo:
    // sin QR el documento sale sin verificacion.
    logger.warn(
      `No se pudo generar el QR del certificado: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
