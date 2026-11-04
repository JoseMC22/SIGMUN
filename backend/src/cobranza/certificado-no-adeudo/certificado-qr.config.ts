/**
 * Configuracion del QR del Certificado de No Adeudo.
 *
 * El repo lee `process.env` de forma directa en todos los modulos y
 * `ConfigModule.forRoot` no declara `validationSchema`. Este archivo
 * concentra la variable del QR:
 *
 * - `CERTIFICADO_QR_BASE_URL`: URL del servidor de reportes que codifica el
 *   QR. La usa la emision del certificado.
 *
 * Decisiones:
 *
 * - La validacion NO frena el arranque del backend. Frenar todo el sistema
 *   municipal por una variable de una sola funcionalidad seria un acoplamiento
 *   innecesario; si la configuracion falla, la emision del certificado sigue
 *   funcionando (sin QR, igual que hoy con el logo).
 * - El error devuelto describe la variable culpable, nunca su valor.
 */

export interface CertificadoQrConfig {
  /** URL del servidor de reportes que codifica el QR (regenera el PDF). */
  baseUrl: string;
}

export type ResolvedCertificadoQrConfig =
  | { ok: true; config: CertificadoQrConfig }
  | { ok: false; error: string };

/**
 * Lee y valida la configuracion del QR: solo la URL del servidor de reportes.
 *
 * `env` es inyectable para poder probar las reglas sin tocar `process.env`.
 */
export function resolveCertificadoQrConfig(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedCertificadoQrConfig {
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

  return { ok: true, config: { baseUrl } };
}
