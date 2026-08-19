/// <reference types="jest" />

import { DeclaracionPdfRowSchema } from './declaracion-pdf-row.dto';
import { mapDeclaracionPdfRow } from '../impresion-dj-alcabala.service';

// Helper: canonical RptAlcabala row with all 25 declared fields.
function declRow(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    codigo_compra: 'C001',
    comprador: 'JUAN PEREZ',
    comprador_fiscal: 'AV. SOL 100',
    comprador_dni: '12345678',
    codigo_venta: 'V001',
    vendedor: 'MARIA LOPEZ',
    vendedor_fiscal: 'JR. LUNA 200',
    vendedor_dni: '87654321',
    contrato: 'CONTRATO-001',
    direccion_predio: 'CALLE REAL 50',
    fecha_contrato: '01/02/2026',
    tipo_pred: '1',
    monto_letras: 'SON MIL SOLES',
    observacion: 'SIN OBSERVACIONES',
    usuario_ing: 'jadmin',
    fecha_ing: '01/02/2026 10:00:00',
    transferencia: 100000,
    autoavaluo: 95000,
    monto_inafecto: 0,
    monto_afecto: 100000,
    mora: 500,
    tasa_impuesto: 3,
    monto_alcabala: 3000,
    total_alcabala: 3500,
    base_imponible: 100000,
    ...overrides,
  };
}

describe('DeclaracionPdfRowSchema (T1 — DTO)', () => {
  it('should parse all 25 declared fields', () => {
    const parsed = DeclaracionPdfRowSchema.parse(declRow());

    expect(Object.keys(parsed)).toHaveLength(25);
    expect(parsed).toEqual({
      codigo_compra: 'C001',
      comprador: 'JUAN PEREZ',
      comprador_fiscal: 'AV. SOL 100',
      comprador_dni: '12345678',
      codigo_venta: 'V001',
      vendedor: 'MARIA LOPEZ',
      vendedor_fiscal: 'JR. LUNA 200',
      vendedor_dni: '87654321',
      contrato: 'CONTRATO-001',
      direccion_predio: 'CALLE REAL 50',
      fecha_contrato: '01/02/2026',
      tipo_pred: '1',
      monto_letras: 'SON MIL SOLES',
      observacion: 'SIN OBSERVACIONES',
      usuario_ing: 'jadmin',
      fecha_ing: '01/02/2026 10:00:00',
      transferencia: 100000,
      autoavaluo: 95000,
      monto_inafecto: 0,
      monto_afecto: 100000,
      mora: 500,
      tasa_impuesto: 3,
      monto_alcabala: 3000,
      total_alcabala: 3500,
      base_imponible: 100000,
    });
  });

  it('should coerce numeric strings from the SP into numbers', () => {
    const parsed = DeclaracionPdfRowSchema.parse(
      declRow({ transferencia: '100000', monto_alcabala: '3000.50' }),
    );
    expect(parsed.transferencia).toBe(100000);
    expect(parsed.monto_alcabala).toBe(3000.5);
  });

  it('should map NULL string columns to empty string via col() (review fix)', () => {
    const mapped = mapDeclaracionPdfRow(
      declRow({ comprador: null, observacion: null, usuario_ing: null }),
    );
    expect(mapped.comprador).toBe('');
    expect(mapped.observacion).toBe('');
    expect(mapped.usuario_ing).toBe('');
  });

  it('should map missing string columns to empty string (no throw)', () => {
    const { comprador, observacion, ...rest } = declRow();
    const mapped = mapDeclaracionPdfRow(rest);
    expect(mapped.comprador).toBe('');
    expect(mapped.observacion).toBe('');
  });

  it('should map NULL numeric columns to 0 via col()', () => {
    const mapped = mapDeclaracionPdfRow(
      declRow({ monto_alcabala: null, mora: null }),
    );
    expect(mapped.monto_alcabala).toBe(0);
    expect(mapped.mora).toBe(0);
  });

  it('should coerce non-numeric garbage like "N/A" to 0 via .catch(0) (no 500)', () => {
    const parsed = DeclaracionPdfRowSchema.parse(
      declRow({ monto_alcabala: 'N/A', tasa_impuesto: 'N/A' }),
    );
    expect(parsed.monto_alcabala).toBe(0);
    expect(parsed.tasa_impuesto).toBe(0);
  });
});
