import { Test } from '@nestjs/testing';
import { ReporteFraccCuotasImpagasService } from './reporte-fracc-cuotas-impagas.service';
import { DatabaseService } from '../../database/database.service';

describe('ReporteFraccCuotasImpagasService', () => {
  let service: ReporteFraccCuotasImpagasService;
  let db: { executeProcedure: jest.Mock };

  // Fila con el shape real que devuelve la rama @BUSC=42. 'F.Convenio' viene
  // dd/mm/yyyy y 'codigos' no: el SP no lo convierte, lo emite el datamart.
  const makeRow = (
    codigo: string,
    fConveio: string | null,
    estado = 'En Solicitud',
  ) => ({
    Codigo: codigo,
    Nombre: 'CONTRIBUYENTE',
    Direccion: 'AV. PRINCIPAL 123',
    'Año': 2016,
    Convenio: '0014696',
    'F.Convenio': fConveio,
    Deuda: 412.3,
    'C.Inicial': 123.69,
    Cuotas: '04',
    Pendientes: 4,
    Vencidas: 4,
    'Ins Vencido': 288.61,
    'Mora Ven': 293.79,
    curren_date: '04/10/2023',
    estado_frac: estado,
  });

  beforeEach(async () => {
    db = { executeProcedure: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReporteFraccCuotasImpagasService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = moduleRef.get(ReporteFraccCuotasImpagasService);
  });

  it('llama a Rpt_Rentas_General con @BUSC=42 fijo y pagina de a 15', async () => {
    const rows = Array.from({ length: 34 }, (_, i) =>
      makeRow(String(2000000 + i), '15/01/2020'),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '',
    });

    expect(db.executeProcedure).toHaveBeenCalledWith(
      'Rentas.Rpt_Rentas_General',
      { BUSC: 42, CODIGO: '', FECH_INI: '' },
      undefined,
      60000,
    );
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(15);
    expect(res.total).toBe(34);
    expect(res.totalPages).toBe(3);
  });

  it('devuelve la ultima tanda al pedir la ultima pagina', async () => {
    const rows = Array.from({ length: 34 }, (_, i) =>
      makeRow(String(2000000 + i), '15/01/2020'),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const res = await service.search({
      page: 3,
      pageSize: 15,
      Codigo: '',
      FechCorte: '',
    });

    expect(res.data).toHaveLength(4);
    expect(res.data[0].Codigo).toBe('2000030');
  });

  it('manda el codigo tal cual para que el SP filtre', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });

    await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '0200274',
      FechCorte: '',
    });

    expect(db.executeProcedure).toHaveBeenCalledWith(
      'Rentas.Rpt_Rentas_General',
      { BUSC: 42, CODIGO: '0200274', FECH_INI: '' },
      undefined,
      60000,
    );
  });

  it('convierte la fecha de corte a dd/mm/yyyy antes de mandarla al SP', async () => {
    db.executeProcedure.mockResolvedValue({ recordset: [] });

    await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '2026-03-09',
    });

    expect(db.executeProcedure).toHaveBeenCalledWith(
      'Rentas.Rpt_Rentas_General',
      // El SP espera dd/mm/yyyy en sus ramas con fecha (rama 41: fecha<=@FECH_INI).
      { BUSC: 42, CODIGO: '', FECH_INI: '09/03/2026' },
      undefined,
      60000,
    );
  });

  it('filtra por fecha de corte sobre F.Convenio, en orden cronologico real', async () => {
    // Montado a proposito contra un comparador de strings: '15/11/2003' > '30/09/2016'
    // es true, asi que un filtro ingenuo deja pasar la fila de 2003 y descarta la de 2016.
    db.executeProcedure.mockResolvedValue({
      recordset: [
        makeRow('A', '15/11/2003'),
        makeRow('B', '30/09/2016'),
        makeRow('C', '09/03/2026'),
      ],
    });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '2026-12-31',
    });

    expect(res.total).toBe(3);
    expect(res.data.map((r) => r.Codigo)).toEqual(['A', 'B', 'C']);
  });

  it('excluye los convenios posteriores a la fecha de corte', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [
        makeRow('A', '15/11/2003'),
        makeRow('B', '30/09/2016'),
        makeRow('C', '09/03/2026'),
      ],
    });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '2016-09-30',
    });

    expect(res.total).toBe(2);
    expect(res.data.map((r) => r.Codigo)).toEqual(['A', 'B']);
  });

  it('cuenta como dentro del corte un convenio del mismo dia del limite', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [
        makeRow('A', '15/11/2003'),
        makeRow('B', '31/01/2016'),
        makeRow('C', '09/03/2026'),
      ],
    });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '2020-01-01',
    });

    expect(res.total).toBe(2);
    expect(res.data.map((r) => r.Codigo)).toEqual(['A', 'B']);
  });

  it('excluye y no rompe las filas sin F.Convenio legible cuando hay fecha de corte', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [
        makeRow('A', '15/11/2003'),
        makeRow('SIN_FECHA', ''),
        makeRow('NULA', null),
        makeRow('TEXTO', 'no-es-fecha'),
      ],
    });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '2026-12-31',
    });

    expect(res.total).toBe(1);
    expect(res.data[0].Codigo).toBe('A');
  });

  it('no aplica filtro de fecha cuando la fecha de corte viene vacia', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [
        makeRow('A', '15/11/2003'),
        makeRow('SIN_FECHA', ''),
        makeRow('FUTURO', '01/01/2099'),
      ],
    });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '',
    });

    expect(res.total).toBe(3);
  });

  it('mapea null a "" para no enviar null al frontend', async () => {
    db.executeProcedure.mockResolvedValue({
      recordset: [{ Codigo: 'A', 'Año': null, Nombre: null, Deuda: null }],
    });

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '',
    });

    expect(res.data[0]['Año']).toBe('');
    expect(res.data[0].Nombre).toBe('');
    expect(res.data[0].Deuda).toBe('');
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    db.executeProcedure.mockRejectedValue(new Error('boom'));

    const res = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '',
    });

    expect(res.success).toBe(false);
    expect(res.data).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.error).toBeDefined();
  });

  it('no pagina en export (pageSize=100000) y devuelve todo', async () => {
    const rows = Array.from({ length: 2137 }, (_, i) =>
      makeRow(String(2000000 + i), '15/01/2020'),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const res = await service.search({
      page: 1,
      pageSize: 100000,
      Codigo: '',
      FechCorte: '',
    });

    expect(res.data).toHaveLength(2137);
    expect(res.totalPages).toBe(1);
  });

  it('pidea el mismo total con paginacion de grilla y de export', async () => {
    const rows = Array.from({ length: 2137 }, (_, i) =>
      makeRow(String(2000000 + i), '15/01/2020'),
    );
    db.executeProcedure.mockResolvedValue({ recordset: rows });

    const grilla = await service.search({
      page: 1,
      pageSize: 15,
      Codigo: '',
      FechCorte: '',
    });
    const export_ = await service.search({
      page: 1,
      pageSize: 100000,
      Codigo: '',
      FechCorte: '',
    });

    // Si estos difieren, el Excel no coincide con lo que muestra la grilla.
    expect(grilla.total).toBe(export_.total);
  });
});