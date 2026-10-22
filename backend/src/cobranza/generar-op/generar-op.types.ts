export type ProcesarOpRow = Record<string, string | number | null>;

/**
 * Fila de `Rentas.sp_ImprimeOP @buscar = 2`.
 *
 * El SP devuelve una fila por año (`anno`), no por recibo: el detalle por
 * periodo viaja agregado en `cuotas`, `cuota_rej`, `cuota_mor` y `cadenaUIT`.
 * Los importes llegan como number; el resto como string.
 */
export interface OpImpresionRow {
  id_valor: string | null;
  num_val: string | null;
  ano_val: string | null;
  numerOP: string | null;
  fec_val: string | null;
  fecvaln: string | null;
  codigo: string | null;
  nombre: string | null;
  num_doc: string | null;
  Dirfiscal: string | null;
  anno: string | null;
  cadenaUIT: string | null;
  rtramo01: number | null;
  rtramo02: number | null;
  rtramo03: number | null;
  base_imponible1: string | null;
  imp_anual1: string | null;
  cuotas: string | null;
  imp_insol: number | null;
  imp_insoltexto: string | null;
  imp_reaj: number | null;
  mora: number | null;
  costo_emis: number | null;
  costo_emistexto: string | null;
  imp_total: number | null;
  imp_totaltexto: string | null;
  cuota_rej: string | null;
  cuota_mor: string | null;
  direccion: string | null;
  fecha: string | null;
  moratorio: string | null;
  fech_proyectado: string | null;
  cod_pred: string | null;
  fvencimiento: string | null;
  periodoRomano: string | null;
}

/** Datos resueltos para imprimir una OP (filas + imágenes embebidas). */
export interface ImpresionOpData {
  rows: OpImpresionRow[];
  logoDataUri: string | null;
  logoVehicularDataUri: string | null;
  selloDataUri: string | null;
}

// ── Case-insensitive column accessor (mssql v12+ preserves SP casing) ──

type RawRow = Record<string, unknown>;

function col(row: RawRow, name: string): unknown {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  if (key === undefined || row[key] === null || row[key] === undefined) {
    return undefined;
  }
  const val = row[key];
  // mssql devuelve SQL datetime como Date; se normaliza para no filtrar
  // objetos Date al HTML.
  return val instanceof Date ? val.toISOString() : val;
}

function asString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Mapea una fila cruda del SP a `OpImpresionRow` (columnas case-insensitive). */
export function mapOpImpresionRow(raw: RawRow): OpImpresionRow {
  return {
    id_valor: asString(col(raw, 'id_valor')),
    num_val: asString(col(raw, 'num_val')),
    ano_val: asString(col(raw, 'ano_val')),
    numerOP: asString(col(raw, 'numerOP')),
    fec_val: asString(col(raw, 'fec_val')),
    fecvaln: asString(col(raw, 'fecvaln')),
    codigo: asString(col(raw, 'codigo')),
    nombre: asString(col(raw, 'nombre')),
    num_doc: asString(col(raw, 'num_doc')),
    Dirfiscal: asString(col(raw, 'Dirfiscal')),
    anno: asString(col(raw, 'anno')),
    cadenaUIT: asString(col(raw, 'cadenaUIT')),
    rtramo01: asNumber(col(raw, 'rtramo01')),
    rtramo02: asNumber(col(raw, 'rtramo02')),
    rtramo03: asNumber(col(raw, 'rtramo03')),
    base_imponible1: asString(col(raw, 'base_imponible1')),
    imp_anual1: asString(col(raw, 'imp_anual1')),
    cuotas: asString(col(raw, 'cuotas')),
    imp_insol: asNumber(col(raw, 'imp_insol')),
    imp_insoltexto: asString(col(raw, 'imp_insoltexto')),
    imp_reaj: asNumber(col(raw, 'imp_reaj')),
    mora: asNumber(col(raw, 'mora')),
    costo_emis: asNumber(col(raw, 'costo_emis')),
    costo_emistexto: asString(col(raw, 'costo_emistexto')),
    imp_total: asNumber(col(raw, 'imp_total')),
    imp_totaltexto: asString(col(raw, 'imp_totaltexto')),
    cuota_rej: asString(col(raw, 'cuota_rej')),
    cuota_mor: asString(col(raw, 'cuota_mor')),
    direccion: asString(col(raw, 'direccion')),
    fecha: asString(col(raw, 'fecha')),
    moratorio: asString(col(raw, 'moratorio')),
    fech_proyectado: asString(col(raw, 'fech_proyectado')),
    cod_pred: asString(col(raw, 'cod_pred')),
    fvencimiento: asString(col(raw, 'fvencimiento')),
    periodoRomano: asString(col(raw, 'periodoRomano')),
  };
}

export interface ProcesarOpResult {
  success: boolean;
  data: ProcesarOpRow[];
  total: number;
  error?: string;
  /** Mensaje crudo del motor SQL. Solo se adjunta fuera de producción. */
  detail?: string;
}

/** Resultado de la generación real de la OP (Rentas.sp_Genera_OP[VEH]). */
export interface GenerarOpResult {
  success: boolean;
  /** '01' predial, '11' vehicular. */
  id_valor?: string;
  /** Correlativo que devuelve el SP; vacío nunca se reporta como éxito. */
  num_val?: string;
  ano_val?: string;
  /** Cantidad de recibos incluidos en la OP. */
  total?: number;
  imp_insol?: number;
  imp_reaj?: number;
  mora?: number;
  costo_emis?: number;
  error?: string;
  /** Mensaje crudo del motor SQL. Solo se adjunta fuera de producción. */
  detail?: string;
}
