import { Test, TestingModule } from '@nestjs/testing';
import {
  ConsultaValoresService,
  DISPLAY_COLUMNS,
} from './consulta-valores.service';
import { DatabaseService } from '../../database/database.service';

/**
 * Blindan el contrato verificado de Rentas.SP_Consultadocu @msquery=1:
 * - COUNT via @msquery=2, página via @msquery=1 con inicio/final 1-based.
 * - @codigo y @num_val EXACTOS, @unombre LIKE parcial (eso lo hace el SP).
 * - ROW y nestado se descartan; null se mapea a ''.
 */
describe('ConsultaValoresService', () => {
  let service: ConsultaValoresService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let executeProcedure: jest.Mock<any, any>;

  const countResult = (total: number) => ({ recordset: [{ '': total }] });
  const pageResult = (rows: object[]) => ({ recordset: rows });

  // Fila cruda tal como la devuelve el SP (13 cols + ROW).
  const rawRow = (over: object = {}) => ({
    codigo: '0204199',
    nombre: 'ASOCIACION COUNTRY CLUB DE ICA',
    nomb_val: 'Orden de Pago Predial',
    num_val: '0005257',
    ano_val: '2026',
    MontoTotal: 2171.63,
    fec_val: '25/05/2026',
    id_valor: '01',
    num_exp: '0000000',
    ano_exp: '0000',
    fec_vence: '25/05/2026',
    nestado: 1,
    observacion: '',
    ROW: 1,
    ...over,
  });

  beforeEach(async () => {
    executeProcedure = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultaValoresService,
        { provide: DatabaseService, useValue: { executeProcedure } },
      ],
    }).compile();
    service = module.get<ConsultaValoresService>(ConsultaValoresService);
  });

  it('pide el COUNT con @msquery=2 y la pagina con @msquery=1', async () => {
    executeProcedure
      .mockResolvedValueOnce(countResult(42))
      .mockResolvedValueOnce(pageResult([rawRow()]));

    await service.search({ page: 1, pageSize: 15, Codigo: '', Unombre: '', NumVal: '' });

    expect(executeProcedure).toHaveBeenCalledTimes(2);
    expect(executeProcedure.mock.calls[0][1].msquery).toBe(2);
    expect(executeProcedure.mock.calls[1][1].msquery).toBe(1);
  });

  it('calcula inicio/final 1-based inclusivo por pagina', async () => {
    executeProcedure
      .mockResolvedValueOnce(countResult(100))
      .mockResolvedValueOnce(pageResult([]))
      .mockResolvedValueOnce(countResult(100))
      .mockResolvedValueOnce(pageResult([]));

    await service.search({ page: 1, pageSize: 15, Codigo: '', Unombre: '', NumVal: '' });
    expect(executeProcedure.mock.calls[1][1].inicio).toBe(1);
    expect(executeProcedure.mock.calls[1][1].final).toBe(15);

    await service.search({ page: 3, pageSize: 15, Codigo: '', Unombre: '', NumVal: '' });
    expect(executeProcedure.mock.calls[3][1].inicio).toBe(31);
    expect(executeProcedure.mock.calls[3][1].final).toBe(45);
  });

  it('manda solo el criterio lleno y el resto vacio', async () => {
    executeProcedure
      .mockResolvedValueOnce(countResult(1))
      .mockResolvedValueOnce(pageResult([rawRow()]));

    await service.search({ page: 1, pageSize: 15, Codigo: '0204199', Unombre: '', NumVal: '' });

    const params = executeProcedure.mock.calls[1][1];
    expect(params.codigo).toBe('0204199');
    expect(params.unombre).toBe('');
    expect(params.num_val).toBe('');
  });

  it('en export (pageSize=100000) no pide COUNT y manda inicio=0, final=0', async () => {
    executeProcedure.mockResolvedValueOnce(
      pageResult([rawRow(), rawRow({ codigo: '0204200', ROW: 2 })]),
    );

    const res = await service.search({
      page: 1,
      pageSize: 100000,
      Codigo: '',
      Unombre: '',
      NumVal: '',
    });

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(executeProcedure.mock.calls[0][1]).toMatchObject({
      msquery: 1,
      inicio: 0,
      final: 0,
    });
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    expect(res.total).toBe(2);
  });

  it('descarta ROW y nestado, y mapea null a ""', async () => {
    executeProcedure
      .mockResolvedValueOnce(countResult(1))
      .mockResolvedValueOnce(
        pageResult([rawRow({ observacion: null, nombre: null })]),
      );

    const res = await service.search({ page: 1, pageSize: 15, Codigo: '', Unombre: '', NumVal: '' });

    expect(res.data[0]).not.toHaveProperty('ROW');
    expect(res.data[0]).not.toHaveProperty('nestado');
    expect(res.data[0].observacion).toBe('');
    expect(res.data[0].nombre).toBe('');
    // Las 12 columnas mostradas existen y ninguna es null.
    for (const col of DISPLAY_COLUMNS) {
      expect(res.data[0][col]).not.toBeNull();
      expect(res.data[0][col]).not.toBeUndefined();
    }
  });

  it('preserva MontoTotal como number', async () => {
    executeProcedure
      .mockResolvedValueOnce(countResult(1))
      .mockResolvedValueOnce(pageResult([rawRow()]));

    const res = await service.search({ page: 1, pageSize: 15, Codigo: '', Unombre: '', NumVal: '' });

    expect(res.data[0].MontoTotal).toBe(2171.63);
  });

  it('con total 0 devuelve vacio sin pedir la pagina', async () => {
    executeProcedure.mockResolvedValueOnce(countResult(0));

    const res = await service.search({ page: 1, pageSize: 15, Codigo: '9999999', Unombre: '', NumVal: '' });

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ success: true, data: [], total: 0, totalPages: 0 });
  });

  it('calcula totalPages redondeando hacia arriba', async () => {
    executeProcedure
      .mockResolvedValueOnce(countResult(16))
      .mockResolvedValueOnce(pageResult([rawRow()]));

    const res = await service.search({ page: 1, pageSize: 15, Codigo: '', Unombre: '', NumVal: '' });

    expect(res.total).toBe(16);
    expect(res.totalPages).toBe(2);
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    executeProcedure.mockRejectedValueOnce(new Error('boom'));

    const res = await service.search({ page: 1, pageSize: 15, Codigo: '', Unombre: '', NumVal: '' });

    expect(res.success).toBe(false);
    expect(res.data).toEqual([]);
    expect(res.error).toBeTruthy();
  });

  it('devuelve { success:false, error } sin throw cuando falla el COUNT', async () => {
    executeProcedure.mockRejectedValueOnce(new Error('boom'));

    const res = await service.search({ page: 1, pageSize: 15, Codigo: '', Unombre: '', NumVal: '' });

    expect(res.success).toBe(false);
    expect(executeProcedure).toHaveBeenCalledTimes(1);
  });
});
