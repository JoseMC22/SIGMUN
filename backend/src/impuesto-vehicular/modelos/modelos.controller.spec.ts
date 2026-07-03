import { Test, TestingModule } from '@nestjs/testing';
import { ModelosController } from './modelos.controller';
import { ModelosService } from './modelos.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ModeloRow,
  ModeloDetalle,
  CatalogoOption,
  PaginatedResponse,
} from './dto/modelos.types';

describe('ModelosController', () => {
  let controller: ModelosController;
  let service: jest.Mocked<ModelosService>;

  const mockService = {
    search: jest.fn(),
    getDetail: jest.fn(),
    getMarcas: jest.fn(),
    getCategorias: jest.fn(),
    save: jest.fn(),
    eliminar: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelosController],
      providers: [{ provide: ModelosService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ModelosController>(ModelosController);
    service = module.get(ModelosService);
  });

  // ── POST /impuesto-vehicular/modelos/search ─────────────────────

  describe('POST /impuesto-vehicular/modelos/search', () => {
    it('should delegate to service.search with parsed DTO and return PaginatedResponse', async () => {
      const mockData: ModeloRow[] = [
        {
          codmodelo: 'M001',
          marca: 'TOYOTA',
          nombre: 'COROLLA',
          estado: 'ACTIVO',
          categoria: 'SEDAN',
          id: '5',
        },
        {
          codmodelo: 'M002',
          marca: 'NISSAN',
          nombre: 'SENTRA',
          estado: 'INACTIVO',
          categoria: 'SEDAN',
          id: '9',
        },
      ];
      const expected: PaginatedResponse<ModeloRow> = {
        data: mockData,
        total: 2,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        tipoBusqueda: 'C',
        criterio: 'sedan',
        page: 1,
        pageSize: 15,
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoBusqueda: 'C',
          criterio: 'sedan',
          page: 1,
          pageSize: 15,
        }),
      );
    });

    it('should apply Zod defaults when body is empty', async () => {
      const expected: PaginatedResponse<ModeloRow> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({} as any);

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 15 }),
      );
    });
  });

  // ── GET /impuesto-vehicular/modelos/:id ─────────────────────────

  describe('GET /impuesto-vehicular/modelos/:id', () => {
    it('should return model detail when found', async () => {
      const mockDetail: ModeloDetalle = {
        id: '5',
        codmodelo: 'M001',
        nombre: 'COROLLA',
        id_marca: '2',
        marca: 'TOYOTA',
        id_categoria: '3',
        categoria: 'SEDAN',
        estado: 'ACTIVO',
      };
      mockService.getDetail.mockResolvedValue(mockDetail);

      const result = await controller.getDetail('5');

      expect(result).toEqual({ data: mockDetail });
      expect(mockService.getDetail).toHaveBeenCalledWith('5');
    });

    it('should return 404 when service returns null', async () => {
      mockService.getDetail.mockResolvedValue(null);

      const result = await controller.getDetail('9999');

      expect(result).toEqual({ success: false, error: 'Modelo no encontrado' });
      expect(mockService.getDetail).toHaveBeenCalledWith('9999');
    });
  });

  // ── GET /impuesto-vehicular/modelos/catalogos/marcas ────────────

  describe('GET /impuesto-vehicular/modelos/catalogos/marcas', () => {
    it('should return { data: CatalogoOption[] }', async () => {
      const mockMarcas: CatalogoOption[] = [
        { id: '1', nombre: 'TOYOTA' },
        { id: '2', nombre: 'NISSAN' },
      ];
      mockService.getMarcas.mockResolvedValue(mockMarcas);

      const result = await controller.getMarcas();

      expect(result).toEqual({ data: mockMarcas });
      expect(mockService.getMarcas).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /impuesto-vehicular/modelos/catalogos/categorias ────────

  describe('GET /impuesto-vehicular/modelos/catalogos/categorias', () => {
    it('should return { data: CatalogoOption[] }', async () => {
      const mockCategorias: CatalogoOption[] = [
        { id: '3', nombre: 'SEDAN' },
        { id: '4', nombre: 'SUV' },
      ];
      mockService.getCategorias.mockResolvedValue(mockCategorias);

      const result = await controller.getCategorias();

      expect(result).toEqual({ data: mockCategorias });
      expect(mockService.getCategorias).toHaveBeenCalledTimes(1);
    });
  });

  // ── POST /impuesto-vehicular/modelos/save ───────────────────────

  describe('POST /impuesto-vehicular/modelos/save', () => {
    it('should delegate to service.save with DTO', async () => {
      const saveDto = {
        nombre: 'COROLLA',
        id_categoria: '3',
        id_marca: '2',
        estado: '1',
      };
      mockService.save.mockResolvedValue({
        success: true,
        message: 'Modelo guardado correctamente',
      });

      const result = await controller.save(saveDto);

      expect(result).toEqual({
        success: true,
        message: 'Modelo guardado correctamente',
      });
      expect(mockService.save).toHaveBeenCalledWith(saveDto);
    });
  });

  // ── POST /impuesto-vehicular/modelos/eliminar ───────────────────

  describe('POST /impuesto-vehicular/modelos/eliminar', () => {
    it('should delegate to service.eliminar with id', async () => {
      mockService.eliminar.mockResolvedValue({
        success: true,
        message: 'Modelo eliminado correctamente',
      });

      const result = await controller.eliminar({ id: '5' });

      expect(result).toEqual({
        success: true,
        message: 'Modelo eliminado correctamente',
      });
      expect(mockService.eliminar).toHaveBeenCalledWith('5');
    });
  });
});
