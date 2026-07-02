/// <reference types="jest" />

import { ModelosService } from './modelos.service';
import { DatabaseService } from '../../database/database.service';

// Helper: bypass mssql IRecordSet type strictness in mocks
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('ModelosService', () => {
  let service: ModelosService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new ModelosService(db as unknown as DatabaseService);
  });

  // ── search() ─────────────────────────────────────────

  describe('search', () => {
    it('should call contar then listar SPs with PHP-correct pagination (page=1 → inicio=0)', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 10 }]))
        .mockResolvedValueOnce(mockSpResult<unknown[]>([]));

      await service.search({
        tipoBusqueda: 'C',
        criterio: 'sedan',
        page: 1,
        pageSize: 15,
      });

      // First call — count
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        'sp_vehiculo_modelo_contar',
        { tipo: 'C', criterio: 'sedan' },
      );

      // Second call — list with PHP-correct inicio=0 for page 1
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        'sp_vehiculo_modelo_listar',
        { tipo: 'C', criterio: 'sedan', inicio: 0, fin: 15 },
      );
    });

    it('should use PHP-correct pagination for page=3 → inicio=31', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 100 }]))
        .mockResolvedValueOnce(mockSpResult<unknown[]>([]));

      await service.search({ page: 3, pageSize: 15 });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        'sp_vehiculo_modelo_listar',
        expect.objectContaining({ inicio: 31, fin: 45 }),
      );
    });

    it('should map SP row to ModeloRow with correct index mapping', async () => {
      // Real SP column names from sp_vehiculo_modelo_listar:
      //   id_modelo | id_marca | nombre_mar | nombre_mod | estado | nombre_cat | id | ROW
      const spRow = {
        id_modelo: 'M001',
        id_marca: '1',
        nombre_mar: 'TOYOTA',
        nombre_mod: 'COROLLA',
        estado: '1',
        nombre_cat: 'SEDAN',
        id: '42',
        ROW: 1,
      };

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        codmodelo: 'M001',
        marca: 'TOYOTA',
        nombre: 'COROLLA',
        estado: 'ACTIVO',
        categoria: 'SEDAN',
        id: '42',
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(15);
      expect(result.totalPages).toBe(1);
    });

    it('should map estado "0" to INACTIVO', async () => {
      const spRow = {
        id_modelo: 'M002',
        id_marca: '2',
        nombre_mar: 'NISSAN',
        nombre_mod: 'SENTRA',
        estado: '0',
        nombre_cat: 'SEDAN',
        id: '43',
        ROW: 1,
      };

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.data[0].estado).toBe('INACTIVO');
    });

    it('should return totalPages=0 when total is 0', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should pass empty strings for filters when not provided', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      await service.search({ page: 1, pageSize: 15 });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        'sp_vehiculo_modelo_contar',
        { tipo: '', criterio: '' },
      );
    });
  });

  // ── getDetail() ───────────────────────────────────────

  describe('getDetail', () => {
    it('should call buscar SP with tipo=1 and return mapped detalle', async () => {
      // SP does SELECT * FROM tblvehiculomodelo
      const spRow = {
        id: '5',
        id_modelo: 'M001',
        nombre: 'COROLLA',
        id_categoria: '3',
        id_marca: '2',
        estado: '1',
      };

      db.executeProcedure.mockResolvedValue(mockSpResult([spRow]));

      const result = await service.getDetail('5');

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_modelo_buscar',
        { tipo: '1', datos: '5' },
      );
      expect(result).toEqual({
        id: '5',
        codmodelo: 'M001',
        nombre: 'COROLLA',
        id_marca: '2',
        marca: '',
        id_categoria: '3',
        categoria: '',
        estado: 'ACTIVO',
      });
    });

    it('should return null when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.getDetail('9999');

      expect(result).toBeNull();
    });
  });

  // ── getMarcas() ───────────────────────────────────────

  describe('getMarcas', () => {
    it('should call buscar with tipo=3 and map to CatalogoOption[]', async () => {
      // SP: SELECT * FROM tblvehiculomarca → columna PK es id_marca
      const spRows = [
        { id_marca: '1', nombre: 'TOYOTA' },
        { id_marca: '2', nombre: 'NISSAN' },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult(spRows));

      const result = await service.getMarcas();

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_modelo_buscar',
        { tipo: '3', datos: '1' },
      );
      expect(result).toEqual([
        { id: '1', nombre: 'TOYOTA' },
        { id: '2', nombre: 'NISSAN' },
      ]);
    });

    it('should return empty array when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.getMarcas();

      expect(result).toEqual([]);
    });
  });

  // ── getCategorias() ───────────────────────────────────

  describe('getCategorias', () => {
    it('should call buscar with tipo=2 and map to CatalogoOption[]', async () => {
      // SP: SELECT id_categoria, nombre FROM tblvehiculocategoria
      const spRows = [
        { id_categoria: '3', nombre: 'SEDAN' },
        { id_categoria: '4', nombre: 'SUV' },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult(spRows));

      const result = await service.getCategorias();

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_modelo_buscar',
        { tipo: '2', datos: '1' },
      );
      expect(result).toEqual([
        { id: '3', nombre: 'SEDAN' },
        { id: '4', nombre: 'SUV' },
      ]);
    });
  });

  // ── save() (create/update) ────────────────────────────

  describe('save', () => {
    it('should call grabar SP with mquery=1 when id is empty (create)', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      await service.save({
        nombre: 'COROLLA',
        id_categoria: '3',
        id_marca: '2',
        estado: '1',
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_modelo_grabar',
        {
          mquery: '1',
          xid_modelo: '',
          xnombre: 'COROLLA',
          xid_categoria: '3',
          xid_marca: '2',
          xestado: '1',
        },
      );
    });

    it('should call grabar SP with mquery=2 when id is provided (update)', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      await service.save({
        id: '5',
        nombre: 'COROLLA X',
        id_categoria: '3',
        id_marca: '2',
        estado: '1',
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_modelo_grabar',
        {
          mquery: '2',
          xid_modelo: '5',
          xnombre: 'COROLLA X',
          xid_categoria: '3',
          xid_marca: '2',
          xestado: '1',
        },
      );
    });

    it('should return success message', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.save({
        nombre: 'COROLLA',
        id_categoria: '3',
        id_marca: '2',
        estado: '1',
      });

      expect(result).toEqual({
        success: true,
        message: 'Modelo guardado correctamente',
      });
    });
  });

  // ── eliminar() ────────────────────────────────────────

  describe('eliminar', () => {
    it('should call grabar SP with mquery=3 and only xid_modelo', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.eliminar('5');

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_modelo_grabar',
        { mquery: '3', xid_modelo: '5' },
      );
      expect(result).toEqual({
        success: true,
        message: 'Modelo eliminado correctamente',
      });
    });
  });
});
