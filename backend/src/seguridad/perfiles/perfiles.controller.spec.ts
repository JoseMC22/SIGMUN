import { Test, TestingModule } from '@nestjs/testing';
import { PerfilesController } from './perfiles.controller';
import { PerfilesService } from './perfiles.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PerfilRow, PaginatedResponse } from './dto/perfiles.types';
import { SearchPerfilDto } from './dto/search-perfil.dto';

describe('PerfilesController', () => {
  let controller: PerfilesController;
  let service: jest.Mocked<PerfilesService>;

  const mockService = {
    search: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerfilesController],
      providers: [{ provide: PerfilesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PerfilesController>(PerfilesController);
    service = module.get(PerfilesService);
  });

  // ── POST /seguridad/perfiles/search ──────────────────────────

  describe('POST /seguridad/perfiles/search', () => {
    it('should delegate to service.search with parsed DTO and return PaginatedResponse', async () => {
      const mockData: PerfilRow[] = [
        { id: '0000064', nombre: 'ADMINISTRACION', estado: 'ACTIVADO' },
        { id: '0000001', nombre: 'SISTEMAS', estado: 'DESACTIVADO' },
      ];
      const expected: PaginatedResponse<PerfilRow> = {
        data: mockData,
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        nombre: 'ADMIN',
        page: 1,
        pageSize: 10,
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'ADMIN', page: 1, pageSize: 10 }),
      );
    });

    it('should apply Zod defaults when body is empty and delegate to service', async () => {
      const expected: PaginatedResponse<PerfilRow> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      };
      mockService.search.mockResolvedValue(expected);

      // Simulate empty HTTP body — Zod .default() should fill page=1, pageSize=15
      const result = await controller.search({} as SearchPerfilDto);

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 15 }),
      );
    });
  });
});
