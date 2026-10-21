// Helpers puros para armar los parámetros de Caja.sp_EstCta_Rentasop_proyectado.
//
// El SP recibe @annos y @perio como texto: cada año/trimestre viaja entre
// comillas dobles dentro de un JSON. Mantener el armado aquí permite testear
// el formato exacto sin montar el modal.

/** Convierte "yyyy-MM-dd" (input date) a "dd/MM/yyyy". "" se conserva. */
export function formatFechaDdMmAaaa(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/**
 * Empaca el rango de años como texto: cada año entre comillas y separado por
 * coma. 2026..2026 => "2026"; 2025..2026 => "2025","2026".
 */
export function buildAnnosPack(desde: number, hasta: number): string {
  const años: string[] = [];
  const inicio = Math.min(desde, hasta);
  const fin = Math.max(desde, hasta);
  for (let a = inicio; a <= fin; a++) {
    años.push(`"${a}"`);
  }
  return años.join(",");
}

/**
 * Arma el JSON de 4 elementos que espera @perio:
 * [codigo, fecha dd/MM/yyyy, annosPack, trimestres "01","02",...].
 * Los trimestres se ordenan ascendente y se rellenan a dos dígitos.
 */
export function buildPerio(args: {
  codigo: string;
  fecha: string;
  annosPack: string;
  trimestres: number[];
}): string {
  const { codigo, fecha, annosPack, trimestres } = args;
  const trimestresPack = [...trimestres]
    .sort((a, b) => a - b)
    .map((t) => '"' + String(t).padStart(2, "0") + '"')
    .join(",");
  return JSON.stringify([codigo, fecha, annosPack, trimestresPack]);
}
