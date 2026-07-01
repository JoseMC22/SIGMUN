/// <reference types="jest" />

import { ValoresService } from './valores.service';
import { DatabaseService } from '../../database/database.service';

// Helper: bypass mssql IRecordSet type strictness in mocks
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('ValoresService', () => {
  let service: ValoresService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new ValoresService(db as unknown as DatabaseService);
  });

  // ── search() ─────────────────────────────────────────

  describe('search', () => {
    it('should call contar then listar SPs with PHP-correct pagination (page=1 → inicio=0)', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 10 }]))
        .mockResolvedValueOnce(mockSpResult<unknown[]>([]));

      await service.search({
        criterio1: 'SEDAN',
        criterio2: 'TOYOTA',
        criterio3: 'COROLLA',
        criterio4: '2023',
        page: 1,
        pageSize: 15,
      });

      // First call — count with criteria params
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        'sp_vehiculo_valores_contar',
        { criterio1: 'SEDAN', criterio2: 'TOYOTA', criterio3: 'COROLLA', criterio4: '2023' },
      );

      // Second call — list with PHP-correct inicio=0 for page 1
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        'sp_vehiculo_valores_listar',
        { criterio1: 'SEDAN', criterio2: 'TOYOTA', criterio3: 'COROLLA', criterio4: '2023', inicio: 0, fin: 15 },
      );
    });

    it('should use PHP-correct pagination for page=3 → inicio=31', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 100 }]))
        .mockResolvedValueOnce(mockSpResult<unknown[]>([]));

      await service.search({ page: 3, pageSize: 15 });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        'sp_vehiculo_valores_listar',
        expect.objectContaining({ inicio: 31, fin: 45 }),
      );
    });

    it('should map SP column names to ValorRow correctly', async () => {
      const spRow = {
        id_valor: 'V001',
        ejec: '2024',
        nomcate: 'SEDAN',
        nommarca: 'TOYOTA',
        nommodelo: 'COROLLA',
        anio: '2023',
        monto: 15000.50,
        estado: '1',
      };

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]))
        .mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: 'V001',
        ejercicio: '2024',
        categoria: 'SEDAN',
        marca: 'TOYOTA',
        modelo: 'COROLLA',
        anio: '2023',
        monto: 15000.50,
        estado: 'ACTIVO',
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(15);
      expect(result.totalPages).toBe(1);
    });

    it('should map estado "0" to INACTIVO', async () => {
      const spRow = {
        id_valor: 'V002',
        ejec: '2024',
        nomcate: 'SUV',
        nommarca: 'NISSAN',
        nommodelo: 'X-TRAIL',
        anio: '2024',
        monto: 22000,
        estado: '0',
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

    it('should pass empty strings for criteria when not provided', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult([]));

      await service.search({ page: 1, pageSize: 15 });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        'sp_vehiculo_valores_contar',
        { criterio1: '', criterio2: '', criterio3: '', criterio4: '' },
      );
    });
  });

  // ── getDetail() ───────────────────────────────────────

  describe('getDetail', () => {
    it('should call buscar SP with tipo=1 and return mapped ValorDetalle', async () => {
      const spRow = {
        id_valor: 'V001',
        id_anio: '1',
        ejec: '2024',
        id_categoria: '3',
        id_marca: '2',
        nommarca: 'TOYOTA',
        id_modelo: '5',
        nommodelo: 'COROLLA',
        anio: '2023',
        monto: 15000,
        estado: '1',
        xidmod: 'mod-5',
      };

      // The SP has a SELECT that includes mo.id as the last column,
      // so the mocked result needs to match. The SP returns column names
      // id_valor, id_anio, ejec, id_categoria, id_marca, nommarca,
      // id_modelo, nommodelo, anio, monto, estado, mo.id (as xidmod)
      db.executeProcedure.mockResolvedValue(mockSpResult([spRow]));

      const result = await service.getDetail('V001');

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_buscar',
        { tipo: '1', datos: 'V001' },
      );

      expect(result).toEqual({
        id: 'V001',
        id_anio: '1',
        ejercicio: '2024',
        id_categoria: '3',
        categoria: '',
        id_marca: '2',
        marca: 'TOYOTA',
        id_modelo: '5',
        modelo: 'COROLLA',
        anio: '2023',
        monto: 15000,
        estado: '1',
        xidmod: 'mod-5',
      });
    });

    it('should return null when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.getDetail('9999');

      expect(result).toBeNull();
    });

    it('should include xidmod field from nested mo.id column', async () => {
      // The SP returns id_valor, ejec, ..., mo.id (mapped as xidmod)
      const spRow = {
        id_valor: 'V003',
        id_anio: '2',
        ejec: '2025',
        id_categoria: '4',
        id_marca: '3',
        nommarca: 'NISSAN',
        id_modelo: '7',
        nommodelo: 'VERSA',
        anio: '2025',
        monto: 18000,
        estado: '0',
        xidmod: 'mod-7',
      };

      db.executeProcedure.mockResolvedValue(mockSpResult([spRow]));

      const result = await service.getDetail('V003');

      expect(result).not.toBeNull();
      expect(result!.xidmod).toBe('mod-7');
      expect(result!.modelo).toBe('VERSA');
    });
  });

  // ── getCategorias() ───────────────────────────────────

  describe('getCategorias', () => {
    it('should call buscar with tipo=2 and map to CatalogoOption[]', async () => {
      const spRows = [
        { id_categoria: '3', nombre: 'SEDAN' },
        { id_categoria: '4', nombre: 'SUV' },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult(spRows));

      const result = await service.getCategorias();

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_buscar',
        { tipo: '2' },
      );
      expect(result).toEqual([
        { id: '3', nombre: 'SEDAN' },
        { id: '4', nombre: 'SUV' },
      ]);
    });

    it('should return empty array when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.getCategorias();

      expect(result).toEqual([]);
    });
  });

  // ── getMarcas() ───────────────────────────────────────

  describe('getMarcas', () => {
    it('should call buscar with tipo=3 and map to CatalogoOption[]', async () => {
      const spRows = [
        { id_marca: '1', nombre: 'TOYOTA' },
        { id_marca: '2', nombre: 'NISSAN' },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult(spRows));

      const result = await service.getMarcas();

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_buscar',
        { tipo: '3' },
      );
      expect(result).toEqual([
        { id: '1', nombre: 'TOYOTA' },
        { id: '2', nombre: 'NISSAN' },
      ]);
    });
  });

  // ── getModelosFiltrados() ─────────────────────────────

  describe('getModelosFiltrados', () => {
    it('should call buscar with tipo=4 and cascading params', async () => {
      const spRows = [
        { id: '5', nombre: 'COROLLA' },
        { id: '6', nombre: 'YARIS' },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult(spRows));

      const result = await service.getModelosFiltrados('3', '1');

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_buscar',
        { tipo: '4', datos1: '3', datos2: '1' },
      );
      expect(result).toEqual([
        { id: '5', nombre: 'COROLLA' },
        { id: '6', nombre: 'YARIS' },
      ]);
    });

    it('should return empty array when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.getModelosFiltrados('999', '999');

      expect(result).toEqual([]);
    });
  });

  // ── getAniosEjercicio() ───────────────────────────────

  describe('getAniosEjercicio', () => {
    it('should call buscar with tipo=5 and map to CatalogoOption[]', async () => {
      const spRows = [
        { id_anio: '1', anio: '2024' },
        { id_anio: '2', anio: '2025' },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult(spRows));

      const result = await service.getAniosEjercicio();

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_buscar',
        { tipo: '5' },
      );
      expect(result).toEqual([
        { id: '1', nombre: '2024' },
        { id: '2', nombre: '2025' },
      ]);
    });
  });

  // ── getAnios() ────────────────────────────────────────

  describe('getAnios', () => {
    it('should call buscar with tipo=6 and map to CatalogoOption[]', async () => {
      const spRows = [
        { anio: '2020', anio1: '2020' },
        { anio: '2021', anio1: '2021' },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult(spRows));

      const result = await service.getAnios();

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_buscar',
        { tipo: '6' },
      );
      expect(result).toEqual([
        { id: '2020', nombre: '2020' },
        { id: '2021', nombre: '2021' },
      ]);
    });
  });

  // ── save() (create/update) ────────────────────────────

  describe('save', () => {
    it('should call grabar SP with mquery=1 when id is empty (create)', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      await service.save({
        id_anio: '1',
        id_categoria: '3',
        id_marca: '2',
        id_modelo: '5',
        anio: '2023',
        monto: 15000,
        estado: '1',
        xidmod: 'mod-5',
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_grabar',
        {
          mquery: '1',
          xid_valor: 0,
          xanioeje: '1',
          xid_categoria: '3',
          xid_marca: '2',
          xid_modelo: '5',
          xanio: '2023',
          xmonto: 15000,
          xestado: '1',
          xidmod: 'mod-5',
        },
      );
    });

    it('should call grabar SP with mquery=2 when id is provided (update)', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      await service.save({
        id: 'V001',
        id_anio: '1',
        id_categoria: '3',
        id_marca: '2',
        id_modelo: '5',
        anio: '2023',
        monto: 18000,
        estado: '1',
        xidmod: 'mod-5',
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_grabar',
        {
          mquery: '2',
          xid_valor: 'V001',
          xanioeje: '1',
          xid_categoria: '3',
          xid_marca: '2',
          xid_modelo: '5',
          xanio: '2023',
          xmonto: 18000,
          xestado: '1',
          xidmod: 'mod-5',
        },
      );
    });

    it('should return success message', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.save({
        id_anio: '1',
        id_categoria: '3',
        id_marca: '2',
        anio: '2023',
        monto: 15000,
        estado: '1',
        xidmod: 'mod-5',
      });

      expect(result).toEqual({
        success: true,
        message: 'Valor guardado correctamente',
      });
    });

    it('should pass empty string for id_modelo when not provided', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      await service.save({
        id_anio: '1',
        id_categoria: '3',
        id_marca: '2',
        anio: '2023',
        monto: 15000,
        estado: '1',
        xidmod: 'mod-5',
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_grabar',
        expect.objectContaining({ xid_modelo: '' }),
      );
    });
  });

  // ── eliminar() ────────────────────────────────────────

  describe('eliminar', () => {
    it('should call grabar SP with mquery=3 and xid_valor', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.eliminar('V001');

      expect(db.executeProcedure).toHaveBeenCalledWith(
        'sp_vehiculo_valores_grabar',
        { mquery: '3', xid_valor: 'V001' },
      );
      expect(result).toEqual({
        success: true,
        message: 'Valor anulado correctamente',
      });
    });
  });
});
