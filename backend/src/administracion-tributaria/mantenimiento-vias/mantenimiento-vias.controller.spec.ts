import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MantenimientoViasController } from './mantenimiento-vias.controller';
import { MantenimientoViasService } from './mantenimiento-vias.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('MantenimientoViasController — Urbanizaciones CRUD', () => {
  let controller: MantenimientoViasController;
  let service: jest.Mocked<MantenimientoViasService>;

  const mockService = {
    search: jest.fn(),
    findOne: jest.fn(),
    getTiposVia: jest.fn(),
    getTiposUrbanizacion: jest.fn(),
    getUrbanizacionesTable: jest.fn(),
    searchUrbanizaciones: jest.fn(),
    getUrbanizaciones: jest.fn(),
    getZonas: jest.fn(),
    getAranceles: jest.fn(),
    getArancelDetalle: jest.fn(),
    saveArancel: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createUrbanizacion: jest.fn(),
    getUrbanizacion: jest.fn(),
    updateUrbanizacion: jest.fn(),
  };

  const mockRequest = {
    user: { username: 'jperez' },
    ip: '192.168.1.1',
    headers: { 'x-forwarded-for': '10.0.0.1' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MantenimientoViasController],
      providers: [
        { provide: MantenimientoViasService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MantenimientoViasController>(MantenimientoViasController);
    service = module.get(MantenimientoViasService);
  });

  // ── POST /mantenimiento-vias/urbanizaciones ───────────────

  describe('POST /mantenimiento-vias/urbanizaciones', () => {
    const validDto = {
      id_urba: 'U001',
      tipourb: 'RB',
      nombre: 'URBANIZACION TEST',
      nestado: '1',
      operador: '',
      estacion: '',
    };

    it('should create urbanización and return success message', async () => {
      mockService.createUrbanizacion.mockResolvedValue({
        message: 'Urbanización registrada correctamente',
      });

      const result = await controller.createUrbanizacion(validDto, mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'Urbanización registrada correctamente',
      });
      expect(mockService.createUrbanizacion).toHaveBeenCalledWith(
        expect.objectContaining({ id_urba: 'U001' }),
        'jperez',
        '10.0.0.1',
      );
    });

    it('should throw BadRequestException on invalid data (long id_urba)', async () => {
      const invalidDto = { ...validDto, id_urba: 'TOO_LONG', estacion: '' };

      await expect(
        controller.createUrbanizacion(invalidDto, mockRequest),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.createUrbanizacion).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when nestado exceeds max length', async () => {
      const invalidDto = {
        id_urba: 'U001',
        tipourb: 'RB',
        nombre: 'Test',
        nestado: '12', // max 1 character
        operador: '',
        estacion: '',
      };

      await expect(
        controller.createUrbanizacion(invalidDto, mockRequest),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.createUrbanizacion).not.toHaveBeenCalled();
    });
  });

  // ── GET /mantenimiento-vias/urbanizaciones/:id_urba ───────

  describe('GET /mantenimiento-vias/urbanizaciones/:id_urba', () => {
    const mockDetail = {
      id_urba: 'U001',
      tipourb: 'RB',
      nombre: 'URBANIZACION TEST',
      nestado: '1',
    };

    it('should return urbanización data for existing id_urba', async () => {
      mockService.getUrbanizacion.mockResolvedValue(mockDetail);

      const result = await controller.getUrbanizacion('U001');

      expect(result).toEqual({ success: true, data: mockDetail });
      expect(mockService.getUrbanizacion).toHaveBeenCalledWith('U001');
    });

    it('should propagate NotFoundException when urbanización does not exist', async () => {
      mockService.getUrbanizacion.mockRejectedValue(
        new NotFoundException('Urbanización con id "ZZZZ" no encontrada'),
      );

      await expect(controller.getUrbanizacion('ZZZZ')).rejects.toThrow(NotFoundException);
      expect(mockService.getUrbanizacion).toHaveBeenCalledWith('ZZZZ');
    });
  });

  // ── PUT /mantenimiento-vias/urbanizaciones/:id_urba ───────

  describe('PUT /mantenimiento-vias/urbanizaciones/:id_urba', () => {
    const validDto = {
      id_urba: 'U001',
      tipourb: 'RB',
      nombre: 'URBANIZACION ACTUALIZADA',
      nestado: '1',
      estacion: '',
    };

    it('should update urbanización and return success message', async () => {
      mockService.updateUrbanizacion.mockResolvedValue({
        message: 'Urbanización actualizada correctamente',
      });

      const result = await controller.updateUrbanizacion('U001', validDto, mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'Urbanización actualizada correctamente',
      });
      expect(mockService.updateUrbanizacion).toHaveBeenCalledWith(
        'U001',
        expect.objectContaining({ nombre: 'URBANIZACION ACTUALIZADA' }),
        'jperez',
        '10.0.0.1',
      );
    });

    it('should throw BadRequestException on invalid update data', async () => {
      const invalidDto = { ...validDto, id_urba: 'TOO_LONG', estacion: '' };

      await expect(
        controller.updateUrbanizacion('U001', invalidDto, mockRequest),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.updateUrbanizacion).not.toHaveBeenCalled();
    });
  });
});
