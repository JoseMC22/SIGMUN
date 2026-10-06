import { Test, TestingModule } from '@nestjs/testing';
import { AnularValorService } from './anular-valor.service';
import { DatabaseService } from '../../database/database.service';

/**
 * Blindan el contrato verificado de Rentas.ssp_Mcontribuyente @busc=5:
 * - Se llama con busc:5 + tipo_busqueda + los params del criterio.
 * - Sin COUNT en el SP: se trae todo lo filtrado y se pagina en memoria.
 * - Se muestran 8 columnas identificatorias; null se mapea a ''.
 */
describe('AnularValorService', () => {
  let service: AnularValorService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let executeProcedure: jest.Mock<any, any>;

  // Fila cruda tal como la devuelve @busc=5 (subconjunto relevante + extras
  // que se descartan).
  const rawRow = (over: object = {}) => ({
    codigo: '0279126',
    id_pers: '01',
    id_docu: '01',
    num_doc: '19082855',
    nombres: 'MANUEL FERNANDO Y SRA',
    paterno: 'VAEZ CARDENAS',
    materno: '',
    documento: 'DNI',
    DireFis: 'URB. LA RINCONADA MZ B LTE 13',
    TipoPersona: 'NATURAL',
    nestado: 1,
    operador: 'mvaez',
    ROW: 1,
    ...over,
  });

  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      rawRow({ codigo: `C${String(i).padStart(6, '0')}` }),
    );

  const baseDto = {
    page: 1,
    pageSize: 15 as const,
    TipoBusqueda: 'C' as const,
    Codigo: '',
    Paterno: '',
    Materno: '',
    Nombres: '',
    Razon: '',
    NumDoc: '',
  };

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

  it('llama a ssp_Mcontribuyente con busc:5, tipo y params del criterio', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: rows(2) });

    await service.search({ ...baseDto, TipoBusqueda: 'C', Codigo: '0279126' });

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(executeProcedure.mock.calls[0][0]).toBe(
      'Rentas.ssp_Mcontribuyente',
    );
    expect(executeProcedure.mock.calls[0][1]).toMatchObject({
      busc: 5,
      tipo_busqueda: 'C',
      codigo: '0279126',
      inicio: 0,
      final: 0,
    });
  });

  it('manda paterno/materno/nombres para tipo N', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: rows(1) });

    await service.search({
      ...baseDto,
      TipoBusqueda: 'N',
      Paterno: 'vasquez',
      Materno: '',
      Nombres: 'juan',
    });

    const params = executeProcedure.mock.calls[0][1];
    expect(params).toMatchObject({
      tipo_busqueda: 'N',
      paterno: 'vasquez',
      materno: '',
      nombres: 'juan',
    });
  });

  it('manda razon para tipo R y num_doc para tipo D', async () => {
    executeProcedure.mockResolvedValue({ recordset: rows(1) });

    await service.search({ ...baseDto, TipoBusqueda: 'R', Razon: 'municipalidad' });
    expect(executeProcedure.mock.calls[0][1]).toMatchObject({
      tipo_busqueda: 'R',
      razon: 'municipalidad',
    });

    await service.search({ ...baseDto, TipoBusqueda: 'D', NumDoc: '19082855' });
    expect(executeProcedure.mock.calls[1][1]).toMatchObject({
      tipo_busqueda: 'D',
      num_doc: '19082855',
    });
  });

  it('mapea las 8 columnas y descarta el resto (ROW, nestado, auditoria)', async () => {
    executeProcedure.mockResolvedValueOnce({ recordset: [rawRow()] });

    const res = await service.search(baseDto);

    expect(res.data[0]).toEqual({
      codigo: '0279126',
      nombres: 'MANUEL FERNANDO Y SRA',
      paterno: 'VAEZ CARDENAS',
      materno: '',
      documento: 'DNI',
      num_doc: '19082855',
      DireFis: 'URB. LA RINCONADA MZ B LTE 13',
      TipoPersona: 'NATURAL',
    });
    expect(res.data[0]).not.toHaveProperty('ROW');
    expect(res.data[0]).not.toHaveProperty('nestado');
    expect(res.data[0]).not.toHaveProperty('operador');
  });

  it('mapea null a ""', async () => {
    executeProcedure.mockResolvedValueOnce({
      recordset: [rawRow({ materno: null, DireFis: null })],
    });

    const res = await service.search(baseDto);

    expect(res.data[0].materno).toBe('');
    expect(res.data[0].DireFis).toBe('');
  });

  it('pagina en memoria de a 15', async () => {
    executeProcedure.mockResolvedValue({ recordset: rows(32) });

    const p1 = await service.search({ ...baseDto, page: 1 });
    expect(p1.data).toHaveLength(15);
    expect(p1.total).toBe(32);
    expect(p1.totalPages).toBe(3);

    const p3 = await service.search({ ...baseDto, page: 3 });
    expect(p3.data).toHaveLength(2);
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    executeProcedure.mockRejectedValueOnce(new Error('boom'));

    const res = await service.search(baseDto);

    expect(res.success).toBe(false);
    expect(res.data).toEqual([]);
    expect(res.error).toBeTruthy();
  });
});
