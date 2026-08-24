/// <reference types="jest" />

import { DeterminarAlcabalaService } from './determinar-alcabala.service';
import { DatabaseService } from '../../database/database.service';
import { CrearAlcabalaDto } from './dto/crear-alcabala.dto';
import { BajaAlcabalaSchema } from './dto/baja-alcabala.dto';

function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('DeterminarAlcabalaService', () => {
  let service: DeterminarAlcabalaService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure' | 'queryWithParams'>>;

  const SP_MCONTRIBUYENTE = 'Rentas.sp_Mcontribuyente';
  const SP_DJALCABALA = 'Alcabala.sp_DJAlcabala';

  beforeEach(() => {
    db = { executeProcedure: jest.fn(), queryWithParams: jest.fn() };
    service = new DeterminarAlcabalaService(db as unknown as DatabaseService);
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

    it('should map SP rows to AlcabalaItem[] exposing idRecibo and hiding codigo_compra', async () => {
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
        idRecibo: 'HIDDEN',
      });
      // codigo_compra remains hidden; idRecibo is now exposed for the baja flow
      expect(result.data[0]).not.toHaveProperty('codigo_compra');
      expect(result.data[0]).toHaveProperty('idRecibo', 'HIDDEN');
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
      // idrecibo column absent in this row → mapped to empty string
      expect(result.data[0].idRecibo).toBe('');
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
      tipoPred: 'CASA',
      direccionPredio: 'Av. Real 789',
      fechaContrato: '2026-07-30',
      contrato: 'C-001',
      transferencia: 'COMPRA VENTA',
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
        nombres: 'JUAN CARLOS',
        num_doc: '12345678',
        direcc_fiscal: 'Av. Principal 123',
        codigo_venta: 'V001',
        nombres1: 'MARIA',
        num_doc1: '87654321',
        direcc_fiscal1: 'Jr. Secundaria 456',
        codpred: 'P001',
        aniopred: '2026',
        tipo_pred: 'CASA',
        direccion_predio: 'Av. Real 789',
        fecha_contrato: '2026-07-30',
        contrato: 'C-001',
        transferencia: 'COMPRA VENTA',
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
          direcc_fiscal: 'Av. Principal 123',
          codigo_venta: 'V001',
          nombres1: 'MARIA',
          num_doc1: '87654321',
          direcc_fiscal1: 'Jr. Secundaria 456',
          tipo_pred: 'CASA',
          direccion_predio: 'Av. Real 789',
          fecha_contrato: '2026-07-30',
          contrato: 'C-001',
          transferencia: 'COMPRA VENTA',
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

  describe('darDeBaja', () => {
    const baseDto = (overrides: Record<string, any> = {}) =>
      BajaAlcabalaSchema.parse({
        codigo: '0279126',
        idAlcabala: 5296,
        idrecibo: 58612727,
        observacion: 'motivo de prueba',
        ...overrides,
      });

    it('should call sp_DJAlcabala with buscar=9 and mapped params when idrecibo provided', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.darDeBaja(baseDto(), 'mvaez', 'PC-001');

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_DJALCABALA, {
        buscar: '9',
        codigo: '0279126',
        id_alcabala: 5296,
        idrecibo: 58612727,
        observacion: 'motivo de prueba',
        usuario: 'mvaez',
        estacion: 'PC-001',
      });
      expect(result.success).toBe(true);
    });

    it('should resolve idrecibo AND estado via ONE SELECT when not provided, then call buscar=9 with resolved value', async () => {
      db.queryWithParams.mockResolvedValueOnce(
        mockSpResult([{ idrecibo: '58612727', estado: '1' }]),
      );
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.darDeBaja(baseDto({ idrecibo: 0 }), 'mvaez', 'PC-001');

      expect(db.queryWithParams).toHaveBeenCalledWith(
        'SELECT idrecibo, estado FROM Alcabala.DJAlcabala WHERE id_alcabala = @id',
        { id: 5296 },
      );
      expect(db.executeProcedure).toHaveBeenCalledWith(
        SP_DJALCABALA,
        expect.objectContaining({
          buscar: '9',
          id_alcabala: 5296,
          idrecibo: 58612727,
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should return failure without calling the SP when idrecibo cannot be resolved', async () => {
      db.queryWithParams.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.darDeBaja(baseDto({ idrecibo: 0 }), 'mvaez', 'PC-001');

      expect(db.executeProcedure).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No se pudo resolver el idrecibo de la alcabala para la baja');
    });

    it('should NOT call the SP for estado 0 (Inactivo) and return the exact Activo error', async () => {
      db.queryWithParams.mockResolvedValueOnce(
        mockSpResult([{ idrecibo: '58612727', estado: '0' }]),
      );

      const result = await service.darDeBaja(baseDto({ idrecibo: 0 }), 'mvaez', 'PC-001');

      expect(db.queryWithParams).toHaveBeenCalled();
      expect(db.executeProcedure).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Solo se puede dar de baja una alcabala en estado Activo.');
    });

    it('should NOT call the SP for estado 2 (Anulado) and return the exact Activo error', async () => {
      db.queryWithParams.mockResolvedValueOnce(
        mockSpResult([{ idrecibo: '58612727', estado: '2' }]),
      );

      const result = await service.darDeBaja(baseDto({ idrecibo: 0 }), 'mvaez', 'PC-001');

      expect(db.executeProcedure).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Solo se puede dar de baja una alcabala en estado Activo.');
    });

    it('should NOT call the SP when estado column is undefined and return the exact Activo error', async () => {
      db.queryWithParams.mockResolvedValueOnce(mockSpResult([{ idrecibo: '58612727' }]));

      const result = await service.darDeBaja(baseDto({ idrecibo: 0 }), 'mvaez', 'PC-001');

      expect(db.executeProcedure).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Solo se puede dar de baja una alcabala en estado Activo.');
    });

    it('should call the SP exactly once for estado 1 with numeric params (buscar string, id_alcabala number, idrecibo number)', async () => {
      db.queryWithParams.mockResolvedValueOnce(
        mockSpResult([{ idrecibo: '58612727', estado: '1' }]),
      );
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.darDeBaja(baseDto({ idrecibo: 0 }), 'mvaez', 'PC-001');

      expect(db.executeProcedure).toHaveBeenCalledTimes(1);
      expect(db.executeProcedure).toHaveBeenCalledWith(
        SP_DJALCABALA,
        expect.objectContaining({
          buscar: '9', // string
          id_alcabala: 5296, // number
          idrecibo: 58612727, // number
        }),
      );
    });

    it('should propagate executeProcedure error as failure with error message', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('SP timeout'));

      const result = await service.darDeBaja(baseDto(), 'mvaez', 'PC-001');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al dar de baja la alcabala');
    });
  });
});