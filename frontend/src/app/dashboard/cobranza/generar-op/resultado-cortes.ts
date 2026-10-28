// Cortes por año para la grilla de resultados de generar-op.
//
// Los factores (fact_reaj, fact_mora) son coeficientes, NO importes: sumarlos
// entre recibos no significa nada. El subtotal solo acumula insoluto, reajuste,
// interés y costo de emisión, más el total calculado.

/** Fila cruda de la proyección, tal como la devuelve el backend. */
export type FilaProyeccion = Record<string, unknown>;

export interface SubtotalCorte {
  imp_insol: number;
  imp_reaj: number;
  mora: number;
  costo_emis: number;
  total: number;
}

export interface CorteAnio {
  anno: string;
  rows: FilaProyeccion[];
  subtotal: SubtotalCorte;
}

/** Convierte a número lo que venga (string, null, undefined) sin devolver NaN. */
export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Total de una fila. El SP no lo devuelve: se calcula como en el resto de la
 * familia (rd-alcabala), imp_reaj + mora + costo_emis.
 */
export function totalFila(row: FilaProyeccion): number {
  return num(row.imp_reaj) + num(row.mora) + num(row.costo_emis);
}

/** Acumula los importes de un conjunto de filas. */
export function subtotalizar(rows: readonly FilaProyeccion[]): SubtotalCorte {
  const st: SubtotalCorte = {
    imp_insol: 0,
    imp_reaj: 0,
    mora: 0,
    costo_emis: 0,
    total: 0,
  };

  for (const row of rows) {
    st.imp_insol += num(row.imp_insol);
    st.imp_reaj += num(row.imp_reaj);
    st.mora += num(row.mora);
    st.costo_emis += num(row.costo_emis);
    st.total += totalFila(row);
  }

  return st;
}

/** Clave de agrupación: el año, normalizado a string sin espacios. */
function claveAnio(row: FilaProyeccion): string {
  return String(row.anno ?? "").trim();
}

/**
 * Agrupa las filas por año, ordena los cortes ascendente y calcula el subtotal
 * de cada uno. Las filas sin año caen en el corte "" y van al final, para que
 * no desplacen a los años reales. Dentro de cada corte se preserva el orden
 * relativo que devolvió el SP.
 */
export function agruparPorAnio(rows: readonly FilaProyeccion[]): CorteAnio[] {
  const grupos = new Map<string, FilaProyeccion[]>();

  for (const row of rows) {
    const key = claveAnio(row);
    const bucket = grupos.get(key);
    if (bucket) bucket.push(row);
    else grupos.set(key, [row]);
  }

  return [...grupos.entries()]
    .map(([anno, filas]) => ({ anno, rows: filas, subtotal: subtotalizar(filas) }))
    .sort((a, b) => compararAnios(a.anno, b.anno));
}

function compararAnios(a: string, b: string): number {
  if (a === b) return 0;
  if (a === "") return 1;
  if (b === "") return -1;

  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;

  return a.localeCompare(b);
}
