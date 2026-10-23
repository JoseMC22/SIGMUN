import { Test, TestingModule } from '@nestjs/testing';
import { AjusteCuentaCorrienteService } from './ajuste-cuenta-corriente.service';
import { DatabaseService } from '../../database/database.service';

/**
 * Blindan el contrato del módulo:
 * - Combo de tipos de documento de sustento:
 *   Rentas.sp_cuentacorriente @msquery=11, leído POR POSICIÓN (el legacy PHP
 *   hacía RegistrosCombo($rows, 0, 1): columna 0 = value/id, columna 1 =
 *   label). Los nombres de columna del SP se desconocen, así que el spec usa
 *   claves inventadas: solo importa la posición. Filas con id vacío se
 *   descartan; null se mapea a ''.
 * - Imputación de monto: params EXACTOS de Rentas.sp_Compensarrecibosjson
 *   (@dataxml = JSON.stringify de los recibos, @tipo_baja=0 fijo, estación
 *   la que arma el controller) y error envuelto en { success:false, error }.
 */
describe('AjusteCuentaCorrienteService', () => {
  let service: AjusteCuentaCorrienteService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let executeProcedure: jest.Mock<any, any>;

  const comboResult = (rows: object[]) => ({ recordset: rows });

  beforeEach(async () => {
    executeProcedure = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AjusteCuentaCorrienteService,
        { provide: DatabaseService, useValue: { executeProcedure } },
      ],
    }).compile();
    service = module.get<AjusteCuentaCorrienteService>(
      AjusteCuentaCorrienteService,
    );
  });

  it('pide el combo con @msquery=11 y mapea por posicion (col 0 = id, col 1 = nombre) con trim', async () => {
    executeProcedure.mockResolvedValueOnce(
      comboResult([
        { colA: ' 01 ', colB: ' DNI ' },
        { colA: '02', colB: 'RUC' },
        { colA: '03', colB: null },
      ]),
    );

    const res = await service.getTiposDocSustento();

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(executeProcedure).toHaveBeenCalledWith('Rentas.sp_cuentacorriente', {
      msquery: 11,
    });
    expect(res.success).toBe(true);
    expect(res.data).toEqual([
      { id: '01', nombre: 'DNI' },
      { id: '02', nombre: 'RUC' },
      { id: '03', nombre: '' },
    ]);
  });

  it('con recordset vacio devuelve data vacia', async () => {
    executeProcedure.mockResolvedValueOnce(comboResult([]));

    const res = await service.getTiposDocSustento();

    expect(res).toEqual({ success: true, data: [] });
  });

  it('descarta las filas sin id', async () => {
    executeProcedure.mockResolvedValueOnce(
      comboResult([
        { colA: '', colB: 'SIN CODIGO' },
        { colA: null, colB: 'TAMPOCO' },
        { colA: '04', colB: 'OTRO' },
      ]),
    );

    const res = await service.getTiposDocSustento();

    expect(res.data).toEqual([{ id: '04', nombre: 'OTRO' }]);
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    executeProcedure.mockRejectedValueOnce(new Error('boom'));

    const res = await service.getTiposDocSustento();

    expect(res.success).toBe(false);
    expect(res.data).toEqual([]);
    expect(res.error).toBeTruthy();
  });

  // ── imputarMonto (Rentas.sp_Compensarrecibosjson) ──

  /** Recibo con las 22 claves legacy exactas que armaba el PHP. */
  const reciboLegacy = {
    idrecibo: '1015275',
    codigo: '0012345',
    anno: '2024',
    cod_pred: '0015981',
    anexo: '000',
    sub_anexo: '000',
    tipo: '02.01',
    tipo_rec: '001',
    periodo: '202403',
    imp_insol: 120.5,
    fact_reaj: '1.5',
    imp_reaj: 60.25,
    fact_mora: '0',
    imp_mora: 12.75,
    costo_emis: 3.5,
    estado: '0',
    ubica: 'CAJA',
    fec_venc: '2024-05-10',
    fec_pago: '',
    num_ingr: '',
    fech_ing: '',
    montotal: 197,
  };

  const dtoImputar = {
    codigo: '0012345',
    nroDocSustento: 'F-001-00220',
    docSustento: 'FACTURA ELECTRONICA',
    tipoDocSustento: '01',
    montoAjustar: 150,
    montoTotal: 394,
    operador: 'jperez',
    recibos: [reciboLegacy, { ...reciboLegacy, idrecibo: '1015276' }],
  };

  it('compensa con los params exactos del legacy (dataxml=json de recibos, tipo_baja=0, estacion)', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [{ ok: 1 }] });

    const res = await service.imputarMonto(dtoImputar, '192');

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(executeProcedure).toHaveBeenCalledWith(
      'Rentas.sp_Compensarrecibosjson',
      {
        dataxml: JSON.stringify(dtoImputar.recibos),
        montoacuenta: 150,
        monto: 394,
        doc_sustento: 'FACTURA ELECTRONICA',
        nro_doc_sustento: 'F-001-00220',
        tipo_doc_sustento: '01',
        tipo_baja: 0,
        operador: 'jperez',
        estacion: '192',
      },
    );
    expect(res).toEqual({ success: true });
  });

  it('el estacion viaja tal cual se recibe (primer octeto que arma el controller)', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [] });

    await service.imputarMonto(dtoImputar, '10');

    expect(executeProcedure).toHaveBeenCalledWith(
      'Rentas.sp_Compensarrecibosjson',
      expect.objectContaining({ estacion: '10' }),
    );
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    executeProcedure.mockRejectedValueOnce(new Error('boom'));

    const res = await service.imputarMonto(dtoImputar, '192');

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
