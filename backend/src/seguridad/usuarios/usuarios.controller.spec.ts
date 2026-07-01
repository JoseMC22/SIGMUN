import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  UsuarioRow,
  AreaOption,
  PerfilOption,
  PaginatedResponse,
} from './dto/usuarios.types';
import { SearchUsuarioDto } from './dto/search-usuario.dto';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let service: jest.Mocked<UsuariosService>;

  const mockService = {
    search: jest.fn(),
    getAreas: jest.fn(),
    getPerfiles: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsuariosController>(UsuariosController);
    service = module.get(UsuariosService);
  });

  // ── POST /seguridad/usuarios/search ──────────────────────────

  describe('POST /seguridad/usuarios/search', () => {
    it('should delegate to service.search with parsed DTO and return PaginatedResponse', async () => {
      const mockData: UsuarioRow[] = [
        {
          id: 'USR001',
          nombre: 'JUAN PEREZ',
          area: '1102',
          perfil: 'ADMIN',
          usuario: 'jperez',
          estado: 'ACTIVADO',
        },
        {
          id: 'USR002',
          nombre: 'MARIA GARCIA',
          area: '1201',
          perfil: 'USER',
          usuario: 'mgarcia',
          estado: 'DESACTIVADO',
        },
      ];
      const expected: PaginatedResponse<UsuarioRow> = {
        data: mockData,
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        nombre: 'SISTEMAS',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'SISTEMAS', page: 1, pageSize: 20 }),
      );
    });

    it('should apply Zod defaults when body is empty and delegate to service', async () => {
      const expected: PaginatedResponse<UsuarioRow> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };
      mockService.search.mockResolvedValue(expected);

      // Simulate empty HTTP body — Zod .default() should fill page=1, pageSize=20
      const result = await controller.search({} as SearchUsuarioDto);

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 20 }),
      );
    });
  });

  // ── GET /seguridad/usuarios/areas ────────────────────────────

  describe('GET /seguridad/usuarios/areas', () => {
    it('should return { data: AreaOption[] } from service.getAreas', async () => {
      const mockAreas: AreaOption[] = [
        { area: '1102', nombre: 'ARCHIVO GENERAL' },
        { area: '1103', nombre: 'SECRETARIA' },
      ];
      mockService.getAreas.mockResolvedValue(mockAreas);

      const result = await controller.getAreas();

      expect(result).toEqual({ data: mockAreas });
      expect(mockService.getAreas).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /seguridad/usuarios/perfiles ─────────────────────────

  describe('GET /seguridad/usuarios/perfiles', () => {
    it('should return { data: PerfilOption[] } from service.getPerfiles', async () => {
      const mockPerfiles: PerfilOption[] = [
        { id_perfil: '1', nombre: 'ADMIN' },
        { id_perfil: '3', nombre: 'CONSULTA' },
      ];
      mockService.getPerfiles.mockResolvedValue(mockPerfiles);

      const result = await controller.getPerfiles();

      expect(result).toEqual({ data: mockPerfiles });
      expect(mockService.getPerfiles).toHaveBeenCalledTimes(1);
    });
  });
});
