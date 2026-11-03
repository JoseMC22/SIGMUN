import { Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { toString as qrToString } from 'qrcode';
import {
  CertificadoQrConfig,
  resolveCertificadoQrConfig,
} from './certificado-qr.config';

export type { CertificadoQrConfig } from './certificado-qr.config';

/**
 * QR del Certificado de No Adeudo.
 *
 * El reporte legacy (`rpt_CertificadoNoAdeudo-qr.jrxml`) codificaba
 * `https://satica.gob.pe/documentos?codigo=<token>` con
 * `encriptar.TextoEncryptor.encrypt(codigo + "/" + cert_nro + "-" + cert_anio,
 * <clave del legacy>)`, una clase Java que vive en el classpath del servidor de
 * reportes y no esta en el repositorio legacy. La clave no se transcribe aca.
 *
 * No se replica ese cifrado por dos motivos: la clase no esta disponible y
 * `satica.gob.pe/documentos` sirve la web institucional de gob.pe, no un
 * verificador, asi que no hay consumidor que exija ese formato.
 *
 * En su lugar el token es verificable por el propio sistema:
 *
 *     v1.<base64url(payload)>.<base64url(hmac-sha256(payload, secreto))>
 *
 * con `payload = "<codigo>/<certNro>-<certAnio>"`. El consumidor es la ruta
 * publica `GET /api/publico/certificado-no-adeudo/pdf?codigo=<token>`
 * (`certificado-publico.controller.ts`): valida el token con
 * `verifyCertificadoQrToken` y sirve el PDF.
 */

const QR_VERSION = 'v1';

/** Mismo payload canonico que usaba el legacy: `codigo/certNro-certAnio`. */
const QR_PAYLOAD_PATTERN = /^(\d{7})\/(\d+)-(\d{4})$/;

/** Un segmento base64url valido (sin `=`, sin `+` ni `/`). */
const QR_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;

const logger = new Logger('CertificadoQr');

export interface CertificadoQrPayload {
  codigo: string;
  certNro: string | number;
  certAnio: string;
}

/** Payload canonico, con la misma forma que usaba el legacy. */
export function buildCertificadoQrPayload(
  payload: CertificadoQrPayload,
): string {
  return `${payload.codigo}/${payload.certNro}-${payload.certAnio}`;
}

/** Token firmado que viaja en el parametro `codigo` de la URL. */
export function buildCertificadoQrToken(
  payload: CertificadoQrPayload,
  secret: string,
): string {
  const datos = buildCertificadoQrPayload(payload);
  const cuerpo = Buffer.from(datos, 'utf8').toString('base64url');
  const firma = createHmac('sha256', secret)
    .update(datos, 'utf8')
    .digest('base64url');
  return `${QR_VERSION}.${cuerpo}.${firma}`;
}

/** URL de verificacion que codifica el QR. */
export function buildCertificadoQrUrl(
  payload: CertificadoQrPayload,
  config: CertificadoQrConfig,
): string {
  const url = new URL(config.baseUrl);
  url.searchParams.set(
    'codigo',
    buildCertificadoQrToken(payload, config.secret),
  );
  return url.toString();
}

/**
 * Valida el token que llega desde el QR y devuelve el payload canonico.
 *
 * El token viene de afuera: se compara la firma en tiempo constante y se
 * rechaza cualquier forma que no sea exactamente `v1.<payload>.<firma>`. Un
 * token invalido y un payload mal formado devuelven lo mismo (`null`) para no
 * dar pistas sobre que fallo.
 */
export function verifyCertificadoQrToken(
  token: string,
  secret: string,
): CertificadoQrPayload | null {
  if (!token || !secret) return null;

  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const [version, cuerpo, firma] = partes;
  if (version !== QR_VERSION) return null;
  if (!cuerpo || !firma) return null;
  if (!QR_SEGMENT_PATTERN.test(cuerpo) || !QR_SEGMENT_PATTERN.test(firma)) {
    return null;
  }

  const datos = Buffer.from(cuerpo, 'base64url').toString('utf8');
  const esperada = Buffer.from(
    createHmac('sha256', secret).update(datos, 'utf8').digest('base64url'),
    'utf8',
  );
  const recibida = Buffer.from(firma, 'utf8');
  if (esperada.length !== recibida.length) return null;
  if (!timingSafeEqual(esperada, recibida)) return null;

  const match = QR_PAYLOAD_PATTERN.exec(datos);
  if (!match) return null;

  return {
    codigo: match[1],
    certNro: Number(match[2]),
    certAnio: match[3],
  };
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
