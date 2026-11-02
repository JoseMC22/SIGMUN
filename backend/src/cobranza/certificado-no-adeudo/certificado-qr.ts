import { createHmac } from 'crypto';
import { toString as qrToString } from 'qrcode';

/**
 * QR del Certificado de No Adeudo.
 *
 * El reporte legacy (`rpt_CertificadoNoAdeudo-qr.jrxml`) codificaba
 * `https://satica.gob.pe/documentos?codigo=<token>` con
 * `encriptar.TextoEncryptor.encrypt(codigo + "/" + cert_nro + "-" + cert_anio,
 * "S4T1C4CN0")`, una clase Java que vive en el classpath del servidor de
 * reportes y no esta en el repositorio legacy.
 *
 * No se replica ese cifrado por dos motivos: la clase no esta disponible y
 * `satica.gob.pe/documentos` hoy sirve la web institucional de gob.pe, no un
 * verificador, asi que no hay consumidor que exija ese formato.
 *
 * En su lugar el token es verificable por el propio sistema:
 *
 *     v1.<base64url(payload)>.<base64url(hmac-sha256(payload, secreto))>
 *
 * con `payload = "<codigo>/<certNro>-<certAnio>"`. Un verificador solo necesita
 * el secreto para validar el token y despues consultar el certificado.
 */

const QR_VERSION = 'v1';

export interface CertificadoQrPayload {
  codigo: string;
  certNro: string | number;
  certAnio: string;
}

export interface CertificadoQrConfig {
  secret: string;
  baseUrl: string;
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
 * QR listo para el PDF, o `null` si falta configuracion o falla la generacion.
 * El certificado se emite igual sin QR (mismo criterio que el logo).
 */
export async function resolveCertificadoQr(
  payload: CertificadoQrPayload,
): Promise<string | null> {
  const secret = process.env.CERTIFICADO_QR_SECRET;
  const baseUrl = process.env.CERTIFICADO_QR_BASE_URL;
  if (!secret || !baseUrl) return null;

  try {
    return await buildCertificadoQrSvg(
      buildCertificadoQrUrl(payload, { secret, baseUrl }),
    );
  } catch {
    return null;
  }
}
