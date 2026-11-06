import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ReporteFraccDetalladoController } from './reporte-fracc-detallado.controller';
import { ReporteFraccDetalladoService } from './reporte-fracc-detallado.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  FraccDetalladoCatalogos,
  FraccDetalladoResult,
} from './reporte-fracc-detallado.types';

describe('ReporteFraccDetalladoController', () => {
  let controller: ReporteFraccDetalladoController;

  const mockService = {
    search: jest.fn(),
    getCatalogos: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReporteFraccDetalladoController],
      providers: [
        { provide: ReporteFraccDetalladoService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReporteFraccDetalladoController>(
      ReporteFraccDetalladoController,
    );
  });

  it('aplica JwtAuthGuard a todo el controller (auth requerida)', () => {
    const guards: unknown[] =
      Reflect.getMetadata(GUARDS_METADATA, ReporteFraccDetalladoController) ??
      [];
    expect(guards).toContain(JwtAuthGuard);
  });

  // ── POST /cobranza/reporte-fracc-detallado/search ───────────────────────

  describe('POST /cobranza/reporte-fracc-detallado/search', () => {
    const okResult: FraccDetalladoResult = {
      success: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 15,
      totalPages: 0,
    };

    it('delega en el service con el dto parseado (claves del SP)', async () => {
      mockService.search.mockResolvedValue(okResult);

      const result = await controller.search({
        page: 1,
        pageSize: 15,
        Codigo: '02002',
        Anno: '2026',
        IdMes: 8,
      });

      expect(mockService.search).toHaveBeenCalledWith({
        page: 1,
        pageSize: 15,
        Codigo: '02002',
        Anno: '2026',
        IdMes: 8,
      });
      expect(result).toEqual(okResult);
    });

    it('normaliza el Codigo ausente a "" antes de delegar', async () => {
      mockService.search.mockResolvedValue(okResult);

      await controller.search({ page: 1, pageSize: 15, Anno: '2026', IdMes: 8 });

      expect(mockService.search).toHaveBeenCalledWith({
        page: 1,
        pageSize: 15,
        Codigo: '',
        Anno: '2026',
        IdMes: 8,
      });
    });

    it('devuelve success:false sin throw cuando el body es invalido', async () => {
      const result = await controller.search({
        page: 1,
        pageSize: 15,
        Codigo: '12345678', // varchar(7): Zod lo rechaza
        Anno: '2026',
        IdMes: 8,
      });

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.error).toBeDefined();
      expect(mockService.search).not.toHaveBeenCalled();
    });

    it('rechaza Anno/IdMes ausentes sin llamar al SP', async () => {
      const result = await controller.search({ page: 1, pageSize: 15 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockService.search).not.toHaveBeenCalled();
    });
  });

  // ── POST /cobranza/reporte-fracc-detallado/catalogos ────────────────────

  describe('POST /cobranza/reporte-fracc-detallado/catalogos', () => {
    const okCatalogos: FraccDetalladoCatalogos = {
      success: true,
      anios: ['2026'],
      meses: [{ id_mes: 8, nom_mes: 'AGOSTO' }],
    };

    it('delega en el service con el Anno parseado', async () => {
      mockService.getCatalogos.mockResolvedValue(okCatalogos);

      const result = await controller.catalogos({ Anno: '2026' });

      expect(mockService.getCatalogos).toHaveBeenCalledWith({ Anno: '2026' });
      expect(result).toEqual(okCatalogos);
    });

    it('delega sin Anno (solo años)', async () => {
      mockService.getCatalogos.mockResolvedValue({
        success: true,
        anios: ['2026'],
        meses: [],
      });

      await controller.catalogos({});

      expect(mockService.getCatalogos).toHaveBeenCalledWith({
        Anno: undefined,
      });
    });

    it('devuelve success:false sin throw cuando el Anno es invalido', async () => {
      const result = await controller.catalogos({ Anno: '20' });

      expect(result.success).toBe(false);
      expect(result.anios).toEqual([]);
      expect(result.meses).toEqual([]);
      expect(result.error).toBeDefined();
      expect(mockService.getCatalogos).not.toHaveBeenCalled();
    });
  });
});
