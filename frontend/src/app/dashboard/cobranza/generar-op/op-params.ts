// Helpers puros para armar los parámetros de Caja.sp_EstCta_Rentasop_proyectado.
//
// El SP arma SQL dinámico con comillas dobles como delimitadores y, al final,
// hace `replace(@query, '"', '''')` para convertirlas en literales. Por eso
// @annos y @perio se insertan directo dentro de un `in (...)` y cada ítem debe
// viajar entre comillas dobles:
//
//   ... and a.anno in (' + @annos + ') and a.periodo in (' + @perio + ')
//
// Es decir: @annos = "2026" y @perio = "01","02" terminan como
// in ('2026') e in ('01','02'). Con asteriscos o con un JSON, el `in (...)`
// queda malformado y el SP falla al parsear.
//
// @estado NO se entrecomilla en el SP (viaja crudo, es varchar(1)):
// `estado=' + @estado + ' and ...`. Si va vacío el SQL queda `estado= and` y
// el motor responde "Incorrect syntax near the keyword 'and'".

/** Convierte "yyyy-MM-dd" (input date) a "dd/MM/yyyy". "" se conserva. */
export function formatFechaDdMmAaaa(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/**
 * Empaca el rango de años con comillas dobles:
 * 2026..2026 => "2026"; 2025..2026 => "2025","2026".
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
 * Empaca los trimestres con comillas dobles, ordenados ascendente y a dos
 * dígitos: [1,2] => "01","02".
 */
export function buildTrimestresPack(trimestres: number[]): string {
  return [...trimestres]
    .sort((a, b) => a - b)
    .map((t) => `"${String(t).padStart(2, "0")}"`)
    .join(",");
}
