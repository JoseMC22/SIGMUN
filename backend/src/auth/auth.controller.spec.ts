import { BadRequestException, UnauthorizedException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      logout: jest.fn(),
    };

    authController = new AuthController(authService as AuthService);
  });

  it('should set access_token cookie and return stable login response', async () => {
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    const authResponse = {
      authenticated: true,
      userId: 'user-1',
      email: 'test@example.com',
      sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      message: 'Inicio de sesión exitoso.',
    };

    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: 'token-123',
      response: authResponse,
    });

    const result = await authController.login(
      { email: 'test@example.com', password: 'secret' },
      response,
    );

    expect(result).toEqual(authResponse);
    expect(response.cookie).toHaveBeenCalledWith(
      'SIGMUN_AUTH',
      'token-123',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60 * 1000,
      }),
    );
  });

  it('should return BadRequestException for invalid login payload', async () => {
    const response = {
      cookie: jest.fn(),
    } as unknown as Response;

    await expect(
      authController.login({ email: 'not-an-email', password: '' }, response),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject invalid credentials with UnauthorizedException', async () => {
    const response = {
      cookie: jest.fn(),
    } as unknown as Response;

    (authService.login as jest.Mock).mockRejectedValue(
      new UnauthorizedException('Usuario o contraseña incorrectos.'),
    );

    await expect(
      authController.login({ email: 'test@example.com', password: 'wrong' }, response),
    ).rejects.toMatchObject({
      getStatus: expect.any(Function),
      getResponse: expect.any(Function),
    });

    try {
      await authController.login({ email: 'test@example.com', password: 'wrong' }, response);
    } catch (error: any) {
      expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(error.getResponse()).toEqual({
        authenticated: false,
        errorCode: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }
  });

  it('should create a secure cookie in production mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    const authResponse = {
      authenticated: true,
      userId: 'user-1',
      email: 'test@example.com',
      sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      message: 'Inicio de sesión exitoso.',
    };

    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: 'token-123',
      response: authResponse,
    });

    const result = await authController.login(
      { email: 'test@example.com', password: 'secret' },
      response,
    );

    expect(result).toEqual(authResponse);
    expect(response.cookie).toHaveBeenCalledWith(
      'SIGMUN_AUTH',
      'token-123',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60 * 1000,
      }),
    );

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should return session payload when authenticated', async () => {
    const result = await authController.session({
      user: { sub: 'user-1', name: 'Test User', roles: ['admin'] },
    } as any);

    expect(result).toEqual({
      authenticated: true,
      user: {
        id: 'user-1',
        name: 'Test User',
        roles: ['admin'],
      },
    });
  });

  it('should clear cookie and call logout service', async () => {
    const response = {
      clearCookie: jest.fn(),
    } as unknown as Response;

    await authController.logout(
      { user: { sub: 'user-1', username: 'testuser' } } as any,
      response,
    );

    expect(authService.logout).toHaveBeenCalledWith('user-1', 'testuser');
    expect(response.clearCookie).toHaveBeenCalledWith(
      'SIGMUN_AUTH',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      }),
    );
  });
});
