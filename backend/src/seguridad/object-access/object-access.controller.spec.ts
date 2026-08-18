/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { ObjectAccessController } from './object-access.controller';
import { ObjectAccessService } from './object-access.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InternalServerErrorException } from '@nestjs/common';

describe('ObjectAccessController', () => {
  let controller: ObjectAccessController;
  let service: jest.Mocked<ObjectAccessService>;

  const mockService = {
    getPermissions: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObjectAccessController],
      providers: [{ provide: ObjectAccessService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ObjectAccessController>(ObjectAccessController);
    service = module.get(ObjectAccessService);
  });

  describe('GET /seguridad/object-access/:id_acceso', () => {
    it('should return 200 with permissions for authenticated user', async () => {
      const mockPermissions = [
        { id_objeto: 'btnGuardar', bacceso: 1 as const },
        { id_objeto: 'btnEliminar', bacceso: 0 as const },
      ];
      mockService.getPermissions.mockResolvedValue(mockPermissions);

      const result = await controller.getPermissions(42, {
        user: { username: 'testuser' },
      } as any);

      expect(result).toEqual({
        id_acceso: 42,
        objects: mockPermissions,
      });
      expect(mockService.getPermissions).toHaveBeenCalledWith('testuser', 42);
    });

    it('should return empty array when SP returns no rows', async () => {
      mockService.getPermissions.mockResolvedValue([]);

      const result = await controller.getPermissions(42, {
        user: { username: 'testuser' },
      } as any);

      expect(result).toEqual({ id_acceso: 42, objects: [] });
    });

    it('should propagate InternalServerErrorException from service', async () => {
      mockService.getPermissions.mockRejectedValue(
        new InternalServerErrorException('Failed to fetch object permissions'),
      );

      await expect(
        controller.getPermissions(42, { user: { username: 'testuser' } } as any),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
