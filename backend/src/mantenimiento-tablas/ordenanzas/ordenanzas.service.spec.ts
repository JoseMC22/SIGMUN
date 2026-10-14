import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdenanzasService } from './ordenanzas.service';
import { DatabaseService } from '../../database/database.service';
import { CrearOrdenanzaDto } from './dto/crear-ordenanza.dto';

describe('OrdenanzasService', () => {
  let service: OrdenanzasService;
  const mockExecuteProcedure = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenanzasService,
        { provide: DatabaseService, useValue: { executeProcedure: mockExecuteProcedure } },
      ],
    }).compile();

    service = module.get<OrdenanzasService>(OrdenanzasService);
    mockExecuteProcedure.mockReset();
  });

  // ── listar (@msquery=3, S2: 3 = consulta; 1 = ALTA, nunca listar) ──

  describe('listar', () => {
    it('calls caja.sp_ordenanzas with msquery=3, obligatory empty params, and trims char fields', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({
        recordset: [
          {
            idordenanza: 1,
            criterio: '1              ',
            descripcion: 'Pronto Pago',
            fec_desde: new Date('2013-09-01T05:00:00.000Z'),
            fec_hasta: '2013-09-30T00:00:00.000Z',
            observacion: null,
            estado: '0',
            operador: 'SISTEMAS        ',
            estacion: 'SERVIDOR        ',
            fech_ing: '2013-08-15T10:30:00.000Z',
          },
        ],
      });

      const result = await service.listar();

      expect(mockExecuteProcedure).toHaveBeenCalledTimes(1);
      expect(mockExecuteProcedure).toHaveBeenCalledWith('caja.sp_ordenanzas', {
        msquery: 3,
        criterio: 11,
        descripcion: '',
        fdesde: '',
        fhasta: '',
        observacion: '',
        operador: '',
        estacion: '',
      });

      // char padding recortado; null → ''; fechas en passthrough ISO.
      const row = result.data[0];
      expect(row).toMatchObject({
        idordenanza: 1,
        criterio: '1',
        descripcion: 'Pronto Pago',
        observacion: '',
        estado: '0',
        operador: 'SISTEMAS',
        estacion: 'SERVIDOR',
        fech_ing: '2013-08-15T10:30:00.000Z',
      });
      expect(row.fec_desde).toBe('2013-09-01T05:00:00.000Z');
      expect(row.fec_hasta).toBe('2013-09-30T00:00:00.000Z');
    });

    it('returns { data: [] } when the SP returns an empty recordset (S3)', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({ recordset: [] });

      await expect(service.listar()).resolves.toEqual({ data: [] });
    });
  });

  // ── crear (@msquery=1 = ALTA master INSERT, T5/iteración 2) ──

  describe('crear', () => {
    it('executes caja.sp_ordenanzas with msquery=1, operador de sesión and dates normalized to YYYYMMDD', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({ recordset: [] });

      const dto: CrearOrdenanzaDto = {
        criterio: 11,
        descripcion: 'Pronto Pago',
        fdesde: '2024-01-01',
        fhasta: '2024-12-31',
        observacion: 'Beneficio por pago oportuno',
        estacion: 'PC-SISTEMAS',
      };

      await expect(service.crear(dto, 'ADMIN')).resolves.toEqual({
        message: 'Ordenanza creada exitosamente',
      });

      expect(mockExecuteProcedure).toHaveBeenCalledTimes(1);
      expect(mockExecuteProcedure).toHaveBeenCalledWith('caja.sp_ordenanzas', {
        msquery: 1,
        criterio: 11,
        descripcion: 'Pronto Pago',
        fdesde: '20240101', // YYYY-MM-DD → YYYYMMDD (unambiguous smalldatetime)
        fhasta: '20241231',
        observacion: 'Beneficio por pago oportuno',
        operador: 'ADMIN',
        estacion: 'PC-SISTEMAS',
      });
    });

    it('rethrows the SP error after logging', async () => {
      mockExecuteProcedure.mockRejectedValueOnce(new Error('expects parameter'));

      const dto: CrearOrdenanzaDto = {
        criterio: 1,
        descripcion: 'X',
        fdesde: '2024-01-01',
        fhasta: '2024-12-31',
        observacion: '',
        estacion: '',
      };

      await expect(service.crear(dto, 'ADMIN')).rejects.toThrow(
        'expects parameter',
      );
    });
  });

  // ── editar (@msquery=7 = UPDATE master, T6) ──

  describe('editar', () => {
    it('executes caja.sp_ordenanzas with msquery=7, edited values, dates normalized to YYYYMMDD and idordenanza key', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({ recordset: [] });

      const dto: CrearOrdenanzaDto = {
        criterio: 11,
        descripcion: 'Pronto Pago 2024',
        fdesde: '2024-01-01',
        fhasta: '2024-12-31',
        observacion: 'Observación editada',
        estacion: 'PC-SISTEMAS',
      };

      await expect(service.editar(5, dto, 'ADMIN')).resolves.toEqual({
        message: 'Ordenanza actualizada exitosamente',
      });

      expect(mockExecuteProcedure).toHaveBeenCalledTimes(1);
      expect(mockExecuteProcedure).toHaveBeenCalledWith('caja.sp_ordenanzas', {
        msquery: 7, // 7 = UPDATE master; NO toca estado.
        criterio: 11,
        descripcion: 'Pronto Pago 2024',
        fdesde: '20240101', // YYYY-MM-DD → YYYYMMDD (unambiguous smalldatetime)
        fhasta: '20241231',
        observacion: 'Observación editada',
        operador: 'ADMIN',
        estacion: 'PC-SISTEMAS',
        idordenanza: 5, // Llave del WHERE; modo 4 + valores editados.
      });
    });

    it('rethrows the SP error after logging', async () => {
      mockExecuteProcedure.mockRejectedValueOnce(new Error('expects parameter'));

      const dto: CrearOrdenanzaDto = {
        criterio: 1,
        descripcion: 'X',
        fdesde: '2024-01-01',
        fhasta: '2024-12-31',
        observacion: '',
        estacion: '',
      };

      await expect(service.editar(5, dto, 'ADMIN')).rejects.toThrow(
        'expects parameter',
      );
    });
  });

  // ── detalle (@msquery=4 = consulta detalle, T9/iteración 4) ──

  describe('detalle', () => {
    // Filas crudas del SP RE-MODELADO (re-lectura en vivo 13/10 ~16:32):
    // msquery=4 es ahora SELECT con JOIN a CAJA.TIPO_INGRESOS_DET —
    // `do.ANNO [Año], do.TIPO_REC, det.CONCEPTO, do.IMP_INSOL, do.IMP_REAJ,
    // do.MORA, do.COSTO_EMIS` WHERE CIDORDENANZA = @idordenanza ORDER BY
    // IDORDENANZA. El SP FILTRA server-side: el service ya NO filtra en
    // memoria (era workaround del SP viejo, T4/S4). Volumen real:
    // idordenanza=1 → 115 filas; idordenanza=2 → 5.
    const rawDetalleRow1: Record<string, unknown> = {
      'Año': '2013',
      TIPO_REC: '02.01   ',
      CONCEPTO: 'IMPUESTO AL PATRIMONIO PREDIAL',
      IMP_INSOL: 46.2,
      IMP_REAJ: 0,
      MORA: 10.5,
      COSTO_EMIS: 2.5,
    };

    it('calls caja.sp_ordenanzas with msquery=4 + the 6 obligatory empty params + idordenanza, and maps the SP-filtered rows WITHOUT in-memory filtering', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({
        recordset: [
          rawDetalleRow1,
          // El SP ya filtró (WHERE CIDORDENANZA = @idordenanza): TODAS las
          // filas que llegan son del master pedido y pasan SIN filtro local.
          { 'Año': '2013', TIPO_REC: '02.02', CONCEPTO: 'SERVICIO LIMPIEZA PÚBLICA', IMP_INSOL: 58.36, IMP_REAJ: 1, MORA: 0, COSTO_EMIS: 2.5 },
        ],
      });

      const result = await service.detalle(1);

      expect(mockExecuteProcedure).toHaveBeenCalledTimes(1);
      expect(mockExecuteProcedure).toHaveBeenCalledWith('caja.sp_ordenanzas', {
        // 4 = consulta detalle; @idordenanza AHORA SÍ es el filtro
        // server-side (WHERE CIDORDENANZA = @idordenanza), int.
        msquery: 4,
        criterio: 11,
        descripcion: '',
        fdesde: '',
        fhasta: '',
        observacion: '',
        operador: '',
        estacion: '',
        idordenanza: 1,
      });

      // Passthrough de LAS filas que el SP ya filtró (N in → N out, sin
      // filtro en memoria), mapeadas a camelCase nuevo.
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        idDetalle: 0, // Fixture sin llaves del SP viejo → 0 (T3 las agrega).
        cidordenanza: 0,
        anno: '2013',
        tipoRec: '02.01', // char padded del SP recortado
        concepto: 'IMPUESTO AL PATRIMONIO PREDIAL',
        impInsol: 46.2,
        impReaj: 0,
        mora: 10.5,
        costoEmis: 2.5,
      });
      expect(result.data[1]).toMatchObject({
        tipoRec: '02.02',
        concepto: 'SERVICIO LIMPIEZA PÚBLICA',
        impInsol: 58.36,
      });
    });

    it('trims the Año/TIPO_REC/CONCEPTO char columns and maps null → "" / amounts Number()', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({
        recordset: [
          {
            'Año': '2013 ', // char(4) padded
            'TIPO_REC': '0.1   ', // char(5) padded
            'CONCEPTO': '  DERECHO DE EMISIÓN  ', // varchar con espacios y null → ''
            'IMP_INSOL': null, // null del SP → 0
            'IMP_REAJ': '12.30', // decimal que a veces llega string → Number
            'MORA': undefined,
            'COSTO_EMIS': 0,
          },
        ],
      });

      const result = await service.detalle(5);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        idDetalle: 0, // Fixture sin llaves del SP viejo → 0 (T3 las agrega).
        cidordenanza: 0,
        anno: '2013',
        tipoRec: '0.1',
        concepto: 'DERECHO DE EMISIÓN',
        impInsol: 0, // null → 0 (toNumber)
        impReaj: 12.3, // string → Number
        mora: 0, // undefined → 0
        costoEmis: 0,
      });
    });

    it('returns { data: [] } when the SP returns no row for the master (legitimate empty state, no exception)', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({
        recordset: [],
      });

      await expect(service.detalle(999)).resolves.toEqual({ data: [] });
    });

    it('rethrows the SP error after logging', async () => {
      mockExecuteProcedure.mockRejectedValueOnce(new Error('expects parameter'));

      await expect(service.detalle(1)).rejects.toThrow('expects parameter');
    });
  });

  // ── editarDetalle (@msquery=8 = UPDATE detalle, T3) ──

  describe('editarDetalle', () => {
    const validInput = {
      cidordenanza: 2,
      anno: '2013',
      tipoRec: '02.01',
      impInsol: 46.2,
      impReaj: 0,
      mora: 10.5,
      costoEmis: 2.5,
      estacion: 'PC-SISTEMAS',
    };

    it('maps the new mode-4 keys (IDORDENANZA PK + CIDORDENANZA master) in detalle rows', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({
        recordset: [
          {
            IDORDENANZA: 9,
            CIDORDENANZA: 2,
            'Año': '2013',
            TIPO_REC: '02.01',
            CONCEPTO: 'IMPUESTO AL PATRIMONIO PREDIAL',
            IMP_INSOL: 46.2,
            IMP_REAJ: 0,
            MORA: 10.5,
            COSTO_EMIS: 2.5,
          },
        ],
      });

      const result = await service.detalle(2);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        idDetalle: 9,
        cidordenanza: 2,
        anno: '2013',
      });
    });

    // Fila propia tal como la devuelve el modo 4 (la validación
    // anti-duplicidad la excluye por idDetalle).
    const selfRow = {
      IDORDENANZA: 9,
      CIDORDENANZA: 2,
      'Año': '2013',
      TIPO_REC: '02.01',
      CONCEPTO: 'IMPUESTO AL PATRIMONIO PREDIAL',
      IMP_INSOL: 46.2,
      IMP_REAJ: 0,
      MORA: 10.5,
      COSTO_EMIS: 2.5,
    };

    it('executes caja.sp_ordenanzas with msquery=8 sending ONLY the known params (no tipo/observacion/estado)', async () => {
      mockExecuteProcedure
        .mockResolvedValueOnce({ recordset: [selfRow] }) // validación: sin duplicados
        .mockResolvedValueOnce({ recordset: [] }); // modo 8

      await expect(
        service.editarDetalle(9, validInput, 'ADMIN'),
      ).resolves.toEqual({
        message: 'Detalle de ordenanza actualizado exitosamente',
      });

      // 1 = lectura modo 4 (anti-duplicidad) + 1 = UPDATE modo 8.
      expect(mockExecuteProcedure).toHaveBeenCalledTimes(2);
      expect(mockExecuteProcedure).toHaveBeenNthCalledWith(
        2,
        'caja.sp_ordenanzas',
        {
          msquery: 8, // 8 = UPDATE detalle; tipo/observacion/estado NO viajan.
          cidordenanza: 2,
          anno: '2013',
          tipo_rec: '02.01',
          imp_insol: 46.2,
          imp_reaj: 0,
          mora: 10.5,
          costo_emis: 2.5,
          operador: 'ADMIN',
          estacion: 'PC-SISTEMAS',
          idordenanza: 9, // PK del detalle (WHERE IDORDENANZA = @idordenanza).
        },
      );
    });

    it('trims the anno/tipoRec char padding and rethrows the SP error after logging', async () => {
      mockExecuteProcedure
        .mockResolvedValueOnce({ recordset: [selfRow] }) // validación
        .mockResolvedValueOnce({ recordset: [] }); // modo 8

      await service.editarDetalle(
        9,
        { ...validInput, anno: '2013 ', tipoRec: '02.01   ' },
        'ADMIN',
      );

      expect(mockExecuteProcedure).toHaveBeenNthCalledWith(
        2,
        'caja.sp_ordenanzas',
        expect.objectContaining({ anno: '2013', tipo_rec: '02.01' }),
      );

      mockExecuteProcedure
        .mockResolvedValueOnce({ recordset: [selfRow] }) // validación
        .mockRejectedValueOnce(new Error('expects parameter')); // modo 8

      await expect(
        service.editarDetalle(9, validInput, 'ADMIN'),
      ).rejects.toThrow('expects parameter');
    });

    it('rejects with 409 without calling mode 8 when another row already uses (anno, tipo_rec)', async () => {
      mockExecuteProcedure.mockResolvedValueOnce({
        recordset: [
          { ...selfRow, IDORDENANZA: 9, 'Año': '2012', TIPO_REC: '02.02' },
          { ...selfRow, IDORDENANZA: 10, 'Año': '2013', TIPO_REC: '02.01' },
        ],
      });

      const err = await service
        .editarDetalle(9, validInput, 'ADMIN')
        .then(
          () => {
            throw new Error('should have rejected with ConflictException');
          },
          (e) => e,
        );

      expect(err).toBeInstanceOf(ConflictException);
      expect(err?.status).toBe(409);
      expect(err?.message).toContain(
        'Ya existe otra fila con año 2013 y tipo 02.01 en esta ordenanza',
      );
      // Solo la lectura modo 4: el UPDATE jamás se ejecutó.
      expect(mockExecuteProcedure).toHaveBeenCalledTimes(1);
    });

    it('allows keeping the row own (anno, tipo_rec) when nothing else uses them', async () => {
      mockExecuteProcedure
        .mockResolvedValueOnce({ recordset: [selfRow] }) // validación
        .mockResolvedValueOnce({ recordset: [] }); // modo 8

      await expect(
        service.editarDetalle(9, validInput, 'ADMIN'),
      ).resolves.toEqual({
        message: 'Detalle de ordenanza actualizado exitosamente',
      });
      expect(mockExecuteProcedure).toHaveBeenCalledTimes(2);
    });

    it('maps the SQL unique-violation error (2627) to 409 for the concurrent window', async () => {
      mockExecuteProcedure
        .mockResolvedValueOnce({ recordset: [selfRow] }) // validación: sin duplicados
        .mockRejectedValueOnce(
          Object.assign(new Error('Violation of UNIQUE KEY constraint'), {
            number: 2627,
          }),
        ); // modo 8: el índice único frenó al segundo concurrente

      const err = await service
        .editarDetalle(9, validInput, 'ADMIN')
        .then(
          () => {
            throw new Error('should have rejected with ConflictException');
          },
          (e) => e,
        );

      expect(err).toBeInstanceOf(ConflictException);
      expect(err?.status).toBe(409);
      expect(err?.message).toContain(
        'Ya existe otra fila con año 2013 y tipo 02.01 en esta ordenanza',
      );
    });

    it('allows moving to a free (anno, tipo_rec) when no other row uses them', async () => {
      mockExecuteProcedure
        .mockResolvedValueOnce({
          recordset: [
            { ...selfRow, IDORDENANZA: 9, 'Año': '2012', TIPO_REC: '02.02' },
          ],
        }) // validación: la propia fila tiene otra llave, nadie usa 2013/02.01
        .mockResolvedValueOnce({ recordset: [] }); // modo 8

      await expect(
        service.editarDetalle(9, validInput, 'ADMIN'),
      ).resolves.toEqual({
        message: 'Detalle de ordenanza actualizado exitosamente',
      });
      expect(mockExecuteProcedure).toHaveBeenCalledTimes(2);
    });
  });
});
