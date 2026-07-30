/// <reference types="jest" />

import { DeterminarAlcabalaController } from './determinar-alcabala.controller';
import { DeterminarAlcabalaService } from './determinar-alcabala.service';

describe('DeterminarAlcabalaController', () => {
  let controller: DeterminarAlcabalaController;
  let service: jest.Mocked<DeterminarAlcabalaService>;

  beforeEach(() => {
    service = {
      searchContribuyente: jest.fn(),
      getAlcabalasByContribuyente: jest.fn(),
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
});