// Helpers puros para armar los parámetros de Caja.sp_EstCta_Rentasop_proyectado.
//
// Convención de la familia Caja.sp_EstCta_Rentas*: cada ítem de una lista viaja
// envuelto en asteriscos (*v1*,*v2*) y el SP los reescribe como literales
// entrecomillados para armar sus cláusulas `in(...)`. Mismo contrato que usa
// declaracion-jurada.service.ts (getEstadoCuentaRecibos) sobre la misma
// familia de SP. Mandar comillas dobles deja la cláusula vacía y el SQL
// dinámico sale malformado ("Incorrect syntax near the keyword 'and'").

/** Convierte "yyyy-MM-dd" (input date) a "dd/MM/yyyy". "" se conserva. */
export function formatFechaDdMmAaaa(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/**
 * Empaca el rango de años como lista con asteriscos:
 * 2026..2026 => *2026*; 2025..2026 => *2025*,*2026*.
 */
export function buildAnnosPack(desde: number, hasta: number): string {
  const años: string[] = [];
  const inicio = Math.min(desde, hasta);
  const fin = Math.max(desde, hasta);
  for (let a = inicio; a <= fin; a++) {
    años.push(`*${a}*`);
  }
  return años.join(",");
}

/**
 * Empaca los trimestres seleccionados como lista con asteriscos, ordenada
 * ascendente y a dos dígitos: [1,2,3,4] => *01*,*02*,*03*,*04*.
 */
export function buildTrimestresPack(trimestres: number[]): string {
  return [...trimestres]
    .sort((a, b) => a - b)
    .map((t) => `*${String(t).padStart(2, "0")}*`)
    .join(",");
}
