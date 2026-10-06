// ── Helper de opciones de año para combos/selects ──────────────────────
// Reutilizable por todos los modales que pidan un rango de años.
// Devuelve un array de { value, label } listo para mapear a <option>.
//
// Por default: desde 1992 hasta el año actual, en orden descendente
// (el más reciente primero), que es lo que piden formularios como
// "Generar Deuda" (Año Desde / Año Hasta).

export interface AnioOption {
  value: string;
  label: string;
}

/**
 * Genera opciones de año para un combobox.
 *
 * @param desde  Año más antiguo (default 1992)
 * @param hasta  Año más reciente (default año actual)
 * @param sentido  'desc' (default, más reciente primero) o 'asc'
 */
export function getAnioOptions(
  desde: number = 1992,
  hasta: number = new Date().getFullYear(),
  sentido: "desc" | "asc" = "desc",
): AnioOption[] {
  const low = Math.min(desde, hasta);
  const high = Math.max(desde, hasta);
  const years: number[] = [];
  for (let y = high; y >= low; y--) years.push(y);
  if (sentido === "asc") years.reverse();
  return years.map((y) => ({ value: String(y), label: String(y) }));
}
