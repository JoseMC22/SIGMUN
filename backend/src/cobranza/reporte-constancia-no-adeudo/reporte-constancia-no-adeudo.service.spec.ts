import { Test } from '@nestjs/testing';
import { ReporteConstanciaNoAdeudoService } from './reporte-constancia-no-adeudo.service';
import { DatabaseService } from '../../database/database.service';

describe('ReporteConstanciaNoAdeudoService', () => {
  let service: ReporteConstanciaNoAdeudoService;
  let db: { executeProcedure: jest.Mock };

  const makeRow = (Numero: number, Año: number, codigo: string) => ({
    Numero,
    Año,
    Fecha: '05/01/2026',
    codigo,
    Nombre: 'CONTRIBUYENTE',
    concepto: 'GASTOS NOTIFICACION',
  });

  beforeEach(async () => {
    db = { executeProcedure: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReporteConstanciaNoAdeudoService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = moduleRef.get(ReporteConstanciaNoAdeudoService);
  });

  it('pasa @BUSC=5 fijo y pagina la primera página (pageSize=20)', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      makeRow(i + 1, 2026, String(1000000 + i)),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const res = await service.search({ page: 1, pageSize: 20, Codigo: '', fini: '', ffin: '' });

    expect(db.executeProcedure).toHaveBeenCalledWith('Certificado.sp_certificado', {
      BUSC: '5',
      Codigo: '',
      // Sin rango utilizable se cae al rango abierto. Mandar '' fijaria ambos
      // extremos en 1900-01-01 dentro del SP y devolveria 0 filas en silencio.
      fini: '1900-01-01',
      ffin: '9999-12-31',
    });
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(20);
    expect(res.total).toBe(25);
    expect(res.totalPages).toBe(2);
  });

  it('devuelve la segunda tanda al pedir page=2', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      makeRow(i + 1, 2026, String(1000000 + i)),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const res = await service.search({ page: 2, pageSize: 20, Codigo: '', fini: '', ffin: '' });

    expect(res.data).toHaveLength(5);
    expect(res.data[0].Numero).toBe(21);
    expect(res.data[4].Numero).toBe(25);
  });

  it('ignora el rango de fechas cuando hay Codigo informado', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });
    await service.search({
      page: 1,
      pageSize: 20,
      Codigo: '0282418',
      fini: '2026-01-01',
      ffin: '2026-12-31',
    });

    // El código identifica una constancia puntual: acotar por fechas podria
    // vaciar el resultado, asi que se manda un rango ABIERTO (no cadena vacia:
    // el SP concatena @fini + ' 00:00:00' y '' lo convierte a 1900-01-01).
    expect(db.executeProcedure).toHaveBeenCalledWith('Certificado.sp_certificado', {
      BUSC: '5',
      Codigo: '0282418',
      fini: '1900-01-01',
      ffin: '9999-12-31',
    });
  });

  it('usa rango abierto tambien si el rango viene incompleto', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });

    await service.search({ page: 1, pageSize: 20, Codigo: '', fini: '2026-01-01', ffin: '' });
    expect(db.executeProcedure).toHaveBeenLastCalledWith('Certificado.sp_certificado', {
      BUSC: '5',
      Codigo: '',
      fini: '1900-01-01',
      ffin: '9999-12-31',
    });

    await service.search({ page: 1, pageSize: 20, Codigo: '', fini: '', ffin: '2026-12-31' });
    expect(db.executeProcedure).toHaveBeenLastCalledWith('Certificado.sp_certificado', {
      BUSC: '5',
      Codigo: '',
      fini: '1900-01-01',
      ffin: '9999-12-31',
    });
  });

  it('nunca manda @fini ni @ffin vacios al SP', async () => {
    // Guarda de regresion: con cadena vacia el SP fija ambos extremos en
    // 1900-01-01 y devuelve 0 filas sin avisar. Si esto falla, se rompio.
    const combos = [
      { Codigo: '', fini: '', ffin: '' },
      { Codigo: '', fini: '2026-01-01', ffin: '' },
      { Codigo: '', fini: '', ffin: '2026-12-31' },
      { Codigo: '0270801', fini: '', ffin: '' },
      { Codigo: '0270801', fini: '2026-10-01', ffin: '2026-10-01' },
    ];
    db.executeProcedure.mockResolvedValue({ recordset: [] });

    for (const combo of combos) {
      await service.search({ page: 1, pageSize: 20, ...combo });
      const [, spParams] = db.executeProcedure.mock.calls[db.executeProcedure.mock.calls.length - 1];
      expect(spParams.fini).not.toBe('');
      expect(spParams.ffin).not.toBe('');
      expect(spParams.fini).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(spParams.ffin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('manda el rango de fechas cuando no hay Codigo', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });
    await service.search({
      page: 1,
      pageSize: 20,
      Codigo: '',
      fini: '2026-01-01',
      ffin: '2026-12-31',
    });

    expect(db.executeProcedure).toHaveBeenCalledWith('Certificado.sp_certificado', {
      BUSC: '5',
      Codigo: '',
      fini: '2026-01-01',
      ffin: '2026-12-31',
    });
  });

  it('trata un Codigo de solo espacios como ausente y respeta las fechas', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });
    await service.search({
      page: 1,
      pageSize: 20,
      Codigo: '   ',
      fini: '2026-01-01',
      ffin: '2026-12-31',
    });

    expect(db.executeProcedure).toHaveBeenCalledWith('Certificado.sp_certificado', {
      BUSC: '5',
      Codigo: '   ',
      fini: '2026-01-01',
      ffin: '2026-12-31',
    });
  });

  it('mapea null a "" para no enviar null al frontend', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [{ Numero: 1, Año: null, Fecha: null, codigo: 'x', Nombre: null, concepto: null }],
    });
    const res = await service.search({ page: 1, pageSize: 20, Codigo: '', fini: '', ffin: '' });
    expect(res.data[0].Año).toBe('');
    expect(res.data[0].Nombre).toBe('');
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    db.executeProcedure.mockRejectedValue(new Error('boom'));
    const res = await service.search({ page: 1, pageSize: 20, Codigo: '', fini: '', ffin: '' });
    expect(res.success).toBe(false);
    expect(res.data).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.error).toBeDefined();
  });

  it('no pagina en export (pageSize=100000) y devuelve todo', async () => {
    const rows = Array.from({ length: 150 }, (_, i) => makeRow(i + 1, 2026, String(1000000 + i)));
    db.executeProcedure.mockResolvedValue({ recordset: rows });
    const res = await service.search({ page: 1, pageSize: 100000, Codigo: '', fini: '', ffin: '' });
    expect(res.data).toHaveLength(150);
    expect(res.totalPages).toBe(1);
  });
});