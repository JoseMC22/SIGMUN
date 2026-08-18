/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { ObjectAccessController } from './object-access.controller';
import { ObjectAccessService } from './object-access.service';
import { ObjectAccessSubscriber } from './object-access.subscriber';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InternalServerErrorException } from '@nestjs/common';
import { of } from 'rxjs';

describe('ObjectAccessController', () => {
  let controller: ObjectAccessController;
  let service: jest.Mocked<ObjectAccessService>;
  let subscriber: jest.Mocked<ObjectAccessSubscriber>;

  const mockService = {
    getPermissions: jest.fn(),
    invalidateAndNotify: jest.fn(),
  };

  const mockSubscriber = {
    getObservable: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObjectAccessController],
      providers: [
        { provide: ObjectAccessService, useValue: mockService },
        { provide: ObjectAccessSubscriber, useValue: mockSubscriber },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ObjectAccessController>(ObjectAccessController);
    service = module.get(ObjectAccessService);
    subscriber = module.get(ObjectAccessSubscriber);
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

  describe('GET /seguridad/object-access/events (SSE)', () => {
    it('should return an Observable from the subscriber', () => {
      const mockObs = of({ type: 'access:invalidated', data: { id_acceso: 42 } });
      mockSubscriber.getObservable.mockReturnValue(mockObs);

      const result = controller.events({ user: { username: 'testuser' } } as any);

      expect(mockSubscriber.getObservable).toHaveBeenCalledWith('testuser');
      expect(result).toBe(mockObs);
    });

    it('should extract username from JWT payload (req.user.sub fallback)', () => {
      const mockObs = of({ type: 'access:invalidated', data: { id_acceso: 42 } });
      mockSubscriber.getObservable.mockReturnValue(mockObs);

      controller.events({ user: { sub: 'fallbackUser' } } as any);

      expect(mockSubscriber.getObservable).toHaveBeenCalledWith('fallbackUser');
    });
  });

  describe('POST /seguridad/object-access/invalidate', () => {
    it('should call service.invalidateAndNotify with correct params', async () => {
      mockService.invalidateAndNotify.mockResolvedValue(undefined);

      await controller.invalidate({
        id_acceso: 42,
        usernames: ['alice', 'bob'],
      });

      expect(mockService.invalidateAndNotify).toHaveBeenCalledWith(42, [
        'alice',
        'bob',
      ]);
    });

    it('should return success message', async () => {
      mockService.invalidateAndNotify.mockResolvedValue(undefined);

      const result = await controller.invalidate({
        id_acceso: 42,
        usernames: ['alice'],
      });

      expect(result).toEqual({ success: true });
    });

    it('should propagate errors from service', async () => {
      mockService.invalidateAndNotify.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      await expect(
        controller.invalidate({ id_acceso: 42, usernames: ['alice'] }),
      ).rejects.toThrow('Redis connection failed');
    });
  });
});
