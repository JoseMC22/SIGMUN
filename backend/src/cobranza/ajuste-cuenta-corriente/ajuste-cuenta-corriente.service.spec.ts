import { Test, TestingModule } from '@nestjs/testing';
import { AjusteCuentaCorrienteService } from './ajuste-cuenta-corriente.service';
import { DatabaseService } from '../../database/database.service';

/**
 * Blindan el contrato del combo de tipos de documento de sustento:
 * - Rentas.sp_cuentacorriente @msquery=11, leído POR POSICIÓN (el legacy PHP
 *   hacía RegistrosCombo($rows, 0, 1): columna 0 = value/id, columna 1 =
 *   label). Los nombres de columna del SP se desconocen, así que el spec usa
 *   claves inventadas: solo importa la posición.
 * - Filas con id vacío se descartan; null se mapea a ''.
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
});
