import { ProcesarOpRow } from './generar-op.types';

/**
 * Construye el @dataxml que consume Caja.fn_Mrecibo(@dataxml) al generar una
 * orden de pago.
 *
 * El parser es puro XQuery: `@varxml.nodes('//row')` + `.value('@attr', ...)`,
 * no lee ninguna tabla. Cada fila de la proyección de estado de cuenta es un
 * recibo pendiente y se serializa como un atributo por columna.
 */

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

/** Escapa los caracteres que rompen un atributo XML. */
export function escapeXmlAttr(value: unknown): string {
  return String(value ?? '').replace(/[&<>"]/g, (ch) => XML_ESCAPES[ch]);
}

/** Valor numérico del XML: null/undefined/vacío viajan como '0'. */
function xmlNum(value: unknown): string {
  if (value === null || value === undefined || value === '') return '0';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : '0';
}

/** Valor de texto del XML: null/undefined viajan como ''. */
function xmlText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Serializa las filas de la proyección al XML de recibos.
 *
 * `montotal` = imp_insol + imp_reaj + mora + costo_emis. El SP de generación
 * no lo usa, pero se deja coherente con lo que muestra la grilla.
 */
export function buildDataXml(rows: ProcesarOpRow[]): string {
  const filas = rows.map((row) => {
    const impInsol = Number(xmlNum(row.imp_insol));
    const impReaj = Number(xmlNum(row.imp_reaj));
    const impMora = Number(xmlNum(row.mora));
    const costoEmis = Number(xmlNum(row.costo_emis));
    const montotal = impInsol + impReaj + impMora + costoEmis;

    const attrs: [string, string][] = [
      ['num_ingr', xmlNum(row.num_ingr)],
      ['idrecibo', xmlText(row.idrecibo)],
      ['montotal', String(montotal)],
      ['codigo', xmlText(row.codigo)],
      ['anno', xmlText(row.anno)],
      ['cod_pred', xmlText(row.cod_pred)],
      ['anexo', xmlText(row.anexo)],
      ['sub_anexo', xmlText(row.sub_anexo)],
      ['tipo', xmlText(row.tipo)],
      ['tipo_rec', xmlText(row.tipo_rec)],
      ['periodo', xmlText(row.periodo)],
      ['imp_insol', xmlNum(row.imp_insol)],
      ['fact_reaj', xmlNum(row.fact_reaj)],
      ['imp_reaj', xmlNum(row.imp_reaj)],
      ['fact_mora', xmlNum(row.fact_mora)],
      ['imp_mora', xmlNum(row.mora)],
      ['costo_emis', xmlNum(row.costo_emis)],
      ['observacion', xmlText(row.observacion)],
      ['operador', xmlText(row.operador)],
      ['estacion', xmlText(row.estacion)],
      ['fech_ing', xmlText(row.fech_ing)],
      ['descuento', '0'],
    ];

    const serialized = attrs
      .map(([key, value]) => `${key}="${escapeXmlAttr(value)}"`)
      .join(' ');
    return `<row ${serialized} />`;
  });

  return `<rows>${filas.join('')}</rows>`;
}
