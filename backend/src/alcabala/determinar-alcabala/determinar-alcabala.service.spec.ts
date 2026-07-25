/// <reference types="jest" />

import { DeterminarAlcabalaService } from './determinar-alcabala.service';
import { DatabaseService } from '../../database/database.service';

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
    it('should call sp_Mcontribuyente with busc:5 for rows and busc:6 for count', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 10 }]))  // count query
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));  // rows query

      await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '12345',
        page: 1,
        pageSize: 15,
      });

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

      await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '12345',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        codigo: '12345',
        nombres: '',
        paterno: '',
        materno: '',
        num_doc: '',
        razon: '',
      }));
    });

    it('should map busqueda to nombres when tipoBusqueda=N', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      await service.searchContribuyente({
        tipoBusqueda: 'N',
        busqueda: 'GARCIA',
        page: 1,
        pageSize: 15,
      });

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

      await service.searchContribuyente({
        tipoBusqueda: 'R',
        busqueda: 'EMPRESA SAC',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        razon: 'EMPRESA SAC',
      }));
    });

    it('should map busqueda to num_doc when tipoBusqueda=D', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      await service.searchContribuyente({
        tipoBusqueda: 'D',
        busqueda: '12345678',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP_MCONTRIBUYENTE, expect.objectContaining({
        num_doc: '12345678',
      }));
    });

    it('should calculate pagination offsets correctly', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 50 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '123',
        page: 3,
        pageSize: 10,
      });

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

      const result = await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '12345',
        page: 1,
        pageSize: 15,
      });

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

      const result = await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '999',
        page: 1,
        pageSize: 15,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 50 }]))
        .mockResolvedValueOnce(mockSpResult([contribuyenteRow()]));

      const result = await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '123',
        page: 1,
        pageSize: 15,
      });

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

      const result = await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '001',
        page: 1,
        pageSize: 15,
      });

      expect(result.data[0].paterno).toBe('');
      expect(result.data[0].materno).toBe('');
      expect(result.data[0].nombres).toBe('');
      expect(result.data[0].direccion).toBe('');
    });

    it('should handle SP error gracefully', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('DB connection failed'));

      const result = await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '123',
        page: 1,
        pageSize: 15,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should pass cod_pred and checkfrac as empty and 0', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      await service.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '123',
        page: 1,
        pageSize: 15,
      });

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
});