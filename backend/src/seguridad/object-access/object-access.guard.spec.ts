/// <reference types="jest" />

import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ObjectAccessGuard,
  ACCESS_GUARD_OBJETO,
  ACCESS_GUARD_ACCESO,
} from './object-access.guard';
function createMockContext(overrides: {
  user?: Record<string, any>;
  body?: Record<string, any>;
  query?: Record<string, any>;
  handlerMetadata?: Record<string, any>;
  classMetadata?: Record<string, any>;
} = {}): ExecutionContext {
  const request = {
    user: overrides.user ?? { username: 'testuser' },
    body: overrides.body ?? {},
    query: overrides.query ?? {},
  };

  const handlerMetadata = overrides.handlerMetadata ?? {};
  const classMetadata = overrides.classMetadata ?? {};

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => handlerMetadata,
    getClass: () => classMetadata,
  } as unknown as ExecutionContext;
}

describe('ObjectAccessGuard', () => {
  let guard: ObjectAccessGuard;
  let reflector: jest.Mocked<Reflector>;
  let service: { checkObjectAccess: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    service = {
      checkObjectAccess: jest.fn(),
    };
    guard = new ObjectAccessGuard(reflector as any, service as any);
  });

  describe('cache hit — bacceso=1 proceeds', () => {
    it('should return true when object access is granted', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')  // id_objeto
        .mockReturnValueOnce(undefined);    // id_acceso (not in decorator)
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(1);

      const ctx = createMockContext({
        body: { id_acceso: 42 },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(service.checkObjectAccess).toHaveBeenCalledWith(
        'testuser',
        'btnGuardar',
        42,
      );
    });
  });

  describe('cache hit — bacceso=0 returns 403', () => {
    it('should throw ForbiddenException when object access is denied', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnEliminar')
        .mockReturnValueOnce(undefined);
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(0);

      const ctx = createMockContext({
        body: { id_acceso: 42 },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        ForbiddenException,
      );

      expect(service.checkObjectAccess).toHaveBeenCalledWith(
        'testuser',
        'btnEliminar',
        42,
      );
    });

    it('should throw with correct 403 response shape', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnEliminar')
        .mockReturnValueOnce(undefined);
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(0);

      const ctx = createMockContext({
        body: { id_acceso: 42 },
      });

      try {
        await guard.canActivate(ctx);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error.getStatus()).toBe(403);
        expect(error.getResponse()).toEqual({
          statusCode: 403,
          message: 'Access denied for object: btnEliminar',
          error: 'Forbidden',
        });
      }
    });
  });

  describe('cache miss triggers SP fallback', () => {
    it('should call service.checkObjectAccess which handles SP fallback', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')
        .mockReturnValueOnce(42);  // id_acceso from decorator
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(1);

      const ctx = createMockContext();

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(service.checkObjectAccess).toHaveBeenCalledWith(
        'testuser',
        'btnGuardar',
        42,
      );
    });

    it('should deny access after SP returns bacceso=0', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnCerrar')
        .mockReturnValueOnce(55);
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(0);

      const ctx = createMockContext();

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('no id_acceso returns 400', () => {
    it('should throw BadRequestException when id_acceso cannot be resolved', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')
        .mockReturnValueOnce(undefined);  // no id_acceso from decorator

      const ctx = createMockContext({
        body: {},   // no id_acceso in body
        query: {},  // no id_acceso in query
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        BadRequestException,
      );

      expect(service.checkObjectAccess).not.toHaveBeenCalled();
    });

    it('should throw with id_acceso required message', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')
        .mockReturnValueOnce(undefined);

      const ctx = createMockContext({
        body: {},
        query: {},
      });

      try {
        await guard.canActivate(ctx);
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error.getStatus()).toBe(400);
        expect(error.getResponse()).toEqual({
          statusCode: 400,
          message: 'id_acceso required',
          error: 'Bad Request',
        });
      }
    });
  });

  describe('id_acceso resolution', () => {
    it('should prefer decorator id_acceso over request body', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')
        .mockReturnValueOnce(99);  // decorator id_acceso
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(1);

      const ctx = createMockContext({
        body: { id_acceso: 42 },  // should be ignored
      });

      await guard.canActivate(ctx);

      expect(service.checkObjectAccess).toHaveBeenCalledWith(
        'testuser',
        'btnGuardar',
        99,
      );
    });

    it('should fall back to request body id_acceso when decorator has none', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')
        .mockReturnValueOnce(undefined);
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(1);

      const ctx = createMockContext({
        body: { id_acceso: 42 },
      });

      await guard.canActivate(ctx);

      expect(service.checkObjectAccess).toHaveBeenCalledWith(
        'testuser',
        'btnGuardar',
        42,
      );
    });

    it('should fall back to request query id_acceso', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')
        .mockReturnValueOnce(undefined);
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(1);

      const ctx = createMockContext({
        body: {},
        query: { id_acceso: 77 },
      });

      await guard.canActivate(ctx);

      expect(service.checkObjectAccess).toHaveBeenCalledWith(
        'testuser',
        'btnGuardar',
        77,
      );
    });
  });

  describe('no id_objeto metadata — pass through', () => {
    it('should return true when no id_objeto metadata is set', async () => {
      reflector.getAllAndOverride.mockReturnValueOnce(undefined);

      const ctx = createMockContext();

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(service.checkObjectAccess).not.toHaveBeenCalled();
    });
  });

  describe('username extraction', () => {
    it('should use req.user.username', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')
        .mockReturnValueOnce(42);
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(1);

      const ctx = createMockContext({
        user: { username: 'alice' },
        body: { id_acceso: 42 },
      });

      await guard.canActivate(ctx);

      expect(service.checkObjectAccess).toHaveBeenCalledWith(
        'alice',
        'btnGuardar',
        42,
      );
    });

    it('should fall back to req.user.sub when username is absent', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce('btnGuardar')
        .mockReturnValueOnce(42);
      (service.checkObjectAccess as jest.Mock).mockResolvedValue(1);

      const ctx = createMockContext({
        user: { sub: 'fallbackUser' },
        body: { id_acceso: 42 },
      });

      await guard.canActivate(ctx);

      expect(service.checkObjectAccess).toHaveBeenCalledWith(
        'fallbackUser',
        'btnGuardar',
        42,
      );
    });
  });
});
