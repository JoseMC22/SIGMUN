import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should return the user when authentication succeeds', () => {
    const user = { sub: 'user-1', username: 'testuser' };
    expect(guard.handleRequest(null, user, null, {} as any)).toBe(user);
  });

  it('should throw standardized error for missing auth token', () => {
    expect(() =>
      guard.handleRequest(null, null, { name: 'NoAuthToken', message: 'No auth token' }, {} as any),
    ).toThrow(UnauthorizedException);

    try {
      guard.handleRequest(null, null, { name: 'NoAuthToken', message: 'No auth token' }, {} as any);
    } catch (error) {
      expect(error.getResponse()).toEqual({
        authenticated: false,
        errorCode: 'AUTH_SESSION_MISSING',
        message: 'No auth token',
      });
    }
  });

  it('should throw invalid session error for expired token', () => {
    expect(() =>
      guard.handleRequest(null, null, { name: 'TokenExpiredError', message: 'jwt expired' }, {} as any),
    ).toThrow(UnauthorizedException);

    try {
      guard.handleRequest(null, null, { name: 'TokenExpiredError', message: 'jwt expired' }, {} as any);
    } catch (error) {
      expect(error.getResponse()).toEqual({
        authenticated: false,
        errorCode: 'AUTH_SESSION_INVALID',
        message: 'jwt expired',
      });
    }
  });
});
