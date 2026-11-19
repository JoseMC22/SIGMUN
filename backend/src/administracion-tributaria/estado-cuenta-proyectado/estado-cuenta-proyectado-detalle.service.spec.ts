import { DatabaseService } from '../../database/database.service';
import { ConsultaDetalleEstadoCuentaProyectadoDto } from './dto/get-estado-cuenta-proyectado.dto';
import {
  EstadoCuentaProyectadoDetalleService,
  mapDetalleReciboProyectado,
  normalizeEstadoRecibo,
  toSpFechaProyectada,
} from './estado-cuenta-proyectado-detalle.service';
import {
  SpDetalleReciboProyectadoRow,
  SpReciboEmitidoProyectadoRow,
} from './estado-cuenta-proyectado-detalle.types';

type ExecuteProcedureMock = jest.Mock<
  Promise<unknown>,
  [procedure: string, params: Record<string, unknown>]
>;

const SP_CABECERA = 'dbo.store_caja_framework';
const SP_FECHA = 'dbo.sp_ActualizaInteres_proyectada';
const SP_RECIBOS = 'Caja.sp_Recibos_emitidos';
const SP_DETALLE = 'Caja.sp_EstCta_Rentas_proyectado_2022';

const CODIGO = '0000123';

/** Real named recordset from store_caja_framework @msquery=1. */
const CABECERA_ROW: Readonly<Record<string, unknown>> = {
  codigo: CODIGO,
  nombre: 'JUAN PEREZ LOPEZ',
  dirfiscal: 'AV. CENTRAL 123',
  num_doc: '12345678',
  flag_fraccionamiento: '0',
};

/** Real named recordsets from store_caja_framework @msquery=5/6/15. */
const PERIODO_ROW: Readonly<Record<string, unknown>> = {
  minimo: 1,
  maximo: 12,
};
const ANNO_ROW: Readonly<Record<string, unknown>> = {
  minimo: 2020,
  maximo: 2026,
};
const PREDIO_ROW: Readonly<Record<string, unknown>> = {
  // The SP SELECT duplicates `codigo`; only these four aliases may be read.
  codigo: 'DUPLICATED-IGNORE-ME',
  cod_pred: '001-001',
  anexo1: '00',
  direccion: 'AV. CENTRAL 123',
  anno: 2025,
};

/** A bare SELECT expression comes back under the empty column name. */
const FECHA_ROW: Readonly<Record<string, unknown>> = {
  '': '17/11/2026',
};

/** Real named recordset from sp_Recibos_emitidos @buscar=1. */
const RECIBO_CANCELADO_ROW: SpReciboEmitidoProyectadoRow = {
  num_ingr: '100',
  codigo: CODIGO,
  caja: '01',
  fec_pago: '17/11/2026',
  monto: 120.5,
  // mssql keeps the last of the two duplicated `estado` aliases: the text one.
  estado: 'Cancelado',
  operador: 'OP1',
};
const RECIBO_ANULADO_ROW: SpReciboEmitidoProyectadoRow = {
  ...RECIBO_CANCELADO_ROW,
  num_ingr: '101',
  estado: 'Anulado',
};

/** Real named recordset from sp_EstCta_Rentas_proyectado_2022. */
const DETALLE_ROW: SpDetalleReciboProyectadoRow = {
  idrecibo: 10,
  codigo: CODIGO,
  tipo: '11.00',
  anno: 2025,
  cod_pred: '001-001',
  anexo: ' 01 ',
  sub_anexo: ' 02 ',
  tipo_docu: '04',
  num_docu: '12345678',
  tipo_rec: '02.01',
  periodo: '202501',
  imp_insol: '100.00',
  costo_emis: '5.00',
  fact_reaj: '1.1000',
  imp_reaj: '110.00',
  fact_mora: '1.0500',
  mora: '10.00',
  observacion: '',
  estado: '0',
  ubica_2: 'UBICACION REAL',
  fec_venc: '17/11/2026',
  num_ingr: '100',
  operador: 'OP1',
  estacion: '01',
  fech_ing: '17/11/2026',
  // Deliberately different from ubica_2: the grid must use ubica_2.
  ubica: 'VALOR SP NO USADO',
  fec_pago: '',
  des_tipo: 'PREDIAL',
  des_cabecera: 'IMPUESTO PREDIAL',
  criterio: '0',
  descuento: '2.50',
  tot_pago: '20.00',
  tipocontri: '01',
};

const CONSULTA_DTO: ConsultaDetalleEstadoCuentaProyectadoDto = {
  codigo: CODIGO,
  annos: ['2025', '2026'],
  tipos: ['*02.01*', '*00.16*'],
  tiporec: '',
  perio: '',
  predio: '',
  estado: '0',
  fecha_proyectada: '17/11/2026',
};

