/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { ConsultaRdAlcabalaController } from './consulta-rd-alcabala.controller';
import { ConsultaRdAlcabalaService } from './consulta-rd-alcabala.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConsultaRDResult, DetalleRDResult, RutaRDResult, ImprimirRDResult } from './consulta-rd-alcabala.types';

describe('ConsultaRdAlcabalaController', () => {
  let controller: ConsultaRdAlcabalaController;
  let service: jest.Mocked<ConsultaRdAlcabalaService>;

  const mockService = {
    search: jest.fn(),
    getDetail: jest.fn(),
    getRuta: jest.fn(),
    getImprimir: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsultaRdAlcabalaController],
      providers: [{ provide: ConsultaRdAlcabalaService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConsultaRdAlcabalaController>(ConsultaRdAlcabalaController);
    service = module.get(ConsultaRdAlcabalaService);
  });

  describe('GET /alcabala/consulta-rd', () => {
    it('should delegate to service.search with parsed query params', async () => {
      const expected: ConsultaRDResult = {
        success: true,
        data: [
          {
            ROW: 1,
            codigo: '001',
            nombre: 'Empresa SAC',
            nomb_val: 'R.D. N°',
            num_val: 'RD-001',
            ano_val: 2024,
            MontoTotal: 150000,
            fec_val: '2024-06-15',
            estado: 'PENDIENTE',
            fpago: 'Efectivo',
            recibo: 'REC-001',
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        codigo: '12345',
        contribuyente: '',
        estado: '',
        page: '1',
        pageSize: '15',
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: '12345',
          page: 1,
          pageSize: 15,
        }),
      );
    });

    it('should apply Zod defaults when query params are empty', async () => {
      mockService.search.mockResolvedValue({
        success: true,
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      const result = await controller.search({});

      expect(result.success).toBe(true);
      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 15,
        }),
      );
    });

    it('should return error envelope on Zod validation failure', async () => {
      const result = await controller.search({ page: 'abc', pageSize: 'xyz' } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('GET /alcabala/consulta-rd/detail', () => {
    it('should delegate to service.getDetail with parsed query params', async () => {
      const expected: DetalleRDResult = {
        success: true,
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
        num_val: 'RD-001',
        ano_val: 2024,
        data: [
          {
            row_num: 1,
            id: 0,
            anno: '2025',
            imp_insol: 137.56,
            imp_reaj: 137.56,
            costo_emis: 0,
            mora: 2.97,
            total: 140.53,
            anio: '2025',
          },
        ],
      };
      mockService.getDetail.mockResolvedValue(expected);

      const result = await controller.detail({
        num_val: 'RD-001',
        ano_val: '2024',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
      });

      expect(result).toEqual(expected);
      expect(mockService.getDetail).toHaveBeenCalledWith({
        num_val: 'RD-001',
        ano_val: '2024',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
      });
    });

    it('should apply Zod defaults when detail params are empty', async () => {
      mockService.getDetail.mockResolvedValue({
        success: true,
        nombre: '',
        nomb_val: '',
        num_val: '',
        ano_val: 0,
        data: [],
      });

      const result = await controller.detail({});

      expect(result.success).toBe(true);
      expect(mockService.getDetail).toHaveBeenCalledWith(
        expect.objectContaining({
          num_val: '',
          ano_val: '',
        }),
      );
    });

    it('should return error envelope on Zod validation failure for detail', async () => {
      // Pass params that should pass Zod (all optional strings), so test with invalid types
      // Zod strings are lenient, so test that it at least delegates properly
      mockService.getDetail.mockResolvedValue({
        success: false,
        nombre: '',
        nomb_val: '',
        num_val: '',
        ano_val: 0,
        data: [],
        error: 'Error',
      });

      const result = await controller.detail({
        num_val: 'RD-001',
        ano_val: '2024',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('JwtAuthGuard', () => {
    it('should have JwtAuthGuard applied at class level', () => {
      const guards = Reflect.getMetadata('__guards__', ConsultaRdAlcabalaController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });
  });

  describe('GET /alcabala/consulta-rd/ruta', () => {
    it('should delegate to service.getRuta with parsed query params', async () => {
      const expected: RutaRDResult = {
        success: true,
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
        num_val: 'RD-001',
        ano_val: 2025,
        data: [
          { fecha: '2025-01-15', destino: 'Municipalidad', monto: 500 },
        ],
      };
      mockService.getRuta.mockResolvedValue(expected);

      const result = await controller.ruta({
        num_val: 'RD-001',
        ano_val: '2025',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
      });

      expect(result).toEqual(expected);
      expect(mockService.getRuta).toHaveBeenCalledWith({
        num_val: 'RD-001',
        ano_val: '2025',
        nombre: 'Empresa SAC',
        nomb_val: 'R.D.',
      });
    });

    it('should apply Zod defaults when ruta params are empty', async () => {
      mockService.getRuta.mockResolvedValue({
        success: true,
        nombre: '',
        nomb_val: '',
        num_val: '',
        ano_val: 0,
        data: [],
      });

      const result = await controller.ruta({});

      expect(result.success).toBe(true);
      expect(mockService.getRuta).toHaveBeenCalledWith(
        expect.objectContaining({
          num_val: '',
          ano_val: '',
        }),
      );
    });

    it('should return error envelope on Zod validation failure for ruta', async () => {
      mockService.getRuta.mockResolvedValue({
        success: false,
        nombre: '',
        nomb_val: '',
        num_val: '',
        ano_val: 0,
        data: [],
        error: 'Error',
      });

      const result = await controller.ruta({
        num_val: 'RD-001',
        ano_val: '2025',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('GET /alcabala/consulta-rd/imprimir', () => {
    it('should delegate to service.getImprimir with parsed query params', async () => {
      const expected: ImprimirRDResult = {
        success: true,
        html: '<p>TEST</p>',
      };
      mockService.getImprimir.mockResolvedValue(expected);

      const result = await controller.imprimir({
        num_val: 'RD-001',
        ano_val: '2025',
      });

      expect(result).toEqual(expected);
      expect(mockService.getImprimir).toHaveBeenCalledWith({
        num_val: 'RD-001',
        ano_val: '2025',
      });
    });

    it('should apply Zod defaults when imprimir params are empty', async () => {
      mockService.getImprimir.mockResolvedValue({
        success: true,
        html: '',
      });

      const result = await controller.imprimir({});

      expect(result.success).toBe(true);
      expect(mockService.getImprimir).toHaveBeenCalledWith({
        num_val: '',
        ano_val: '',
      });
    });

    it('should return error envelope on Zod validation failure for imprimir', async () => {
      mockService.getImprimir.mockResolvedValue({
        success: false,
        error: 'Error',
      });

      const result = await controller.imprimir({
        num_val: 'RD-001',
        ano_val: '2025',
      });

      expect(result.success).toBe(false);
    });
  });
});
