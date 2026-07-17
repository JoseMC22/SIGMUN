/// <reference types="jest" />

import { ConsultaRdAlcabalaService } from './consulta-rd-alcabala.service';
import { DatabaseService } from '../../database/database.service';

function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('ConsultaRdAlcabalaService', () => {
  let service: ConsultaRdAlcabalaService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  const SP_NAME = 'Rentas.SP_ConsultadocuAlcabala';

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new ConsultaRdAlcabalaService(db as unknown as DatabaseService);
  });

  describe('search', () => {
    it('should call SP once with msquery=1 and empty date filters', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.search({

        codigo: '12345',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledTimes(1);
      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME, {
        msquery: '1',
        codigo: '12345',
        unombre: '',
        inicio: '',
        final: '',
        id_valor: '08',
      });
    });

    it('should map contribuyente to @unombre param', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.search({

        codigo: '',
        contribuyente: 'Empresa SAC',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME, {
        msquery: '1',
        codigo: '',
        unombre: 'Empresa SAC',
        inicio: '',
        final: '',
        id_valor: '08',
      });
    });



    it('should paginate client-side (page 2 of 50 records, pageSize 15)', async () => {
      const rows = Array.from({ length: 50 }, (_, i) => ({
        ROW: i + 1,
        codigo: `C${String(i + 1).padStart(3, '0')}`,
        nombre: `Contribuyente ${i + 1}`,
        nomb_val: 'R.D. N°',
        num_val: `RD-${String(i + 1).padStart(5, '0')}`,
        ano_val: 2024,
        MontoTotal: 100 * (i + 1),
        fec_val: '2024-01-01',
        estado: 'PENDIENTE',
        fpago: 'Efectivo',
        recibo: `REC-${i + 1}`,
      }));

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(rows));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 2,
        pageSize: 15,
      });

      // page=2, pageSize=15 → slice(15, 30) = 15 items
      expect(result.success).toBe(true);
      expect(result.total).toBe(50);
      expect(result.data).toHaveLength(15);
      expect(result.data[0].ROW).toBe(16);
      expect(result.data[14].ROW).toBe(30);
      expect(result.totalPages).toBe(4);
    });

    it('should map SP rows to ConsultaRDRow domain type with all fields', async () => {
      const spRow = {
        ROW: 1,
        codigo: '001',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D. N°',
        num_val: 'RD-00123',
        ano_val: 2024,
        MontoTotal: 150000.5,
        fec_val: '2024-06-15',
        estado: 'PENDIENTE',
        fpago: 'Efectivo',
        recibo: 'REC-001',
      };

      db.executeProcedure.mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        ROW: 1,
        codigo: '001',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D. N°',
        num_val: 'RD-00123',
        ano_val: 2024,
        MontoTotal: 150000.5,
        fec_val: '2024-06-15',
        estado: 'PENDIENTE',
        fpago: 'Efectivo',
        recibo: 'REC-001',
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by estado in-memory when provided', async () => {
      const rows = [
        { ROW: 1, codigo: '001', nombre: 'A', nomb_val: 'R.D.', num_val: 'RD-001', ano_val: 2024, MontoTotal: 100, fec_val: '', estado: 'PENDIENTE', fpago: 'Efectivo', recibo: 'R1' },
        { ROW: 2, codigo: '002', nombre: 'B', nomb_val: 'R.D.', num_val: 'RD-002', ano_val: 2024, MontoTotal: 200, fec_val: '', estado: 'ACTIVO', fpago: 'Placa', recibo: 'R2' },
        { ROW: 3, codigo: '003', nombre: 'C', nomb_val: 'R.D.', num_val: 'RD-003', ano_val: 2024, MontoTotal: 300, fec_val: '', estado: 'PENDIENTE', fpago: 'Efectivo', recibo: 'R3' },
      ];

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(rows));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: 'PENDIENTE',
        page: 1,
        pageSize: 15,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].num_val).toBe('RD-001');
      expect(result.data[1].num_val).toBe('RD-003');
    });

    it('should return success=false on SP error', async () => {
      db.executeProcedure.mockRejectedValueOnce(new Error('SP error'));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al consultar registros');
    });

    it('should return totalPages=0 when no rows returned', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly (50 records, pageSize 15 = 4 pages)', async () => {
      const rows = Array.from({ length: 50 }, (_, i) => ({
        ROW: i + 1,
        codigo: `C${i + 1}`,
        nombre: `N${i + 1}`,
        nomb_val: '',
        num_val: '',
        ano_val: 2024,
        MontoTotal: 0,
        fec_val: '',
        estado: '',
        fpago: '',
        recibo: '',
      }));

      db.executeProcedure.mockResolvedValueOnce(mockSpResult(rows));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.totalPages).toBe(4);
    });

    it('should always pass id_valor="08" for Alcabala', async () => {
      db.executeProcedure.mockResolvedValueOnce(mockSpResult([]));

      await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(SP_NAME, expect.objectContaining({
        id_valor: '08',
      }));
    });

    it('should handle SP returning null recordset gracefully', async () => {
      db.executeProcedure.mockResolvedValueOnce({ recordset: undefined } as any);

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle case-insensitive SP column names', async () => {
      const spRow = {
        ROW: 1,
        Codigo: '001',
        Nombre: 'Empresa SAC',
        Nomb_val: 'R.D.',
        Num_val: 'RD-001',
        Ano_val: 2024,
        Montototal: 1000,
        Fec_val: '2024-01-01',
        Estado: 'ACTIVO',
        Fpago: 'Efectivo',
        Recibo: 'REC-001',
      };

      db.executeProcedure.mockResolvedValueOnce(mockSpResult([spRow]));

      const result = await service.search({

        codigo: '',
        contribuyente: '',
        estado: '',
        page: 1,
        pageSize: 15,
      });

      expect(result.data[0]).toEqual({
        ROW: 1,
        codigo: '001',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
        num_val: 'RD-001',
        ano_val: 2024,
        MontoTotal: 1000,
        fec_val: '2024-01-01',
        estado: 'ACTIVO',
        fpago: 'Efectivo',
        recibo: 'REC-001',
      });
    });
  });
});
