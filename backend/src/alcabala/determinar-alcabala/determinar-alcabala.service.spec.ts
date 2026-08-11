/// <reference types="jest" />

import { DeterminarAlcabalaService } from './determinar-alcabala.service';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';
import { CrearAlcabalaDto } from './dto/crear-alcabala.dto';

function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('DeterminarAlcabalaService', () => {
  let service: DeterminarAlcabalaService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  const SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  const SP_DJALCABALA = 'Alcabala.sp_DJAlcabala';

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    const config = { get: jest.fn().mockReturnValue('test-token') } as unknown as ConfigService;
    service = new DeterminarAlcabalaService(
      db as unknown as DatabaseService,
      config,
    );
  });

  // Helper to create minimal SP row for contribuyente
  const contribuyenteRow = (overrides: Record<string, any> = {}) => ({
    codigo: '0012345',
    paterno: 'GARCIA',
    materno: 'LOPEZ',
    nombres: 'JUAN CARLOS',
    num_doc: '12345678',
    DireFis: 'Av. Principal 123',
    ROW: 1,
    ...overrides,
  });

  // Helper to create minimal SP row for alcabala
  const alcabalaRow = (overrides: Record<string, any> = {}) => ({
    codigo_compra: 'C001',
    id_alcabala: 1001,
    fecharegistro: '2026-01-15',
    monto_alcabala: 2800,
    codpred: 'P001',
    aniopred: '2026',
    idrecibo: 'R001',
    codigo_venta: 'V001',
    estado: '1',
    ...overrides,
  });

  describe('searchContribuyente', () => {
    // Helper to create a full search DTO with defaults for all fields
    const searchDto = (overrides: Record<string, any> = {}) => ({
      tipoBusqueda: 'C' as const,
      busqueda: '',
      paterno: '',
      materno: '',
      nombres: '',
      page: 1,
      pageSize: 15,
      ...overrides,
    });

    it('should call sp_Mcontribuyente with busc:5 for rows and busc:6 for count', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 10 }]))  // count query
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));  // rows query

      await service.searchContribuyente(
        searchDto({ busqueda: '12345' }),
      );

      expect(db.executeProcedure).toHaveBeenCalledTimes(2);
      // First call: count
      expect(db.executeProcedure).toHaveBeenNthCalledWith(1, SP_MCONTRIBUYENTE, expect.objectContaining({
        busc: 6,
      }));
      // Second call: rows
      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        busc: 5,
        inicio: '1',
        final: '15',
      }));
    });

    it('should map busqueda to codigo when tipoBusqueda=C', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      await service.searchContribuyente(
        searchDto({ busqueda: '12345' }),
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        codigo: '12345',
        nombres: '',
        paterno: '',
        materno: '',
        num_doc: '',
        razon: '',
      }));
    });

    it('should use nombres field when tipoBusqueda=N', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      await service.searchContribuyente(
        searchDto({ tipoBusqueda: 'N', nombres: 'GARCIA' }),
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        codigo: '',
        nombres: 'GARCIA',
        paterno: '',
        materno: '',
        num_doc: '',
        razon: '',
      }));
    });

    it('should map busqueda to razon when tipoBusqueda=R', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      await service.searchContribuyente(
        searchDto({ tipoBusqueda: 'R', busqueda: 'EMPRESA SAC' }),
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        razon: 'EMPRESA SAC',
      }));
    });

    it('should map busqueda to num_doc when tipoBusqueda=D', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      await service.searchContribuyente(
        searchDto({ tipoBusqueda: 'D', busqueda: '12345678' }),
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        num_doc: '12345678',
      }));
    });

    it('should calculate pagination offsets correctly', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 50 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      await service.searchContribuyente(
        searchDto({ busqueda: '123', page: 3, pageSize: 10 }),
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        inicio: '21',
        final: '30',
      }));
    });

    it('should map SP rows to ContribuyenteItem[]', async () => {
      const row = contribuyenteRow({
        codigo: '0012345',
        paterno: 'GARCIA',
        materno: 'LOPEZ',
        nombres: 'JUAN CARLOS',
        num_doc: '12345678',
        DireFis: 'Av. Principal 123',
        ROW: 1,
      });

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([row]));

      const result = await service.searchContribuyente(
        searchDto({ busqueda: '12345' }),
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        codigo: '0012345',
        paterno: 'GARCIA',
        materno: 'LOPEZ',
        nombres: 'JUAN CARLOS',
        numDoc: '12345678',
        direccion: 'Av. Principal 123',
        row: 1,
      });
    });

    it('should return empty data when SP returns no rows', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      const result = await service.searchContribuyente(
        searchDto({ busqueda: '999' }),
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 50 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      const result = await service.searchContribuyente(
        searchDto({ busqueda: '123' }),
      );

      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(4); // ceil(50/15)
    });

    it('should default empty strings for missing optional fields', async () => {
      const row = {
        codigo: '001',
        num_doc: '111',
        ROW: 1,
        // paterno, materno, nombres, DireFis missing
      };

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([row]));

      const result = await service.searchContribuyente(
        searchDto({ busqueda: '001' }),
      );

      expect(result.data[0].paterno).toBe('');
      expect(result.data[0].materno).toBe('');
      expect(result.data[0].nombres).toBe('');
      expect(result.data[0].direccion).toBe('');
    });

    it('should handle SP error gracefully', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('DB connection failed'));

      const result = await service.searchContribuyente(
        searchDto({ busqueda: '123' }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should pass cod_pred and checkfrac as empty and 0', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      await service.searchContribuyente(
        searchDto({ busqueda: '123' }),
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        cod_pred: '',
        checkfrac: '0',
      }));
    });
  });

  describe('getAlcabalasByContribuyente', () => {
    it('should call sp_DJAlcabala with buscar=6 and codigo', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([alcabalaRow()]));

      await service.getAlcabalasByContribuyente('0012345');

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_DJALCABALA, {
        buscar: '6',
        codigo: '0012345',
      });
    });

    it('should map SP rows to AlcabalaItem[] hiding codigo_compra and idrecibo', async () => {
      const row = alcabalaRow({
        codigo_compra: 'HIDDEN',
        id_alcabala: 1001,
        fecharegistro: '2026-01-15',
        monto_alcabala: 2800,
        codpred: 'P001',
        aniopred: '2026',
        idrecibo: 'HIDDEN',
        codigo_venta: 'V001',
        estado: '1',
      });

      db.executeProcedure.mockResolvedValueOnce(mockSpResult([row]));

      const result = await service.getAlcabalasByContribuyente('0012345');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        idAlcabala: 1001,
        fechaRegistro: '2026-01-15',
        montoAlcabala: 2800,
        codPred: 'P001',
        anioPred: '2026',
        codigoVenta: 'V001',
        estado: '1',
      });
      // Ensure hidden fields are not included
      expect(result.data[0]).not.toHaveProperty('codigo_compra');
      expect(result.data[0]).not.toHaveProperty('idrecibo');
    });

    it('should return empty data when contribuyente has no alcabalas', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.getAlcabalasByContribuyente('9999999');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle SP error gracefully', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('DB error'));

      const result = await service.getAlcabalasByContribuyente('0012345');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle case-insensitive SP column names', async () => {
      const row = {
        ID_ALCABALA: 2001,
        FECHAREGISTRO: '2026-02-20',
        MONTO_ALCABALA: 5000,
        CODPRED: 'P002',
        ANIOPRED: '2025',
        CODIGO_VENTA: 'V002',
        ESTADO: '2',
      };

      db.executeProcedure.mockResolvedValueOnce(mockSpResult([row]));

      const result = await service.getAlcabalasByContribuyente('0012345');

      expect(result.success).toBe(true);
      expect(result.data[0].idAlcabala).toBe(2001);
      expect(result.data[0].estado).toBe('2');
    });
  });

  describe('searchPredio', () => {
    // Helper mirroring the REAL sp_DJAlcabala buscar=3 output columns
    const predioRow = (overrides: Record<string, any> = {}) => ({
      codigo: '0279126',
      nombres: 'VAEZ CARDENAS MANUEL FERNANDO Y SRA',
      cod_pred: '000172956',
      anexo: '0001',
      sub_anexo: '0001',
      porcen_propiedad: 100.0,
      predial:
        'MZ LA RINCONADA DE HUACACHINA II ETAPA MZ B LTE 13 URB. LA RINCONADA DE HUACACHINA II ETAPA',
      total_autoavaluo: 161019.04,
      documento: 'DNI',
      num_doc: '19082855',
      direcc_fiscal:
        'URB. LA RINCONADA DE HUACACHINA II ETAPA - MZ LA RINCONADA DE HUACACHINA II ETAPA MZ B LTE 13',
      distrito: 'D',
      provincia: 'P',
      departamento: 'DW',
      tipo_pred: 'Predio Urbano',
      anno: '2021',
      valor_uit: 4400.0,
      valor_uit2: 44000.0,
      tipo_pred1: '1',
      Val_Terreno: 16976.4,
      ROW: 1,
      ...overrides,
    });

    it('should call sp_DJAlcabala with buscar=3 and mapped params', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([predioRow()]));

      await service.searchPredio({
        codigo: '0279126',
        codPred: '',
        anio: '2020',
        tipoBusqueda: 'c',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_DJALCABALA, {
        buscar: '3',
        codigo: '0279126',
        codpred: '',
        anio: '2020',
        tipo_busqueda: 'c',
      });
    });

    it('should map predial column to direccionPredio, not direcc_fiscal', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([predioRow()]));

      const result = await service.searchPredio({
        codigo: '0279126',
        codPred: '',
        anio: '2020',
        tipoBusqueda: 'c',
        page: 1,
        pageSize: 15,
      });

      expect(result.success).toBe(true);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          codigo: '0279126',
          nombres: 'VAEZ CARDENAS MANUEL FERNANDO Y SRA',
          codPred: '000172956',
          porcenPropiedad: 100,
          numDoc: '19082855',
          anexo: '0001',
          subAnexo: '0001',
          totalAutoavaluo: 161019.04,
          tipoPred: 'Predio Urbano',
          anno: '2021',
          direccionPredio:
            'MZ LA RINCONADA DE HUACACHINA II ETAPA MZ B LTE 13 URB. LA RINCONADA DE HUACACHINA II ETAPA',
          direccFiscal:
            'URB. LA RINCONADA DE HUACACHINA II ETAPA - MZ LA RINCONADA DE HUACACHINA II ETAPA MZ B LTE 13',
        }),
      );
      // The predio address MUST NOT silently fall back to the fiscal address
      expect(result.data[0].direccionPredio).not.toBe(
        result.data[0].direccFiscal,
      );
    });

    it('should NOT fall back to direcc_fiscal when predial column is absent', async () => {
      const { predial, ...rowWithoutPredial } = predioRow();
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([rowWithoutPredial]),
      );

      const result = await service.searchPredio({
        codigo: '0279126',
        codPred: '',
        anio: '2020',
        tipoBusqueda: 'c',
        page: 1,
        pageSize: 15,
      });

      expect(result.success).toBe(true);
      expect(result.data[0].direccionPredio).toBe('');
    });

    it('should pass codpred to sp_DJAlcabala when tipo_busqueda=P', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([predioRow()]));

      await service.searchPredio({
        codigo: '',
        codPred: '010195288',
        anio: '2026',
        tipoBusqueda: 'P',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_DJALCABALA, {
        buscar: '3',
        codigo: '',
        codpred: '010195288',
        anio: '2026',
        tipo_busqueda: 'P',
      });
    });
  });

  describe('getUit', () => {
    it('should call sp_DJAlcabala with buscar=1 and anio, and return valor_uit', async () => {
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ valor_uit: '5150' }]),
      );

      const result = await service.getUit('2026');

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_DJALCABALA, {
        buscar: '1',
        anio: '2026',
      });
      expect(result).toEqual({ success: true, uit: '5150' });
    });

    it('should fall back to the uit column when valor_uit is absent', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([{ uit: '4400' }]));

      const result = await service.getUit('2025');

      expect(result).toEqual({ success: true, uit: '4400' });
    });

    it('should read the valor_uit column case-insensitively', async () => {
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ VALOR_UIT: '5150' }]),
      );

      const result = await service.getUit('2026');

      expect(result).toEqual({ success: true, uit: '5150' });
    });

    it('should fail cleanly when the UIT column is missing instead of guessing', async () => {
      // No valor_uit / uit key — the old blind Object.values(row)[0] fallback
      // could silently read the wrong column (e.g. UTI or an unrelated value)
      // and persist a wrong montoInafecto. Missing key must fail, not guess.
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([{ UTI: '5150' }]));

      const result = await service.getUit('2026');

      expect(result.success).toBe(false);
      expect(result.uit).toBe('');
      expect(result.error).toBeDefined();
    });

    it('should fail cleanly when the SP returns no UIT row', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.getUit('2026');

      expect(result.success).toBe(false);
      expect(result.uit).toBe('');
      expect(result.error).toBeDefined();
    });

    it('should handle SP error gracefully and return empty uit', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('SP timeout'));

      const result = await service.getUit('2026');

      expect(result.success).toBe(false);
      expect(result.uit).toBe('');
      expect(result.error).toBe('Error al obtener la UIT');
    });
  });

  describe('getTipoCambio', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return the SUNAT venta value for the contract date', async () => {
      // SUNAT returns an array; the service picks codTipo 'V' matching the date.
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify([
            { codTipo: 'V', fecPublica: '30/07/2026', valTipo: '3.75' },
          ]),
        ),
      } as any);

      const result = await service.getTipoCambio('2026-07-30');

      expect(result).toEqual({ success: true, venta: '3.75' });
    });

    it("should fall back to the first 'V' entry when the exact date is missing", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify([
            { codTipo: 'V', fecPublica: '29/07/2026', valTipo: '3.76' },
          ]),
        ),
      } as any);

      const result = await service.getTipoCambio('2026-07-30');

      expect(result).toEqual({ success: true, venta: '3.76' });
    });

    it('should reject a malformed date', async () => {
      const result = await service.getTipoCambio('30-07-2026');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fecha debe ser aaaa-mm-dd');
    });

    it('should handle a non-OK SUNAT HTTP response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      } as any);

      const result = await service.getTipoCambio('2026-07-30');

      expect(result.success).toBe(false);
      expect(result.error).toContain('503');
    });

    it('should handle an empty SUNAT dataset', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify([])),
      } as any);

      const result = await service.getTipoCambio('2026-07-30');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se encontraron');
    });

    it('should handle a fetch failure gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

      const result = await service.getTipoCambio('2026-07-30');

      expect(result.success).toBe(false);
      expect(result.error).toContain('network down');
    });
  });

  describe('crear', () => {
    const validDto: CrearAlcabalaDto = {
      codigoCompra: 'C001',
      nombres: 'JUAN CARLOS',
      numDoc: '12345678',
      direccFiscal: 'Av. Principal 123',
      codigoVenta: 'V001',
      nombres1: 'MARIA',
      numDoc1: '87654321',
      direccFiscal1: 'Jr. Secundaria 456',
      codPred: 'P001',
      anioPred: '2026',
      tipoPred: 'Predio Urbano',
      direccionPredio: 'Av. Real 789',
      fechaContrato: '2026-07-30',
      contrato: 'C-001',
      transferencia: 150000,
      observacion: '',
      montoInafecto: 0,
      montoAfecto: 100000,
      montoAlcabala: 3000,
      autoavaluo: 80000,
      anexo: '',
      subAnexo: '',
    };

    it('should call sp_DJAlcabala with buscar=4 and mapped DTO params', async () => {
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ id_alcabala: 42 }]),
      );

      await service.crear(validDto, 'admin', 'PC-001');

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_DJALCABALA, {
        buscar: '4',
        codigo_compra: 'C001',
        nombre: 'MARIA',
        num_doc: '12345678',
        codigo_venta: 'V001',
        dni: '87654321',
        direccion: 'Jr. Secundaria 456',
        codpred: 'P001',
        aniopred: '2026',
        tipo_pred: '1',
        direccion_predio: 'Av. Real 789',
        fecha_contrato: '2026-07-30',
        contrato: 'C-001',
        transferencia: 150000,
        observacion: '',
        monto_inafecto: 0,
        monto_afecto: 100000,
        monto_alcabala: 3000,
        autoavaluo: 80000,
        anexo: '',
        sub_anexo: '',
        usuario: 'admin',
        estacion: 'PC-001',
      });
    });

    it('should inject @usuario and @estacion in SP params', async () => {
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ id_alcabala: 42 }]),
      );

      await service.crear(validDto, 'admin', 'PC-001');

      expect(db.executeProcedure).toHaveBeenCalledWith(
        SP_DJALCABALA,
        expect.objectContaining({
          usuario: 'admin',
          estacion: 'PC-001',
        }),
      );
    });

    it('should map tipoPred text to SP code (Urbano=1, Rústico=2)', async () => {
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ id_alcabala: 42 }]),
      );

      await service.crear(
        { ...validDto, tipoPred: 'Predio Urbano' },
        'admin',
        'PC-001',
      );
      expect(db.executeProcedure).toHaveBeenLastCalledWith(
        SP_DJALCABALA,
        expect.objectContaining({ tipo_pred: '1' }),
      );

      await service.crear(
        { ...validDto, tipoPred: 'Predio Rústico' },
        'admin',
        'PC-001',
      );
      expect(db.executeProcedure).toHaveBeenLastCalledWith(
        SP_DJALCABALA,
        expect.objectContaining({ tipo_pred: '2' }),
      );
    });

    it('should return success with idAlcabala on SP success', async () => {
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ id_alcabala: 42 }]),
      );

      const result = await service.crear(validDto, 'admin', 'PC-001');

      expect(result.success).toBe(true);
      expect(result.idAlcabala).toBe(42);
    });

    it('should handle SP error gracefully and return error message', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('SP timeout'));

      const result = await service.crear(validDto, 'admin', 'PC-001');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al crear alcabala');
    });

    it('should map all DTO fields to snake_case SP parameters', async () => {
      db.executeProcedure.mockResolvedValueOnce(
        mockSpResult([{ id_alcabala: 42 }]),
      );

      await service.crear(validDto, 'admin', 'PC-001');

      // Verify all camelCase DTO fields translate to snake_case SP params
      expect(db.executeProcedure).toHaveBeenCalledWith(
        SP_DJALCABALA,
        expect.objectContaining({
          codigo_compra: 'C001',
          nombre: 'MARIA',
          num_doc: '12345678',
          codigo_venta: 'V001',
          dni: '87654321',
          direccion: 'Jr. Secundaria 456',
          tipo_pred: '1',
          direccion_predio: 'Av. Real 789',
          fecha_contrato: '2026-07-30',
          contrato: 'C-001',
          transferencia: 150000,
          observacion: '',
          monto_inafecto: 0,
          autoavaluo: 80000,
          anexo: '',
          sub_anexo: '',
        }),
      );
    });

    it('should handle empty recordset from SP', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.crear(validDto, 'admin', 'PC-001');

      expect(result.success).toBe(true);
      // When no recordset returned, idAlcabala should be 0
      expect(result.idAlcabala).toBe(0);
    });
  });
});