describe('EstadoCuentaProyectadoDetalleService', () => {
  let executeProcedure: ExecuteProcedureMock;
  let service: EstadoCuentaProyectadoDetalleService;

  beforeEach(() => {
    executeProcedure = jest.fn<Promise<unknown>, [string, Record<string, unknown>]>();
    const db = { executeProcedure } as unknown as DatabaseService;
    service = new EstadoCuentaProyectadoDetalleService(db);
  });

  function boundParams(callIndex: number): Record<string, unknown> {
    return executeProcedure.mock.calls[callIndex][1];
  }

  function allParamKeys(): string[] {
    return executeProcedure.mock.calls.flatMap(([, params]) => Object.keys(params));
  }

  describe('getCabecera', () => {
    it('binds msquery=1 and codigo as named parameters without @', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [CABECERA_ROW] });

      await service.getCabecera(CODIGO);

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).toHaveBeenCalledWith(SP_CABECERA, {
        msquery: 1,
        codigo: CODIGO,
      });
      expect(Object.keys(boundParams(0))).toEqual(['msquery', 'codigo']);
      expect(allParamKeys().filter((key) => key.startsWith('@'))).toEqual([]);
    });

    it('maps nombre and every cabecera field by column name', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [CABECERA_ROW] });

      const result = await service.getCabecera(CODIGO);

      expect(result).toEqual({
        codigo: CODIGO,
        nombre: 'JUAN PEREZ LOPEZ',
        dirfiscal: 'AV. CENTRAL 123',
        num_doc: '12345678',
        flag_fraccionamiento: '0',
      });
    });

    it('reads the named column even when unrelated positional keys are present', async () => {
      executeProcedure.mockResolvedValueOnce({
        recordset: [{ '0': 'WRONG', '1': 'WRONG', ...CABECERA_ROW }],
      });

      const result = await service.getCabecera(CODIGO);

      expect(result.nombre).toBe('JUAN PEREZ LOPEZ');
    });

    it('returns an empty cabecera when the SP returns no row', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      expect(await service.getCabecera(CODIGO)).toEqual({
        codigo: '',
        nombre: '',
        dirfiscal: '',
        num_doc: '',
        flag_fraccionamiento: '',
      });
    });
  });

  describe('getCatalogos', () => {
    it('calls msquery=5/6/15 and buscar=2 in order with named parameters', async () => {
      executeProcedure
        .mockResolvedValueOnce({ recordset: [PERIODO_ROW] })
        .mockResolvedValueOnce({ recordset: [ANNO_ROW] })
        .mockResolvedValueOnce({ recordset: [PREDIO_ROW] })
        .mockResolvedValueOnce({ recordset: [FECHA_ROW] });

      await service.getCatalogos(CODIGO);

      expect(executeProcedure).toHaveBeenCalledTimes(4);
      expect(executeProcedure).toHaveBeenNthCalledWith(1, SP_CABECERA, {
        msquery: 5,
        codigo: CODIGO,
      });
      expect(executeProcedure).toHaveBeenNthCalledWith(2, SP_CABECERA, {
        msquery: 6,
        codigo: CODIGO,
      });
      expect(executeProcedure).toHaveBeenNthCalledWith(3, SP_CABECERA, {
        msquery: 15,
        codigo: CODIGO,
      });
      expect(executeProcedure).toHaveBeenNthCalledWith(4, SP_FECHA, { buscar: 2 });
      expect(allParamKeys().filter((key) => key.startsWith('@'))).toEqual([]);
    });

    it('maps period and year ranges and the dd/mm/yyyy projection date', async () => {
      executeProcedure
        .mockResolvedValueOnce({ recordset: [PERIODO_ROW] })
        .mockResolvedValueOnce({ recordset: [ANNO_ROW] })
        .mockResolvedValueOnce({ recordset: [PREDIO_ROW] })
        .mockResolvedValueOnce({ recordset: [FECHA_ROW] });

      const result = await service.getCatalogos(CODIGO);

      expect(result.periodos).toEqual({ minimo: '1', maximo: '12' });
      expect(result.annos).toEqual({ minimo: '2020', maximo: '2026' });
      expect(result.fechaProyectada).toBe('17/11/2026');
    });

    it('reads only cod_pred/anexo1/direccion/anno from msquery=15', async () => {
      executeProcedure
        .mockResolvedValueOnce({ recordset: [PERIODO_ROW] })
        .mockResolvedValueOnce({ recordset: [ANNO_ROW] })
        .mockResolvedValueOnce({ recordset: [PREDIO_ROW] })
        .mockResolvedValueOnce({ recordset: [FECHA_ROW] });

      const result = await service.getCatalogos(CODIGO);

      expect(result.predios).toEqual([
        {
          cod_pred: '001-001',
          anexo1: '00',
          direccion: 'AV. CENTRAL 123',
          anno: '2025',
        },
      ]);
      expect(JSON.stringify(result.predios)).not.toContain('DUPLICATED-IGNORE-ME');
    });

    it('uses safe empty defaults when the catalog procedures return nothing', async () => {
      executeProcedure
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      expect(await service.getCatalogos(CODIGO)).toEqual({
        periodos: { minimo: '', maximo: '' },
        annos: { minimo: '', maximo: '' },
        predios: [],
        fechaProyectada: '',
      });
    });
  });

  describe('getRecibos', () => {
    it('binds buscar=1 and codigo as named parameters', async () => {
      executeProcedure.mockResolvedValueOnce({
        recordset: [RECIBO_CANCELADO_ROW],
      });

      await service.getRecibos(CODIGO);

      expect(executeProcedure).toHaveBeenCalledWith(SP_RECIBOS, {
        buscar: 1,
        codigo: CODIGO,
      });
      expect(Object.keys(boundParams(0))).toEqual(['buscar', 'codigo']);
      expect(allParamKeys().filter((key) => key.startsWith('@'))).toEqual([]);
    });

    it('maps receipt fields by name and keeps the SP-provided fec_pago', async () => {
      executeProcedure.mockResolvedValueOnce({
        recordset: [RECIBO_CANCELADO_ROW],
      });

      expect(await service.getRecibos(CODIGO)).toEqual([
        {
          num_ingr: '100',
          codigo: CODIGO,
          caja: '01',
          fec_pago: '17/11/2026',
          monto: '120.5',
          estado: 'Cancelado',
          operador: 'OP1',
        },
      ]);
    });

    it('normalizes text and numeric estado values without exposing the numeric duplicate', async () => {
      executeProcedure.mockResolvedValueOnce({
        recordset: [
          RECIBO_CANCELADO_ROW,
          RECIBO_ANULADO_ROW,
          { ...RECIBO_CANCELADO_ROW, num_ingr: '102', estado: '1' },
          { ...RECIBO_CANCELADO_ROW, num_ingr: '103', estado: 1 },
          { ...RECIBO_CANCELADO_ROW, num_ingr: '104', estado: '0' },
          { ...RECIBO_CANCELADO_ROW, num_ingr: '105', estado: 0 },
        ],
      });

      const rows = await service.getRecibos(CODIGO);

      expect(rows.map((row) => row.estado)).toEqual([
        'Cancelado',
        'Anulado',
        'Cancelado',
        'Cancelado',
        'Anulado',
        'Anulado',
      ]);
      expect(rows.some((row) => row.estado === '1' || row.estado === '0')).toBe(false);
    });

    it('returns an empty list when no receipts were issued', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      expect(await service.getRecibos(CODIGO)).toEqual([]);
    });
  });

  describe('consulta', () => {
    it('binds the exact SP name and all nine named parameters without @', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [DETALLE_ROW] });

      await service.consulta(CONSULTA_DTO);

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).toHaveBeenCalledWith(SP_DETALLE, {
        codigo: CODIGO,
        annos: '2025,2026',
        tipos: '*02.01*,*00.16*',
        tiporec: '',
        perio: '',
        predio: '',
        estado: '0',
        criterio: '0',
        fecha_proyectada: '17/11/2026',
      });
      expect(Object.keys(boundParams(0))).toEqual([
        'codigo',
        'annos',
        'tipos',
        'tiporec',
        'perio',
        'predio',
        'estado',
        'criterio',
        'fecha_proyectada',
      ]);
      expect(allParamKeys().filter((key) => key.startsWith('@'))).toEqual([]);
    });

    it('converts an ISO fecha_proyectada to DD/MM/YYYY before binding it to the SP', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      await service.consulta({
        ...CONSULTA_DTO,
        fecha_proyectada: '2026-11-18',
      });

      expect(boundParams(0)['fecha_proyectada']).toBe('18/11/2026');
      expect(Object.keys(boundParams(0))).toContain('fecha_proyectada');
    });

    it('passes an already DD/MM/YYYY fecha_proyectada through unchanged', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      await service.consulta({
        ...CONSULTA_DTO,
        fecha_proyectada: '18/11/2026',
      });

      expect(boundParams(0)['fecha_proyectada']).toBe('18/11/2026');
    });

    it('passes an empty fecha_proyectada through unchanged', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      await service.consulta({
        ...CONSULTA_DTO,
        fecha_proyectada: '',
      });

      expect(boundParams(0)['fecha_proyectada']).toBe('');
    });

    it('joins array filters with commas and never concatenates them into SQL text', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      await service.consulta({
        ...CONSULTA_DTO,
        annos: ['2025'],
        tipos: ['*02.01*', '*00.16*', '*05.00*'],
        estado: '%',
      });

      expect(boundParams(0)['annos']).toBe('2025');
      expect(boundParams(0)['tipos']).toBe('*02.01*,*00.16*,*05.00*');
      expect(boundParams(0)['estado']).toBe('%');
      expect(typeof boundParams(0)['tipos']).toBe('string');
    });

    it('maps a named recordset and applies the legacy derived fields', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [DETALLE_ROW] });

      const result = await service.consulta(CONSULTA_DTO);

      expect(result).toEqual([
        {
          idrecibo: '10',
          codigo: CODIGO,
          tipo: '11.00',
          anno: '2025',
          cod_pred: '001-001',
          anexo: ' 01 ',
          sub_anexo: ' 02 ',
          tipo_rec: '02.01',
          periodo: '202501',
          imp_insol: '100.00',
          imp_reaj: '110.00',
          mora: '10.00',
          costo_emis: '5.00',
          des_tipo: 'PREDIAL',
          des_cabecera: 'IMPUESTO PREDIAL',
          det_anexo: '01-02',
          total: 105,
          benefic: 2.5,
          tot_pagado: 20,
          ubica: 'UBICACION REAL',
        },
      ]);
    });

    it('rounds derived totals to two decimals as the legacy controller did', async () => {
      executeProcedure.mockResolvedValueOnce({
        recordset: [
          {
            ...DETALLE_ROW,
            imp_reaj: '110.005',
            mora: '0.004',
            costo_emis: '0.001',
            tot_pago: '0.000',
            descuento: '2.346',
          },
        ],
      });

      const [row] = await service.consulta(CONSULTA_DTO);

      expect(row.total).toBe(110.01);
      expect(row.benefic).toBe(2.35);
      expect(row.tot_pagado).toBe(0);
    });

    it('returns an empty list when the detail SP finds no receipts', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      expect(await service.consulta(CONSULTA_DTO)).toEqual([]);
    });
  });

  describe('mapDetalleReciboProyectado', () => {
    it('builds det_anexo only when tipo is exactly 11.00', () => {
      expect(mapDetalleReciboProyectado(DETALLE_ROW).det_anexo).toBe('01-02');
      expect(
        mapDetalleReciboProyectado({ ...DETALLE_ROW, tipo: '02.01' }).det_anexo,
      ).toBe('');
      expect(
        mapDetalleReciboProyectado({ ...DETALLE_ROW, tipo: '11.0' }).det_anexo,
      ).toBe('');
    });

    it('takes ubica from ubica_2 and never from the SP column named ubica', () => {
      expect(mapDetalleReciboProyectado(DETALLE_ROW).ubica).toBe('UBICACION REAL');
      expect(mapDetalleReciboProyectado(DETALLE_ROW).ubica).not.toBe(
        'VALOR SP NO USADO',
      );
    });

    it('maps null named values without throwing', () => {
      const nullRow: SpDetalleReciboProyectadoRow = Object.fromEntries(
        Object.keys(DETALLE_ROW).map((name) => [name, null]),
      );

      const row = mapDetalleReciboProyectado(nullRow);

      expect(row.total).toBe(0);
      expect(row.benefic).toBe(0);
      expect(row.tot_pagado).toBe(0);
      expect(row.det_anexo).toBe('');
      expect(row.ubica).toBe('');
    });
  });

  describe('toSpFechaProyectada', () => {
    it('normalizes ISO dates and leaves legacy and empty values untouched', () => {
      expect(toSpFechaProyectada('2026-11-18')).toBe('18/11/2026');
      expect(toSpFechaProyectada('18/11/2026')).toBe('18/11/2026');
      expect(toSpFechaProyectada('')).toBe('');
    });
  });

  describe('normalizeEstadoRecibo', () => {
    it('maps every documented numeric and text variant', () => {
      expect(normalizeEstadoRecibo('0')).toBe('Anulado');
      expect(normalizeEstadoRecibo(0)).toBe('Anulado');
      expect(normalizeEstadoRecibo('ANULADO')).toBe('Anulado');
      expect(normalizeEstadoRecibo('1')).toBe('Cancelado');
      expect(normalizeEstadoRecibo(1)).toBe('Cancelado');
      expect(normalizeEstadoRecibo('CANCELADO')).toBe('Cancelado');
    });
  });
});
