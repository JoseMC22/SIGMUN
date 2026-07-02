import { Test, TestingModule } from '@nestjs/testing';
import { ValoresController } from './valores.controller';
import { ValoresService } from './valores.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ValorRow,
  ValorDetalle,
  CatalogoOption,
  PaginatedResponse,
} from './dto/valores.types';

describe('ValoresController', () => {
  let controller: ValoresController;
  let service: jest.Mocked<ValoresService>;

  const mockService = {
    search: jest.fn(),
    getDetail: jest.fn(),
    getCategorias: jest.fn(),
    getMarcas: jest.fn(),
    getModelosFiltrados: jest.fn(),
    getAniosEjercicio: jest.fn(),
    getAnios: jest.fn(),
    save: jest.fn(),
    eliminar: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValoresController],
      providers: [{ provide: ValoresService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ValoresController>(ValoresController);
    service = module.get(ValoresService);
  });

  // ── POST /impuesto-vehicular/valores-vehicular/search ────────────────────

  describe('POST /impuesto-vehicular/valores-vehicular/search', () => {
    it('should delegate to service.search with parsed DTO and return PaginatedResponse', async () => {
      const mockData: ValorRow[] = [
        {
          id: 'V001',
          ejercicio: '2024',
          categoria: 'SEDAN',
          marca: 'TOYOTA',
          modelo: 'COROLLA',
          anio: '2023',
          monto: 15000.5,
          estado: 'ACTIVO',
        },
        {
          id: 'V002',
          ejercicio: '2024',
          categoria: 'SUV',
          marca: 'NISSAN',
          modelo: 'X-TRAIL',
          anio: '2024',
          monto: 22000,
          estado: 'INACTIVO',
        },
      ];
      const expected: PaginatedResponse<ValorRow> = {
        data: mockData,
        total: 2,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        criterio1: 'SEDAN',
        criterio2: 'TOYOTA',
        criterio3: 'COROLLA',
        criterio4: '2023',
        page: 1,
        pageSize: 15,
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          criterio1: 'SEDAN',
          criterio2: 'TOYOTA',
          criterio3: 'COROLLA',
          criterio4: '2023',
          page: 1,
          pageSize: 15,
        }),
      );
    });

    it('should apply Zod defaults when body is empty', async () => {
      const expected: PaginatedResponse<ValorRow> = {
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

  // ── GET /impuesto-vehicular/valores-vehicular/:id ────────────────────────

  describe('GET /impuesto-vehicular/valores-vehicular/:id', () => {
    it('should return valor detail when found', async () => {
      const mockDetail: ValorDetalle = {
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
      };
      mockService.getDetail.mockResolvedValue(mockDetail);

      const result = await controller.getDetail('V001');

      expect(result).toEqual({ data: mockDetail });
      expect(mockService.getDetail).toHaveBeenCalledWith('V001');
    });

    it('should return 404 envelope when service returns null', async () => {
      mockService.getDetail.mockResolvedValue(null);

      const result = await controller.getDetail('9999');

      expect(result).toEqual({
        success: false,
        error: 'Valor no encontrado',
      });
      expect(mockService.getDetail).toHaveBeenCalledWith('9999');
    });
  });

  // ── GET /impuesto-vehicular/valores-vehicular/catalogos/categorias ───────

  describe('GET /impuesto-vehicular/valores-vehicular/catalogos/categorias', () => {
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

  // ── GET /impuesto-vehicular/valores-vehicular/catalogos/marcas ───────────

  describe('GET /impuesto-vehicular/valores-vehicular/catalogos/marcas', () => {
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

  // ── POST /impuesto-vehicular/valores-vehicular/catalogos/modelos ─────────

  describe('POST /impuesto-vehicular/valores-vehicular/catalogos/modelos', () => {
    it('should call service.getModelosFiltrados with id_categoria and id_marca', async () => {
      const mockModelos: CatalogoOption[] = [
        { id: '5', nombre: 'COROLLA' },
        { id: '6', nombre: 'YARIS' },
      ];
      mockService.getModelosFiltrados.mockResolvedValue(mockModelos);

      const result = await controller.getModelosFiltrados({
        id_categoria: '3',
        id_marca: '2',
      });

      expect(result).toEqual({ data: mockModelos });
      expect(mockService.getModelosFiltrados).toHaveBeenCalledWith('3', '2');
    });
  });

  // ── GET /impuesto-vehicular/valores-vehicular/catalogos/anios-ejercicio ──

  describe('GET /impuesto-vehicular/valores-vehicular/catalogos/anios-ejercicio', () => {
    it('should return { data: CatalogoOption[] }', async () => {
      const mockAniosEj: CatalogoOption[] = [
        { id: '1', nombre: '2024' },
        { id: '2', nombre: '2025' },
      ];
      mockService.getAniosEjercicio.mockResolvedValue(mockAniosEj);

      const result = await controller.getAniosEjercicio();

      expect(result).toEqual({ data: mockAniosEj });
      expect(mockService.getAniosEjercicio).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /impuesto-vehicular/valores-vehicular/catalogos/anios ────────────

  describe('GET /impuesto-vehicular/valores-vehicular/catalogos/anios', () => {
    it('should return { data: CatalogoOption[] }', async () => {
      const mockAnios: CatalogoOption[] = [
        { id: '2020', nombre: '2020' },
        { id: '2021', nombre: '2021' },
      ];
      mockService.getAnios.mockResolvedValue(mockAnios);

      const result = await controller.getAnios();

      expect(result).toEqual({ data: mockAnios });
      expect(mockService.getAnios).toHaveBeenCalledTimes(1);
    });
  });

  // ── POST /impuesto-vehicular/valores-vehicular/save ──────────────────────

  describe('POST /impuesto-vehicular/valores-vehicular/save', () => {
    it('should delegate to service.save with DTO', async () => {
      const saveDto = {
        id_anio: '1',
        id_categoria: '3',
        id_marca: '2',
        anio: '2023',
        monto: 15000,
        estado: '1',
        xidmod: 'mod-5',
      };
      mockService.save.mockResolvedValue({
        success: true,
        message: 'Valor guardado correctamente',
      });

      const result = await controller.save(saveDto);

      expect(result).toEqual({
        success: true,
        message: 'Valor guardado correctamente',
      });
      expect(mockService.save).toHaveBeenCalledWith(saveDto);
    });
  });

  // ── POST /impuesto-vehicular/valores-vehicular/eliminar ──────────────────

  describe('POST /impuesto-vehicular/valores-vehicular/eliminar', () => {
    it('should delegate to service.eliminar with id', async () => {
      mockService.eliminar.mockResolvedValue({
        success: true,
        message: 'Valor anulado correctamente',
      });

      const result = await controller.eliminar({ id: 'V001' });

      expect(result).toEqual({
        success: true,
        message: 'Valor anulado correctamente',
      });
      expect(mockService.eliminar).toHaveBeenCalledWith('V001');
    });
  });
});
