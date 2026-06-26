import { NotFoundException } from '@nestjs/common';
import { MantenimientoViasService } from './mantenimiento-vias.service';
import { DatabaseService } from '../../database/database.service';

// Helper: bypass mssql IRecordSet type strictness in mocks
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('MantenimientoViasService — Urbanizaciones CRUD', () => {
  let service: MantenimientoViasService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure' | 'query'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn(), query: jest.fn() };
    service = new MantenimientoViasService(db as unknown as DatabaseService);
  });

  // ── createUrbanizacion (@busc=16) ──────────────────────

  describe('createUrbanizacion', () => {
    it('should call SP with @busc=16 and mapped params', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.createUrbanizacion(
        {
          id_urba: 'U001',
          tipourb: 'RB',
          nombre: 'URBANIZACION TEST',
          nestado: '1',
          operador: '',
          estacion: '',
        },
        'jperez',
        '192.168.1.1',
      );

      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Rentas].[sp_Mant_Vias]',
        expect.objectContaining({
          busc: 16,
          tipovia: 'RB',
          nombre_via: 'URBANIZACION TEST',
          operador: 'jperez',
        }),
      );
      expect(result).toEqual({ message: 'Urbanización registrada correctamente' });
    });

    it('should use DTO operador/estacion when operador param is empty', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      await service.createUrbanizacion(
        {
          id_urba: '',
          tipourb: 'RB',
          nombre: 'Urbanización 2',
          nestado: '1',
          operador: 'manual_op',
          estacion: 'MANUAL_PC',
        },
        '',
        '',
      );

      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Rentas].[sp_Mant_Vias]',
        expect.objectContaining({
          busc: 16,
          operador: 'manual_op',
          estacion: 'MANUAL_PC',
        }),
      );
    });
  });

  // ── getUrbanizacion (@busc=21) ─────────────────────────

  describe('getUrbanizacion', () => {
    const mockSpRow = {
      id_urba: 'U001',
      tipourb: 'RB',
      nombres: 'URBANIZACION TEST',
      nestado: '1',
      operador: 'jperez',
      estacion: '192.168.1.1',
      fech_ing: '2026-06-25 10:00:00',
    };

    it('should call SP with @busc=21 and id_urba, return mapped detail', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([mockSpRow]));

      const result = await service.getUrbanizacion('U001');

      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Rentas].[sp_Mant_Vias]',
        { busc: 21, id_urba: 'U001' },
      );
      expect(result).toEqual({
        id_urba: 'U001',
        tipourb: 'RB',
        nombre: 'URBANIZACION TEST',
        nestado: '1',
        operador: 'jperez',
        estacion: '192.168.1.1',
        fech_ing: '2026-06-25 10:00:00',
      });
    });

    it('should throw NotFoundException when no rows returned', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      await expect(service.getUrbanizacion('ZZZZ')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateUrbanizacion (@busc=22) ──────────────────────

  describe('updateUrbanizacion', () => {
    it('should call SP with @busc=22 and mapped params', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      const result = await service.updateUrbanizacion(
        'U001',
        {
          id_urba: 'U001',
          tipourb: 'RB',
          nombre: 'URBANIZACION ACTUALIZADA',
          nestado: '1',
          operador: '',
          estacion: '',
        },
        'jperez',
        '192.168.1.1',
      );

      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Rentas].[sp_Mant_Vias]',
        expect.objectContaining({
          busc: 22,
          id_urba: 'U001',
          tipovia: 'RB',
          nombre_via: 'URBANIZACION ACTUALIZADA',
          nestado: '1',
          operador: 'jperez',
        }),
      );
      expect(result).toEqual({ message: 'Urbanización actualizada correctamente' });
    });

    it('should propagate SP error on failure', async () => {
      const spError = new Error('SQL Error');
      db.executeProcedure.mockRejectedValue(spError);

      await expect(
        service.updateUrbanizacion('U001', {
          id_urba: 'U001',
          tipourb: 'RB',
          nombre: 'Test',
          nestado: '1',
          operador: '',
          estacion: '',
        }),
      ).rejects.toThrow('SQL Error');
    });
  });
});
