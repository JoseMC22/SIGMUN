import { buildDataXml, escapeXmlAttr } from './generar-op.dataxml';
import { ProcesarOpRow } from './generar-op.types';

const filaBase = (over: Partial<ProcesarOpRow> = {}): ProcesarOpRow => ({
  num_ingr: '0001234',
  idrecibo: '987',
  codigo: '0279126',
  anno: '2026',
  cod_pred: '00123',
  anexo: '1',
  sub_anexo: '0',
  tipo: '01',
  tipo_rec: '02',
  periodo: '01',
  imp_insol: 100.5,
  fact_reaj: 1.2,
  imp_reaj: 10,
  fact_mora: 0.5,
  mora: 5,
  costo_emis: 2.5,
  observacion: '',
  operador: 'WEB',
  estacion: 'WEB',
  fech_ing: '2026-10-21',
  ...over,
});

describe('buildDataXml', () => {
  it('arma un XML bien formado con varias filas', () => {
    const xml = buildDataXml([
      filaBase(),
      filaBase({ idrecibo: '988', num_ingr: '0001235' }),
    ]);

    expect(xml.startsWith('<rows>')).toBe(true);
    expect(xml.endsWith('</rows>')).toBe(true);
    expect(xml.match(/<row /g)).toHaveLength(2);
    expect(xml).toContain('idrecibo="987"');
    expect(xml).toContain('idrecibo="988"');
  });

  it('escapa & < > " en los valores', () => {
    const xml = buildDataXml([
      filaBase({ observacion: 'A & B < C > D "E"' }),
    ]);

    expect(xml).toContain('observacion="A &amp; B &lt; C &gt; D &quot;E&quot;"');
    expect(xml).not.toContain('A & B');
  });

  it('escapeXmlAttr escapa los cuatro caracteres', () => {
    expect(escapeXmlAttr('&<>"')).toBe('&amp;&lt;&gt;&quot;');
  });

  it('toma imp_mora de la columna mora', () => {
    const xml = buildDataXml([filaBase({ mora: 7.75 })]);

    expect(xml).toContain('imp_mora="7.75"');
  });

  it('calcula montotal como imp_insol + imp_reaj + mora + costo_emis', () => {
    const xml = buildDataXml([
      filaBase({ imp_insol: 100, imp_reaj: 10, mora: 5, costo_emis: 2.5 }),
    ]);

    expect(xml).toContain('montotal="117.5"');
  });

  it('manda 0 en numéricos nulos y vacío en textos nulos', () => {
    const xml = buildDataXml([
      filaBase({
        num_ingr: null,
        idrecibo: null,
        codigo: null,
        imp_insol: null,
        imp_reaj: undefined,
        fact_mora: null,
        mora: null,
        costo_emis: undefined,
        observacion: undefined,
        operador: null,
      }),
    ]);

    expect(xml).toContain('num_ingr="0"');
    expect(xml).toContain('idrecibo=""');
    expect(xml).toContain('codigo=""');
    expect(xml).toContain('imp_insol="0"');
    expect(xml).toContain('imp_reaj="0"');
    expect(xml).toContain('fact_mora="0"');
    expect(xml).toContain('imp_mora="0"');
    expect(xml).toContain('costo_emis="0"');
    expect(xml).toContain('observacion=""');
    expect(xml).toContain('operador=""');
    expect(xml).toContain('montotal="0"');
    expect(xml).toContain('descuento="0"');
  });
});
