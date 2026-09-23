/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrediosInconsistenciaController } from './predios-inconsistencia.controller';
import { PrediosInconsistenciaService } from './predios-inconsistencia.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PaginatedResponse,
  PredioInconsistenciaRow,
  TipoInconsistenciaOption,
  UsoPredioOption,
} from './predios-inconsistencia.types';

describe('PrediosInconsistenciaController', () => {
  let controller: PrediosInconsistenciaController;

  const mockService = {
    search: jest.fn(),
    getTiposInconsistencia: jest.fn(),
    getUsosPredio: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrediosInconsistenciaController],
      providers: [
        { provide: PrediosInconsistenciaService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PrediosInconsistenciaController>(
      PrediosInconsistenciaController,
    );
  });

  // ── POST /inconsistencia/predios/search ──────────────

  describe('POST search', () => {
    it('delegates to service.search with the parsed DTO and applies defaults', async () => {
      const expected: PaginatedResponse<PredioInconsistenciaRow> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        idAcceso: '30.01.01',
        anno: '2026',
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith({
        idAcceso: '30.01.01',
        anno: 2026,
        page: 1,
        pageSize: 10,
      });
    });

    it('rejects page: 0 with BadRequestException and does not call the service', async () => {
      await expect(
        controller.search({ idAcceso: '30.01.01', anno: 2026, page: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockService.search).not.toHaveBeenCalled();
    });

    it('rejects a non-numeric anno with BadRequestException', async () => {
      await expect(
        controller.search({ idAcceso: '30.01.01', anno: 'no-es-un-anio' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockService.search).not.toHaveBeenCalled();
    });

    it('rejects pageSize above 100000 with BadRequestException', async () => {
      await expect(
        controller.search({ idAcceso: '30.01.01', anno: 2026, pageSize: 100001 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockService.search).not.toHaveBeenCalled();
    });

    it('rejects pageSize 20 with BadRequestException (explicit mode selector: only 10 or 100000)', async () => {
      await expect(
        controller.search({ idAcceso: '30.01.01', anno: 2026, pageSize: 20 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockService.search).not.toHaveBeenCalled();
    });

    it('accepts pageSize 100000 (export re-query) and delegates to the service', async () => {
      const expected: PaginatedResponse<PredioInconsistenciaRow> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 100000,
        totalPages: 0,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        idAcceso: '30.01.01',
        anno: 2026,
        pageSize: 100000,
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith({
        idAcceso: '30.01.01',
        anno: 2026,
        page: 1,
        pageSize: 100000,
      });
    });

    it('accepts anno 2100 (upper bound inclusive) and delegates to the service', async () => {
      const expected: PaginatedResponse<PredioInconsistenciaRow> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };
      mockService.search.mockResolvedValue(expected);

      const result = await controller.search({
        idAcceso: '30.01.01',
        anno: 2100,
      });

      expect(result).toEqual(expected);
      expect(mockService.search).toHaveBeenCalledWith({
        idAcceso: '30.01.01',
        anno: 2100,
        page: 1,
        pageSize: 10,
      });
    });

    it('rejects anno above 2100 with BadRequestException', async () => {
      await expect(
        controller.search({ idAcceso: '30.01.01', anno: 2101 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockService.search).not.toHaveBeenCalled();
    });

    it('rejects an anno beyond the mssql int range with 400 validation_error (not a 500)', async () => {
      await expect(
        controller.search({ idAcceso: '30.01.01', anno: 9999999999 }),
      ).rejects.toMatchObject({
        response: {
          code: 'validation_error',
          message: 'Validation failed',
        },
      });

      expect(mockService.search).not.toHaveBeenCalled();
    });

    it('returns the canonical validation_error envelope on invalid input', async () => {
      await expect(
        controller.search({ idAcceso: '', anno: 2026 }),
      ).rejects.toMatchObject({
        response: {
          code: 'validation_error',
          message: 'Validation failed',
        },
      });
    });

    it('propagates the BadRequestException thrown by the service', async () => {
      mockService.search.mockRejectedValue(
        new BadRequestException({
          code: 'validation_error',
          message: 'Validation failed',
        }),
      );

      await expect(
        controller.search({ idAcceso: '30.01.99', anno: 2026 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ── GET /inconsistencia/predios/combos/tipos ─────────

  describe('GET combos/tipos', () => {
    it('returns { success: true, data } from the service', async () => {
      const data: TipoInconsistenciaOption[] = [
        { id_acceso: '30.01.01', nombre: 'OMISION DE PREDIO' },
      ];
      mockService.getTiposInconsistencia.mockResolvedValue(data);

      await expect(controller.getTipos()).resolves.toEqual({
        success: true,
        data,
      });
    });
  });

  // ── GET /inconsistencia/predios/combos/usos ──────────

  describe('GET combos/usos', () => {
    it('returns { success: true, data } from the service', async () => {
      const data: UsoPredioOption[] = [{ id_uso: '1', uso: 'CASA' }];
      mockService.getUsosPredio.mockResolvedValue(data);

      await expect(controller.getUsos()).resolves.toEqual({
        success: true,
        data,
      });
    });
  });

  // ── Guard ────────────────────────────────────────────

  describe('JwtAuthGuard', () => {
    it('is applied at class level', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        PrediosInconsistenciaController,
      );
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });
  });
});
