/// <reference types="jest" />

import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DeterminarAlcabalaController } from './determinar-alcabala.controller';
import { DeterminarAlcabalaService } from './determinar-alcabala.service';

describe('DeterminarAlcabalaController', () => {
  let controller: DeterminarAlcabalaController;
  let service: jest.Mocked<DeterminarAlcabalaService>;

  beforeEach(() => {
    service = {
      searchContribuyente: jest.fn(),
      searchPredios: jest.fn(),
      getAlcabalasByContribuyente: jest.fn(),
      crear: jest.fn(),
    } as any;
    controller = new DeterminarAlcabalaController(service);
  });

  describe('GET buscar-contribuyente', () => {
    it('should parse valid query and delegate to service', async () => {
      const mockResult = {
        success: true,
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      };
      service.searchContribuyente.mockResolvedValue(mockResult);

      const result = await controller.searchContribuyente({
        tipoBusqueda: 'C',
        busqueda: '12345',
        page: '1',
        pageSize: '15',
      });

      expect(service.searchContribuyente).toHaveBeenCalledWith({
        tipoBusqueda: 'C',
        busqueda: '12345',
        paterno: '',
        materno: '',
        nombres: '',
        page: 1,
        pageSize: 15,
      });
      expect(result).toEqual(mockResult);
    });

    it('should return error response for invalid tipoBusqueda', async () => {
      const result = await controller.searchContribuyente({
        tipoBusqueda: 'X',
        busqueda: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(service.searchContribuyente).not.toHaveBeenCalled();
    });

    it('should use default values when optional params missing', async () => {
      service.searchContribuyente.mockResolvedValue({
        success: true,
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      });

      const result = await controller.searchContribuyente({});

      expect(service.searchContribuyente).toHaveBeenCalledWith({
        tipoBusqueda: 'C',
        busqueda: '',
        paterno: '',
        materno: '',
        nombres: '',
        page: 1,
        pageSize: 15,
      });
      expect(result.success).toBe(true);
    });

    it('should pass Zod error message in error field', async () => {
      const result = await controller.searchContribuyente({
        tipoBusqueda: 'INVALID',
      });

      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
    });
  });

  describe('GET predios', () => {
    it('delegates valid query to service.searchPredios with parsed DTO', async () => {
      const mockResult = { success: true, data: [] };
      service.searchPredios.mockResolvedValue(mockResult);

      const result = await controller.searchPredios({
        codigo: '0279126',
        anio: '2026',
        codpred: 'P1',
      });

      expect(service.searchPredios).toHaveBeenCalledWith({
        codigo: '0279126',
        anio: '2026',
        tipoBusqueda: 'c',
        page: 1,
        pageSize: 15,
        codPred: 'P1',
      });
      expect(result).toEqual(mockResult);
    });

    it('returns error response for missing/invalid params', async () => {
      const result = await controller.searchPredios({ page: '0' });

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(typeof result.error).toBe('string');
      expect(service.searchPredios).not.toHaveBeenCalled();
    });

    it('returns error response when service throws', async () => {
      service.searchPredios.mockRejectedValue(new Error('SP error'));

      const result = await controller.searchPredios({ codigo: '0279126' });

      expect(result).toEqual({
        success: false,
        data: [],
        error: 'Parámetros inválidos',
      });
    });
  });

  describe('GET alcabalas/:codigo', () => {
    it('should delegate to service with codigo', async () => {
      const mockResult = {
        success: true,
        data: [],
      };
      service.getAlcabalasByContribuyente.mockResolvedValue(mockResult);

      const result = await controller.getAlcabalas('0012345');

      expect(service.getAlcabalasByContribuyente).toHaveBeenCalledWith('0012345');
      expect(result).toEqual(mockResult);
    });

    it('should return error when service fails', async () => {
      service.getAlcabalasByContribuyente.mockResolvedValue({
        success: false,
        data: [],
        error: 'SP error',
      });

      const result = await controller.getAlcabalas('0012345');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SP error');
    });
  });

  describe('POST crear', () => {
    const validBody = {
      codigoCompra: 'C001',
      nombres: 'JUAN CARLOS',
      numDoc: '12345678',
      codPred: 'P001',
      anioPred: '2026',
      montoAfecto: 100000,
      montoAlcabala: 3000,
    };

    it('should parse valid body, delegate to service with user/hostname, and return result', async () => {
      const mockResult = { success: true, idAlcabala: 42 };
      service.crear.mockResolvedValue(mockResult);

      const req = { user: { username: 'admin' } } as any;
      const result = await controller.crear(req, validBody);

      expect(service.crear).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when DTO validation fails', async () => {
      const req = { user: { username: 'admin' } } as any;

      await expect(
        controller.crear(req, { codigoCompra: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on Zod parse error with field messages', async () => {
      const req = { user: { username: 'admin' } } as any;
      const invalidBody = { codigoCompra: 'C001' }; // missing required fields

      await expect(
        controller.crear(req, invalidBody),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when service returns error', async () => {
      service.crear.mockResolvedValue({ success: false, error: 'SP error' });

      const req = { user: { username: 'admin' } } as any;

      await expect(
        controller.crear(req, validBody),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should extract usuario from req.user.username', async () => {
      service.crear.mockResolvedValue({ success: true, idAlcabala: 42 });

      const req = { user: { username: 'admin' } } as any;
      await controller.crear(req, validBody);

      expect(service.crear).toHaveBeenCalledWith(
        expect.anything(),
        'admin',
        expect.any(String),
      );
    });
  });
});