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
      // Multipart requests: Guards run BEFORE multer (FileInterceptor), so
      // request.body is always empty at this point — body-parser does not
      // parse multipart/form-data. Fall back to an explicit header the client
      // can set (authFetch sends x-id-acceso for the subir-cargo upload).
      const headerAcceso = request.headers['x-id-acceso'];
      idAcceso =
        request.body?.id_acceso ??
        request.query?.id_acceso ??
        (typeof headerAcceso === 'string' ? headerAcceso : undefined);
    }

    if (!idAcceso) {
      // Log BEFORE throwing: the guard runs before the controller (and before
      // multer), so a rejection here is invisible in the backend logs otherwise.
      this.logger.warn(
        `[AccessGuard] id_acceso required for object ${idObjeto}; body fields: ${JSON.stringify(
          Object.keys(request.body ?? {}),
        )}`,
      );
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
