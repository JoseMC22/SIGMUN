import { UsuariosService, calculatePaginationParams } from './usuarios.service';
import { DatabaseService } from '../../database/database.service';
import {
  SpUsuariosRow,
  SpUsuariosTotal,
  SpAreaRow,
  SpPerfilRow,
} from './dto/usuarios.types';

// Helper: bypass mssql IRecordSet type strictness in mocks
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

// ─────────────────────────────────────────────────────────
// T3: Pagination math (pure function — zero mocks needed)
// ─────────────────────────────────────────────────────────
describe('calculatePaginationParams', () => {
  it('page 1, pageSize 20 → inicio=1, final=20', () => {
    const result = calculatePaginationParams(1, 20);
    expect(result).toEqual({ inicio: 1, final: 20 });
  });

  it('page 2, pageSize 20 → inicio=21, final=40', () => {
    const result = calculatePaginationParams(2, 20);
    expect(result).toEqual({ inicio: 21, final: 40 });
  });

  it('page 3, pageSize 20, total 45 → inicio=41, final=60, totalPages=3', () => {
    const result = calculatePaginationParams(3, 20, 45);
    expect(result).toEqual({ inicio: 41, final: 60, totalPages: 3 });
  });

  it('page 1, pageSize 100 → inicio=1, final=100', () => {
    const result = calculatePaginationParams(1, 100);
    expect(result).toEqual({ inicio: 1, final: 100 });
  });
});

// ─────────────────────────────────────────────────────────
// T1, T4, T5: UsuariosService (mocks required)
// ─────────────────────────────────────────────────────────
describe('UsuariosService', () => {
  let service: UsuariosService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new UsuariosService(db as unknown as DatabaseService);
  });

  // ── T1: Service.search() ─────────────────────────────
  describe('search', () => {
    it('should call SP with busc=6 for total and busc=5 with pagination for rows', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpUsuariosTotal>([{ total: 45 }]))
        .mockResolvedValueOnce(mockSpResult<SpUsuariosRow>([]));

      await service.search({
        nombre: 'SISTEMAS',
        page: 1,
        pageSize: 20,
      });

      // First call — count query: busc=6, NO inicio/final
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        '[Acceso].[sp_TblUsuarios]',
        expect.objectContaining({
          busc: 6,
          nombres: 'SISTEMAS',
        }),
      );
      const firstCallParams = (db.executeProcedure as jest.Mock).mock.calls[0][1];
      expect(firstCallParams).not.toHaveProperty('inicio');
      expect(firstCallParams).not.toHaveProperty('final');

      // Second call — data query: busc=5, WITH inicio/final
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        '[Acceso].[sp_TblUsuarios]',
        expect.objectContaining({
          busc: 5,
          nombres: 'SISTEMAS',
          inicio: 1,
          final: 20,
        }),
      );
    });

    it('should pass empty strings for all filter params when filters are empty', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpUsuariosTotal>([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult<SpUsuariosRow>([]));

      await service.search({ codigo: '', nombre: '', usuario: '', area: '', perfil: '', estado: '', page: 1, pageSize: 20 });

      const expectedWithEmpty = expect.objectContaining({
        busc: 6,
        id_usuario: '',
        nombres: '',
        vlogin: '',
        area: '',
        id_perfil: '',
        nest: '',
      });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        '[Acceso].[sp_TblUsuarios]',
        expectedWithEmpty,
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        '[Acceso].[sp_TblUsuarios]',
        expect.objectContaining({
          busc: 5,
          id_usuario: '',
          nombres: '',
          vlogin: '',
          area: '',
          id_perfil: '',
          nest: '',
          inicio: 1,
          final: 20,
        }),
      );
    });

    it('should map SP result SpUsuariosRow[] to UsuarioRow[] correctly', async () => {
      const mockRows: SpUsuariosRow[] = [
        {
          id_usuario: 'USR001',
          nombre: 'JUAN PEREZ',
          area: '1102',
          perfil: 'ADMIN',
          vlogin: 'jperez',
          nestado: '1',
          ROW: 1,
        },
        {
          id_usuario: 'USR002',
          nombre: 'MARIA GARCIA',
          area: '1201',
          perfil: 'USER',
          vlogin: 'mgarcia',
          nestado: '0',
          ROW: 2,
        },
      ];

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpUsuariosTotal>([{ total: 2 }]))
        .mockResolvedValueOnce(mockSpResult<SpUsuariosRow>(mockRows));

      const result = await service.search({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'USR001',
        nombre: 'JUAN PEREZ',
        area: '1102',
        perfil: 'ADMIN',
        usuario: 'jperez',
        estado: 'ACTIVADO',
      });
      expect(result.data[1]).toEqual({
        id: 'USR002',
        nombre: 'MARIA GARCIA',
        area: '1201',
        perfil: 'USER',
        usuario: 'mgarcia',
        estado: 'DESACTIVADO',
      });
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should return totalPages=0 when total is 0', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpUsuariosTotal>([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult<SpUsuariosRow>([]));

      const result = await service.search({ page: 1, pageSize: 20 });

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  // ── T4: getAreas() ──────────────────────────────────
  describe('getAreas', () => {
    it('should map SP rows to AreaOption[]', async () => {
      const mockRows: SpAreaRow[] = [
        { area: '1102', nombre: 'ARCHIVO GENERAL' },
        { area: '1103', nombre: 'SECRETARIA' },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult<SpAreaRow>(mockRows));

      const result = await service.getAreas();

      expect(result).toEqual([
        { area: '1102', nombre: 'ARCHIVO GENERAL' },
        { area: '1103', nombre: 'SECRETARIA' },
      ]);
      expect(db.executeProcedure).toHaveBeenCalledWith('dbo.sp_tccostos', {
        busc: '1',
      });
    });

    it('should return empty array when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult<SpAreaRow>([]));

      const result = await service.getAreas();

      expect(result).toEqual([]);
    });
  });

  // ── T5: getPerfiles() ───────────────────────────────
  describe('getPerfiles', () => {
    it('should only return rows with nestado=1', async () => {
      const mockRows: SpPerfilRow[] = [
        { id_perfil: '1', nombre: 'ADMIN', nestado: 1 },
        { id_perfil: '2', nombre: 'SOPORTE', nestado: 0 },
        { id_perfil: '3', nombre: 'CONSULTA', nestado: 1 },
        { id_perfil: '4', nombre: 'INACTIVO', nestado: 0 },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult<SpPerfilRow>(mockRows));

      const result = await service.getPerfiles();

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id_perfil: '1', nombre: 'ADMIN' },
        { id_perfil: '3', nombre: 'CONSULTA' },
      ]);
    });

    it('should return empty array when all perfiles are inactive', async () => {
      const mockRows: SpPerfilRow[] = [
        { id_perfil: '2', nombre: 'SOPORTE', nestado: 0 },
        { id_perfil: '4', nombre: 'INACTIVO', nestado: 0 },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult<SpPerfilRow>(mockRows));

      const result = await service.getPerfiles();

      expect(result).toEqual([]);
    });
  });
});
