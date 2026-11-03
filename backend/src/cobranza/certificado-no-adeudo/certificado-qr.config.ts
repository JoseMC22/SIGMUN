/**
 * Configuracion del QR del Certificado de No Adeudo.
 *
 * El repo lee `process.env` de forma directa en todos los modulos y
 * `ConfigModule.forRoot` no declara `validationSchema`. Este archivo
 * concentra las dos variables del QR en un solo lugar y valida su forma antes
 * de usarlas: el secreto es el unico factor de autorizacion de la ruta
 * publica, asi que un valor mal cargado tiene que detectarse temprano y
 * quedar visible en el log.
 *
 * Decisiones:
 *
 * - La validacion NO frena el arranque del backend. Frenar todo el sistema
 *   municipal por una variable de una sola funcionalidad seria un acoplamiento
 *   innecesario; si la configuracion falla, la emision del certificado sigue
 *   funcionando (sin QR, igual que hoy con el logo) y la ruta publica
 *   responde 500 `PDF_ERROR`.
 * - El error devuelto describe la variable culpable, nunca su valor: un
 *   secreto no puede aparecer en un log ni en una respuesta.
 */

export interface CertificadoQrConfig {
  /** Secreto HMAC-SHA256 con el que se firman los tokens del QR. */
  secret: string;
  /** URL publica que se codifica en el QR (destino del verificador). */
  baseUrl: string;
}

export type ResolvedCertificadoQrConfig =
  | { ok: true; config: CertificadoQrConfig }
  | { ok: false; error: string };

export type ResolvedCertificadoQrSecret =
  | { ok: true; secret: string }
  | { ok: false; error: string };

/**
 * Largo minimo del secreto. HMAC-SHA256 con una clave corta es debil y, en
 * este caso, la clave es lo unico que separa a un token valido de uno forjado.
 */
export const MIN_CERTIFICADO_QR_SECRET_LENGTH = 32;

/**
 * Lee y valida el secreto del QR.
 *
 * Es lo unico que necesita el verificador publico para validar un token: la
 * URL base es responsabilidad de la emision (y del QR embebido), no de la
 * verificacion.
 *
 * `env` es inyectable para poder probar las reglas sin tocar `process.env`.
 */
export function resolveCertificadoQrSecret(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedCertificadoQrSecret {
  const secret = env.CERTIFICADO_QR_SECRET?.trim();
  if (!secret) {
    return { ok: false, error: 'falta CERTIFICADO_QR_SECRET' };
  }
  if (secret.length < MIN_CERTIFICADO_QR_SECRET_LENGTH) {
    return {
      ok: false,
      error: `CERTIFICADO_QR_SECRET debe tener al menos ${MIN_CERTIFICADO_QR_SECRET_LENGTH} caracteres`,
    };
  }
  return { ok: true, secret };
}

/**
 * Lee y valida la configuracion completa del QR (secreto + URL publica).
 *
 * `env` es inyectable para poder probar las reglas sin tocar `process.env`.
 */
export function resolveCertificadoQrConfig(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedCertificadoQrConfig {
  const secret = resolveCertificadoQrSecret(env);
  if (!secret.ok) {
    return secret;
  }

  const baseUrl = env.CERTIFICADO_QR_BASE_URL?.trim();
  if (!baseUrl) {
    return { ok: false, error: 'falta CERTIFICADO_QR_BASE_URL' };
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return {
      ok: false,
      error: 'CERTIFICADO_QR_BASE_URL no es una URL valida',
    };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      error: 'CERTIFICADO_QR_BASE_URL debe usar http o https',
    };
  }

  return { ok: true, config: { secret: secret.secret, baseUrl } };
}
