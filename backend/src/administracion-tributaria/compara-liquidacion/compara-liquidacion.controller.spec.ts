import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ComparaLiquidacionController } from './compara-liquidacion.controller';
import { ComparaLiquidacionService } from './compara-liquidacion.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  LiquidacionCabecera,
  LiquidacionDetalle,
} from './dto/compara-liquidacion.types';

describe('ComparaLiquidacionController', () => {
  let controller: ComparaLiquidacionController;
  let service: jest.Mocked<ComparaLiquidacionService>;

  const mockService = {
    buscarLiquidacion: jest.fn(),
  };

  const cabecera: LiquidacionCabecera = {
    idLiquidacion: 1108398,
    numero: '26-00000001',
    codigo: '0263958',
    monto: 1557.96,
    observacion: '0263958%*2025*...',
    estado: '1',
    usuario: 'MVAEZ',
    terminal: 'INFOSAT01',
    fregistro: '2026-01-05T07:30:25.527Z',
    fvencimiento: '2026-01-05T00:00:00.000Z',
    observacion2: '...',
  };

  const detalle: LiquidacionDetalle[] = [
    {
      secuencia: 1,
      tipo: '02.01',
      tipoRec: '02.01',
      anno: '2025',
      periodo: '02',
      impInsol: 500.07,
      impMora: 32.85,
      costoEmi: 0,
      total: 532.92,
      nombre: 'CHAVEZ CASTRO JHONY ESTEBAN Y ESPOSA',
      femision: 'MVAEZ - Ene  5 2026  7:30AM',
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComparaLiquidacionController],
      providers: [{ provide: ComparaLiquidacionService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ComparaLiquidacionController>(
      ComparaLiquidacionController,
    );
    service = module.get(ComparaLiquidacionService);
  });

  // ── POST /administracion-tributaria/compara-liquidacion/buscar ────────

  describe('POST /administracion-tributaria/compara-liquidacion/buscar', () => {
    it('should return the comparativo with a success flag', async () => {
      mockService.buscarLiquidacion.mockResolvedValue({ cabecera, detalle });

      const result = await controller.buscar({ numero: '26-00000001' });

      expect(result).toEqual({ success: true, cabecera, detalle });
      expect(mockService.buscarLiquidacion).toHaveBeenCalledWith('26-00000001');
    });

    it('should trim the incoming numero before calling the service', async () => {
      mockService.buscarLiquidacion.mockResolvedValue({
        cabecera: null,
        detalle: [],
      });

      await controller.buscar({ numero: '  26-00000001  ' });

      expect(mockService.buscarLiquidacion).toHaveBeenCalledWith('26-00000001');
    });

    it('should throw BadRequestException when numero has an invalid format', async () => {
      await expect(controller.buscar({ numero: '26-123' })).rejects.toThrow(
        BadRequestException,
      );

      expect(mockService.buscarLiquidacion).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when numero is missing', async () => {
      await expect(
        controller.buscar({} as unknown as { numero: string }),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.buscarLiquidacion).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when numero is not a string', async () => {
      await expect(
        controller.buscar({ numero: 123 } as unknown as { numero: string }),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.buscarLiquidacion).not.toHaveBeenCalled();
    });
  });
});
