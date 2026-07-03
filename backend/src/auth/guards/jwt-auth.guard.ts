import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (err || !user) {
      let errorCode = 'AUTH_SESSION_MISSING';
      let message = 'Authentication required';

      if (info && typeof info === 'object' && 'message' in info) {
        message = (info as { message: string }).message;
      }
      if (info && typeof info === 'object' && 'name' in info) {
        const name = (info as { name: string }).name;
        if (name === 'TokenExpiredError') {
          errorCode = 'AUTH_SESSION_INVALID';
        }
      }

      throw new UnauthorizedException({
        authenticated: false,
        errorCode,
        message,
      });
    }

    return user;
  }
}
