import { Test, TestingModule } from '@nestjs/testing';
import { AnularValorService } from './anular-valor.service';
import { DatabaseService } from '../../database/database.service';

/**
 * Fase 1: solo listado. Blindan que:
 * - Se llama con { busc: 28 } y nada más.
 * - La paginación en memoria corta bien (offset 0-based, 15 por página).
 * - null se mapea a '' (texto) y 0 (numéricos).
 * - Export devuelve todo sin paginar.
 */
describe('AnularValorService', () => {
  let service: AnularValorService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let executeProcedure: jest.Mock<any, any>;

  // Fila cruda tal como la devuelve @busc=28 (16 columnas en mayúsculas).
  const rawRow = (over: object = {}) => ({
    CODIGO: '0204199',
    NOMBRE: 'ASOCIACION COUNTRY CLUB DE ICA',
    DIRECCION: 'AV. EJEMPLO 123',
    JUNTA: 'JUNTA 1',
    DNI: '12345678',
    CORREO: 'a@b.c',
    ID_VIA: 'V001',
    TELEFONO1: '999888777',
    BASE_IMPONIBLE: 1000,
    INAFECTO: 0,
    CATEGORIA: 'A',
    GESTOR: 'G1',
    IMP_ANUAL: 100,
    IMP_TRIME: 25,
    COSTO_EMI: 5,
    IMPTOTAL: 130,
    ...over,
  });

  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      rawRow({ CODIGO: `C${String(i).padStart(6, '0')}` }),
    );

  beforeEach(async () => {
    executeProcedure = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnularValorService,
        { provide: DatabaseService, useValue: { executeProcedure } },
      ],
    }).compile();
    service = module.get<AnularValorService>(AnularValorService);
  });

  it('llama al SP con { busc: 28 } y nada mas', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: rows(3) });

    await service.search({ page: 1, pageSize: 15 });

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(executeProcedure.mock.calls[0][0]).toBe(
      'Rentas.sp_Mcontribuyente',
    );
    expect(executeProcedure.mock.calls[0][1]).toEqual({ busc: 28 });
  });

  it('pagina en memoria de a 15 (offset 0-based)', async () => {
    executeProcedure.mockResolvedValue({ recordset: rows(32) });

    const p1 = await service.search({ page: 1, pageSize: 15 });
    expect(p1.data).toHaveLength(15);
    expect(p1.data[0].codigo).toBe('C000000');
    expect(p1.total).toBe(32);
    expect(p1.totalPages).toBe(3);

    const p3 = await service.search({ page: 3, pageSize: 15 });
    expect(p3.data).toHaveLength(2);
    expect(p3.data[0].codigo).toBe('C000030');
  });

  it('en export (pageSize=100000) devuelve todo sin paginar', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: rows(40) });

    const res = await service.search({ page: 1, pageSize: 100000 });

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(res.data).toHaveLength(40);
    expect(res.total).toBe(40);
    expect(res.totalPages).toBe(1);
  });

  it('mapea null a "" en texto y a 0 en numericos', async () => {
    executeProcedure.mockResolvedValueOnce({
      recordset: [
        rawRow({
          NOMBRE: null,
          DIRECCION: null,
          BASE_IMPONIBLE: null,
          IMP_ANUAL: null,
        }),
      ],
    });

    const res = await service.search({ page: 1, pageSize: 15 });

    expect(res.data[0].nombre).toBe('');
    expect(res.data[0].direccion).toBe('');
    expect(res.data[0].baseImponible).toBe(0);
    expect(res.data[0].impAnual).toBe(0);
    // Los presentes se preservan.
    expect(res.data[0].codigo).toBe('0204199');
    expect(res.data[0].impTotal).toBe(130);
  });

  it('con 0 filas devuelve vacio con totalPages 0', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [] });

    const res = await service.search({ page: 1, pageSize: 15 });

    expect(res).toMatchObject({ success: true, data: [], total: 0, totalPages: 0 });
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    executeProcedure.mockRejectedValueOnce(new Error('boom'));

    const res = await service.search({ page: 1, pageSize: 15 });

    expect(res.success).toBe(false);
    expect(res.data).toEqual([]);
    expect(res.error).toBeTruthy();
  });
});
