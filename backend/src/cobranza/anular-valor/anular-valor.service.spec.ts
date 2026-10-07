import { Test, TestingModule } from '@nestjs/testing';
import { AnularValorService } from './anular-valor.service';
import { DatabaseService } from '../../database/database.service';

/**
 * Contrato DJ aplicado a anular-valor (mismo SP de DJ):
 * - Rentas.sp_Mcontribuyente con busc:6 (COUNT) + busc:5 (página,
 *   inicio/final String 1-based inclusivo), igual que
 *   declaracion-jurada.service.ts standard mode.
 * - sp_ no devuelve TipoPersona (era computada de ssp_): se mapea ''.
 * - Se muestran 8 columnas; null se mapea a ''.
 */
describe('AnularValorService', () => {
  let service: AnularValorService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let executeProcedure: jest.Mock<any, any>;

  // Fila cruda tal como la devuelve sp_Mcontribuyente @busc=5 (subconjunto
  // relevante + extras que se descartan). No trae TipoPersona.
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
    tipo_detalle: 'NATURAL',
    Gestion: '2026',
    nestado: 1,
    operador: 'mvaez',
    ROW: 1,
    ...over,
  });

  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      rawRow({ codigo: `C${String(i).padStart(6, '0')}` }),
    );

  // COUNT @busc=6 devuelve el total en la primera columna de la primera fila.
  const countRes = (total: number) => ({ recordset: [{ total }] });

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

  it('pide COUNT (busc:6) y página (busc:5) al mismo SP de DJ', async () => {
    executeProcedure
      .mockResolvedValueOnce(countRes(32))
      .mockResolvedValueOnce({ recordset: rows(15) });

    await service.search({ ...baseDto, TipoBusqueda: 'C', Codigo: '0279126' });

    expect(executeProcedure).toHaveBeenCalledTimes(2);
    expect(executeProcedure.mock.calls[0][0]).toBe('Rentas.sp_Mcontribuyente');
    expect(executeProcedure.mock.calls[0][1]).toMatchObject({
      busc: 6,
      tipo_busqueda: 'C',
      codigo: '0279126',
    });
    expect(executeProcedure.mock.calls[1][0]).toBe('Rentas.sp_Mcontribuyente');
    expect(executeProcedure.mock.calls[1][1]).toMatchObject({
      busc: 5,
      tipo_busqueda: 'C',
      codigo: '0279126',
      inicio: '1',
      final: '15',
    });
  });

  it('calcula inicio/final String 1-based por página (p3: 31..45)', async () => {
    executeProcedure
      .mockResolvedValueOnce(countRes(32))
      .mockResolvedValueOnce({ recordset: rows(2) });

    const res = await service.search({ ...baseDto, page: 3 });

    expect(executeProcedure.mock.calls[1][1]).toMatchObject({
      inicio: '31',
      final: '45',
    });
    expect(res).toMatchObject({ total: 32, totalPages: 3, page: 3 });
  });

  it('manda paterno/materno/nombres para tipo N', async () => {
    executeProcedure
      .mockResolvedValueOnce(countRes(1))
      .mockResolvedValueOnce({ recordset: rows(1) });

    await service.search({
      ...baseDto,
      TipoBusqueda: 'N',
      Paterno: 'vasquez',
      Materno: '',
      Nombres: 'juan',
    });

    for (const call of executeProcedure.mock.calls) {
      expect(call[1]).toMatchObject({
        tipo_busqueda: 'N',
        paterno: 'vasquez',
        materno: '',
        nombres: 'juan',
      });
    }
  });

  it('manda razon para tipo R y num_doc para tipo D', async () => {
    executeProcedure
      .mockResolvedValueOnce(countRes(1))
      .mockResolvedValueOnce({ recordset: rows(1) })
      .mockResolvedValueOnce(countRes(1))
      .mockResolvedValueOnce({ recordset: rows(1) });

    await service.search({ ...baseDto, TipoBusqueda: 'R', Razon: 'municipalidad' });
    expect(executeProcedure.mock.calls[0][1]).toMatchObject({
      tipo_busqueda: 'R',
      razon: 'municipalidad',
    });

    await service.search({ ...baseDto, TipoBusqueda: 'D', NumDoc: '19082855' });
    expect(executeProcedure.mock.calls[2][1]).toMatchObject({
      tipo_busqueda: 'D',
      num_doc: '19082855',
    });
  });

  it('mapea las 8 columnas (TipoPersona "" porque sp_ no la trae) y descarta el resto', async () => {
    executeProcedure
      .mockResolvedValueOnce(countRes(1))
      .mockResolvedValueOnce({ recordset: [rawRow()] });

    const res = await service.search(baseDto);

    expect(res.data[0]).toEqual({
      codigo: '0279126',
      nombres: 'MANUEL FERNANDO Y SRA',
      paterno: 'VAEZ CARDENAS',
      materno: '',
      documento: 'DNI',
      num_doc: '19082855',
      DireFis: 'URB. LA RINCONADA MZ B LTE 13',
      TipoPersona: '',
    });
    expect(res.data[0]).not.toHaveProperty('ROW');
    expect(res.data[0]).not.toHaveProperty('nestado');
    expect(res.data[0]).not.toHaveProperty('operador');
  });

  it('mapea null a ""', async () => {
    executeProcedure
      .mockResolvedValueOnce(countRes(1))
      .mockResolvedValueOnce({
        recordset: [rawRow({ materno: null, DireFis: null })],
      });

    const res = await service.search(baseDto);

    expect(res.data[0].materno).toBe('');
    expect(res.data[0].DireFis).toBe('');
  });

  it('total 0: no pide la página y devuelve vacío', async () => {
    executeProcedure.mockResolvedValueOnce(countRes(0));

    const res = await service.search(baseDto);

    expect(executeProcedure).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ success: true, data: [], total: 0, totalPages: 0 });
  });

  it('export (pageSize=100000): COUNT + un fetch 1..total', async () => {
    executeProcedure
      .mockResolvedValueOnce(countRes(32))
      .mockResolvedValueOnce({ recordset: rows(32) });

    const res = await service.search({ ...baseDto, pageSize: 100000 });

    expect(executeProcedure.mock.calls[1][1]).toMatchObject({
      busc: 5,
      inicio: '1',
      final: '32',
    });
    expect(res).toMatchObject({ total: 32, totalPages: 1 });
  });

  it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
    executeProcedure.mockRejectedValueOnce(new Error('boom'));

    const res = await service.search(baseDto);

    expect(res.success).toBe(false);
    expect(res.data).toEqual([]);
    expect(res.error).toBeTruthy();
  });

  describe('getValores', () => {
    const rawValor = (over: object = {}) => ({
      codigo: '0279126',
      nombre: 'VAEZ CARDENAS MANUEL FERNANDO Y SRA',
      nomb_val: 'Orden de Pago Predial',
      num_val: '0018351',
      ano_val: '2024',
      MontoTotal: 480.35,
      fec_val: '19/11/2024',
      id_valor: '01',
      num_exp: '0000055',
      ano_exp: '2026',
      nestado: 'Pendiente',
      fec_vence: '19/11/2024',
      id_mvalores: 115169,
      motivo: '',
      operador: '',
      fecha: '1900-01-01',
      ROW: 1,
      ...over,
    });

    it('llama a ssp_Consultadocu con msquery:3 y el codigo', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [rawValor()] });

      const res = await service.getValores('0279126');

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure.mock.calls[0][0]).toBe(
        'Rentas.ssp_Consultadocu',
      );
      expect(executeProcedure.mock.calls[0][1]).toMatchObject({
        msquery: 3,
        codigo: '0279126',
        inicio: 0,
        final: 0,
      });
      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
    });

    it('mapea estado resuelto, id_mvalores y fecha 1900 a ""', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [rawValor()] });

      const res = await service.getValores('0279126');

      expect(res.data[0].nestado).toBe('Pendiente');
      expect(res.data[0].id_mvalores).toBe(115169);
      expect(res.data[0].fecha).toBe('');
      expect(res.data[0].MontoTotal).toBe(480.35);
      expect(res.data[0]).not.toHaveProperty('ROW');
    });

    it('devuelve { success:false, error } sin throw cuando el SP falla', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getValores('0279126');

      expect(res.success).toBe(false);
      expect(res.data).toEqual([]);
      expect(res.error).toBeTruthy();
    });
  });

  /**
   * Contrato verificado de la fase 2 (Rentas.ssp_Mvalores @msquery=10):
   * - El SP NO devuelve resultset: el exito se confirma re-leyendo @msquery=3.
   * - Solo se anula si el estado actual es 'Pendiente' (sin tocar la BD si no).
   * - @observacion = motivo (250) y @id_user = operador.
   */
  describe('anularValor', () => {
    const dto = {
      Codigo: '0279126',
      IdValor: '01',
      NumVal: '0018351',
      AnoVal: '2024',
      Motivo: 'Error de carga del valor en el periodo 2024',
      Operador: 'mvaez',
    };

    const consultaParams = {
      msquery: 3,
      codigo: '0279126',
      id_valor: '01',
      num_val: '0018351',
      ano_val: '2024',
      inicio: 0,
      final: 0,
    };

    const valorConEstado = (nestado: string) => ({
      recordset: [
        {
          codigo: '0279126',
          id_valor: '01',
          num_val: '0018351',
          ano_val: '2024',
          nestado,
          MontoTotal: 480.35,
          ROW: 1,
        },
      ],
    });

    /**
     * El mock es jest.Mock<any, any>: sin este casteo, acceder a
     * calls[i][1] dispara no-unsafe-member-access en cada aserción.
     */
    const llamadas = (): [string, Record<string, unknown>][] =>
      executeProcedure.mock.calls as [string, Record<string, unknown>][];

    it('pendiente: lee, ejecuta msquery:10 y confirma Anulado', async () => {
      executeProcedure
        .mockResolvedValueOnce(valorConEstado('Pendiente'))
        // ssp_Mvalores @msquery=10 no devuelve resultset
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce(valorConEstado('Anulado'));

      const res = await service.anularValor(dto);

      expect(res).toEqual({
        success: true,
        message: 'Valor anulado correctamente',
      });
      expect(executeProcedure).toHaveBeenCalledTimes(3);

      const [consulta, escritura, confirmacion] = llamadas();
      expect(consulta[0]).toBe('Rentas.ssp_Consultadocu');
      expect(consulta[1]).toMatchObject(consultaParams);

      expect(escritura[0]).toBe('Rentas.ssp_Mvalores');
      expect(escritura[1]).toMatchObject({
        msquery: 10,
        id_valor: '01',
        num_val: '0018351',
        ano_val: '2024',
        codigo: '0279126',
        observacion: dto.Motivo,
        id_user: 'mvaez',
      });

      expect(confirmacion[0]).toBe('Rentas.ssp_Consultadocu');
      expect(confirmacion[1]).toMatchObject(consultaParams);
    });

    it('no pendiente: nunca ejecuta ssp_Mvalores @msquery=10', async () => {
      executeProcedure.mockResolvedValueOnce(valorConEstado('Pagado'));

      const res = await service.anularValor(dto);

      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'Solo se pueden anular valores en estado Pendiente',
      );
      expect(executeProcedure).toHaveBeenCalledTimes(1);
      const escribioNoPendiente = llamadas().some(
        ([sp]) => sp === 'Rentas.ssp_Mvalores',
      );
      expect(escribioNoPendiente).toBe(false);
    });

    it('valor inexistente: "Valor no encontrado" sin escribir', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      const res = await service.anularValor(dto);

      expect(res).toEqual({ success: false, error: 'Valor no encontrado' });
      expect(executeProcedure).toHaveBeenCalledTimes(1);
      const escribioInexistente = llamadas().some(
        ([sp]) => sp === 'Rentas.ssp_Mvalores',
      );
      expect(escribioInexistente).toBe(false);
    });

    it('el re-lee no da Anulado: success false sin throw', async () => {
      executeProcedure
        .mockResolvedValueOnce(valorConEstado('Pendiente'))
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce(valorConEstado('Pendiente'));

      const res = await service.anularValor(dto);

      expect(res).toEqual({
        success: false,
        error: 'No se pudo confirmar la anulación',
      });
      expect(executeProcedure).toHaveBeenCalledTimes(3);
    });

    it('el SP tira: success false con "Error al anular el valor" sin throw', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.anularValor(dto);

      expect(res).toEqual({
        success: false,
        error: 'Error al anular el valor',
      });
      expect(executeProcedure).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Lectura del motivo de anulación (Rentas.SP_Mvalores @msquery=14):
   * devuelve los textos de observacion (0..N filas de una columna).
   */
  describe('getMotivo', () => {
    const key = { IdValor: '01', NumVal: '0018351', AnoVal: '2024' };

    it('llama a SP_Mvalores con msquery:14 y la llave', async () => {
      executeProcedure.mockResolvedValueOnce({
        recordset: [{ observacion: 'Error de carga  ' }],
      });

      const res = await service.getMotivo(key);

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure.mock.calls[0][0]).toBe('Rentas.SP_Mvalores');
      expect(executeProcedure.mock.calls[0][1]).toMatchObject({
        msquery: 14,
        id_valor: '01',
        num_val: '0018351',
        ano_val: '2024',
      });
      expect(res).toEqual({ success: true, data: ['Error de carga'], total: 1 });
    });

    it('devuelve todos los motivos y descarta vacíos', async () => {
      executeProcedure.mockResolvedValueOnce({
        recordset: [
          { observacion: 'Primer motivo' },
          { observacion: '   ' },
          { observacion: null },
          { observacion: 'Segundo motivo' },
        ],
      });

      const res = await service.getMotivo(key);

      expect(res).toEqual({
        success: true,
        data: ['Primer motivo', 'Segundo motivo'],
        total: 2,
      });
    });

    it('sin filas: success true con data vacía (no es error)', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      const res = await service.getMotivo(key);

      expect(res).toEqual({ success: true, data: [], total: 0 });
    });

    it('el SP tira: success false sin throw', async () => {
      executeProcedure.mockRejectedValueOnce(new Error('boom'));

      const res = await service.getMotivo(key);

      expect(res).toEqual({
        success: false,
        data: [],
        total: 0,
        error: 'Error al consultar el motivo',
      });
    });
  });
});
