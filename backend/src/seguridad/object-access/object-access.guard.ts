import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ObjectAccessService } from './object-access.service';

export const ACCESS_GUARD_OBJETO = 'access_guard_objeto';
export const ACCESS_GUARD_ACCESO = 'access_guard_acceso';

@Injectable()
export class ObjectAccessGuard implements CanActivate {
  private readonly logger = new Logger(ObjectAccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly objectAccessService: ObjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const username: string = request.user?.username ?? request.user?.sub;

    const idObjeto = this.reflector.getAllAndOverride<string>(
      ACCESS_GUARD_OBJETO,
      [context.getHandler(), context.getClass()],
    );

    if (!idObjeto) {
      return true;
    }

    let idAcceso = this.reflector.getAllAndOverride<string>(
      ACCESS_GUARD_ACCESO,
      [context.getHandler(), context.getClass()],
    );

    if (!idAcceso) {
      idAcceso = request.body?.id_acceso ?? request.query?.id_acceso;
    }

    if (!idAcceso) {
      throw new BadRequestException('id_acceso required');
    }

    const bacceso = await this.objectAccessService.checkObjectAccess(
      username,
      idObjeto,
      idAcceso,
    );

    if (bacceso === 0) {
      throw new ForbiddenException({
        statusCode: 403,
        message: `Access denied for object: ${idObjeto}`,
        error: 'Forbidden',
      });
    }

    return true;
  }
}
