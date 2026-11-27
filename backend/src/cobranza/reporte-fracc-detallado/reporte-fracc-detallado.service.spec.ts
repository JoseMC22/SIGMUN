import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ReporteFraccDetalladoService } from './reporte-fracc-detallado.service';
import { DatabaseService } from '../../database/database.service';

describe('ReporteFraccDetalladoService', () => {
  let service: ReporteFraccDetalladoService;
  let db: { executeProcedure: jest.Mock };

  // Fila con el shape real que devuelve la rama @BUSC=40 (13 columnas, probe
  // T0). 'nombre' y 'descrip' vienen en minúscula (alias del SELECT); 'FECHA'
  // viene dd/mm/yyyy; 'MES_SALDO' viene en mayúsculas.
  const makeRow = (codigo: string, mesSaldo = 'NOVIEMBRE') => ({
    CODIGO: codigo,
    nombre: 'CONTRIBUYENTE EJEMPLO',
    ANIO_CTA: '2026',
    CONVENIO: '0014696',
    FECHA: '15/01/2020',
    descrip: 'FRACCIONAMIENTO',
    IMP_INSOL: 412.3,
    NUM_CUOTAS: 12,
    CUOTAS_PENDIENTES: 4,
    T_INSOL_CONVENIO: 288.61,
    SALDO: 293.79,
    ANIO_SALDO: '2026',
    MES_SALDO: mesSaldo,
  });

  beforeEach(async () => {
    db = { executeProcedure: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReporteFraccDetalladoService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = moduleRef.get(ReporteFraccDetalladoService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── search() ────────────────────────────────────────────────────────────

  it('llama a Rpt_Rentas_General con @BUSC=40 fijo y pagina de a 15', async () => {
    const rows = Array.from({ length: 34 }, (_, i) =>
      makeRow(String(2000000 + i)),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    expect(db.executeProcedure).toHaveBeenCalledWith(
      'Rentas.Rpt_Rentas_General',
      { BUSC: 40, CODIGO: '', ANNO: '2026', id_mes: 8 },
      undefined,
      60000,
    );
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(15);
    expect(res.total).toBe(34);
    expect(res.totalPages).toBe(3);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(15);
  });

  it('devuelve la ultima tanda al pedir la ultima pagina', async () => {
    const rows = Array.from({ length: 34 }, (_, i) =>
      makeRow(String(2000000 + i)),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const res = await service.search({
      page: 3,
      pageSize: 15,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    expect(res.data).toHaveLength(4);
    expect(res.data[0].CODIGO).toBe('2000030');
    expect(res.totalPages).toBe(3);
  });

  it('con 0 filas devuelve total 0 y totalPages 0 sin romper el envelope', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.totalPages).toBe(0);
  });

  it('manda el codigo parcial tal cual, sin rellenar ceros a la izquierda', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });

    await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '02002',
      Anno: '2026',
      IdMes: 8,
    });

    // El SP filtra con LIKE '%'+@CODIGO+'%': un codigo parcial es busqueda
    // valida y padCodigo la cambiaria.
    expect(db.executeProcedure).toHaveBeenCalledWith(
      'Rentas.Rpt_Rentas_General',
      { BUSC: 40, CODIGO: '02002', ANNO: '2026', id_mes: 8 },
      undefined,
      60000,
    );
  });

  it('manda CODIGO "" para no acotar cuando no se busca por codigo', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [makeRow('A'), makeRow('B')],
    });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    // Medido en la BD: CODIGO vacio = sin acotar, devuelve todas las filas
    // del corte (a diferencia de la rama @BUSC=42).
    expect(db.executeProcedure).toHaveBeenCalledWith(
      'Rentas.Rpt_Rentas_General',
      { BUSC: 40, CODIGO: '', ANNO: '2026', id_mes: 8 },
      undefined,
      60000,
    );
    expect(res.total).toBe(2);
  });

  it('manda id_mes sin ceros a la izquierda y como number', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });

    await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    // MES_SALDO es string de numero de mes: el filtro es exacto, '8' != '08'.
    const params = db.executeProcedure.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(params.id_mes).toBe(8);
    expect(params.id_mes).not.toBe('08');
  });

  it('mapea null a "" para no enviar null al frontend', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [
        {
          CODIGO: 'A',
          nombre: null,
          IMP_INSOL: null,
          MES_SALDO: 'NOVIEMBRE',
          // Columna extra sin tipar: se conserva igual.
          EXTRA: null,
        },
      ],
    });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    expect(res.data[0].nombre).toBe('');
    expect(res.data[0].IMP_INSOL).toBe('');
    expect(res.data[0].MES_SALDO).toBe('NOVIEMBRE');
    expect(res.data[0].EXTRA).toBe('');
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    db.executeProcedure.mockRejectedValue(new Error('boom'));

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    expect(res.success).toBe(false);
    expect(res.data).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.totalPages).toBe(0);
    expect(res.error).toBeDefined();
  });

  it('no pagina en export (pageSize=100000) y devuelve todo', async () => {
    const rows = Array.from({ length: 2137 }, (_, i) =>
      makeRow(String(2000000 + i)),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const res = await service.search({
      page: 1,
      pageSize: 100000,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    expect(res.data).toHaveLength(2137);
    expect(res.total).toBe(2137);
    expect(res.totalPages).toBe(1);
  });

  it('pide el mismo total con paginacion de grilla y de export', async () => {
    const rows = Array.from({ length: 2137 }, (_, i) =>
      makeRow(String(2000000 + i)),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const grilla = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });
    const exportado = await service.search({
      page: 1,
      pageSize: 100000,
      Codigo: '',
      Anno: '2026',
      IdMes: 8,
    });

    // Si estos difieren, el Excel no coincide con lo que muestra la grilla.
    expect(grilla.total).toBe(exportado.total);
  });

  it('nunca loguea el valor del CODIGO (identificador personal, R11)', async () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    db.executeProcedure.mockResolvedValue({
      recordset: [makeRow('SECRETO-1')],
    });

    await service.search({
      page: 1,
      pageSize: 15,
      Codigo: 'SECRETO',
      Anno: '2026',
      IdMes: 8,
    });

    const logged = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls]
      .map((call) => call.map(String).join(' '))
      .join('\n');
    expect(logged).not.toContain('SECRETO');
    // Se loguea si hubo codigo y su longitud, nunca el valor.
    expect(logged).toContain('7 chars');
  });

  // ── getCatalogos() ──────────────────────────────────────────────────────

  it('getCatalogos sin Anno solo pide los anios (@BUSC=38)', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [{ anio_saldo: '2026' }, { anio_saldo: '2025' }],
    });

    const res = await service.getCatalogos({});

    expect(db.executeProcedure).toHaveBeenCalledTimes(1);
    expect(db.executeProcedure).toHaveBeenCalledWith(
      'Rentas.Rpt_Rentas_General',
      { BUSC: 38 },
      undefined,
      60000,
    );
    expect(res.success).toBe(true);
    expect(res.anios).toEqual(['2026', '2025']);
    expect(res.meses).toEqual([]);
  });

  it('getCatalogos con Anno agrega los meses del año (@BUSC=39)', async () => {
    db.executeProcedure
      .mockResolvedValueOnce({
        recordset: [{ anio_saldo: '2026' }],
      })
      .mockResolvedValueOnce({
        recordset: [
          { id_mes: 1, nom_mes: 'ENERO' },
          { id_mes: '8', nom_mes: 'AGOSTO ' },
          { id_mes: 11, nom_mes: 'NOVIEMBRE' },
        ],
      });

    const res = await service.getCatalogos({ Anno: '2026' });

    expect(db.executeProcedure).toHaveBeenNthCalledWith(
      1,
      'Rentas.Rpt_Rentas_General',
      { BUSC: 38 },
      undefined,
      60000,
    );
    expect(db.executeProcedure).toHaveBeenNthCalledWith(
      2,
      'Rentas.Rpt_Rentas_General',
      { BUSC: 39, ANNO: '2026' },
      undefined,
      60000,
    );
    expect(res.success).toBe(true);
    // id_mes sale como number sin ceros a la izquierda: es la clave que la
    // búsqueda manda como @id_mes (igualdad exacta sobre MES_SALDO).
    expect(res.meses).toEqual([
      { id_mes: 1, nom_mes: 'ENERO' },
      { id_mes: 8, nom_mes: 'AGOSTO' },
      { id_mes: 11, nom_mes: 'NOVIEMBRE' },
    ]);
  });

  it('getCatalogos devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    db.executeProcedure.mockRejectedValue(new Error('boom'));

    const res = await service.getCatalogos({ Anno: '2026' });

    expect(res.success).toBe(false);
    expect(res.anios).toEqual([]);
    expect(res.meses).toEqual([]);
    expect(res.error).toBeDefined();
  });
});
