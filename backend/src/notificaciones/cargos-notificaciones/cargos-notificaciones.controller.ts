import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import * as os from 'os';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccessGuard } from '../../seguridad/object-access/access-guard.decorator';
import {
  CargosNotificacionesService,
  NAS_UPLOAD_MAX_BYTES,
} from './cargos-notificaciones.service';
import {
  ValidarValorSchema,
  ValidarValorDto,
} from './dto/validar-valor.dto';
import {
  GrabarCargoSchema,
  GrabarCargoDto,
} from './dto/grabar-cargo.dto';
import {
  TipoValorComboResult,
  NotificadoresComboResult,
  ParentescosComboResult,
  ValidarValorResult,
  TributosResult,
  GrabarCargoResult,
  SubirCargoResult,
  NasUploadFile,
} from './cargos-notificaciones.types';
import { z } from 'zod';

interface AuthRequest extends Request {
  user?: { username?: string; sub?: string };
}

@Controller('notificaciones/cargos-notificaciones')
@UseGuards(JwtAuthGuard)
export class CargosNotificacionesController {
  constructor(private readonly service: CargosNotificacionesService) {}

  /** Combo de Tipos de Valor (Contenedor.TblTipo_valor, año en curso). */
  @Get('tipos-valor')
  async tiposValor(): Promise<TipoValorComboResult> {
    return this.service.listarTiposValor();
  }

  /** Combo de Notificadores (SP maestro @busc=11). */
  @Get('notificadores')
  async notificadores(): Promise<NotificadoresComboResult> {
    return this.service.listarNotificadores();
  }

  /** Combo de Parentescos (rentas.rc_tipo_relacion, estado activo). */
  @Get('parentescos')
  async parentescos(): Promise<ParentescosComboResult> {
    return this.service.listarParentescos();
  }

  /** Valida un valor tributario (SP [Rentas].[ssp_mvalores] @msquery=9). */
  @Post('validar')
  @HttpCode(HttpStatus.OK)
  async validar(@Body() body: unknown): Promise<ValidarValorResult> {
    let dto: ValidarValorDto;
    try {
      dto = ValidarValorSchema.parse(body);
    } catch (error) {
      return this.validationError<ValidarValorResult>(
        error,
        { success: false, data: [], error: 'Parámetros inválidos' },
      );
    }
    return this.service.validarValor(dto);
  }

  /** Tabla de tributos del valor (SP [Rentas].[ssp_dvalores] @msquery=4). */
  @Post('tributos')
  @HttpCode(HttpStatus.OK)
  async tributos(@Body() body: unknown): Promise<TributosResult> {
    let dto: ValidarValorDto;
    try {
      dto = ValidarValorSchema.parse(body);
    } catch (error) {
      return this.validationError<TributosResult>(
        error,
        { success: false, data: [], error: 'Parámetros inválidos' },
      );
    }
    return this.service.listarTributos(dto);
  }

  /** Detalle del cargo ya registrado para un valor (SP @busc=10). */
  @Post('detalle')
  @HttpCode(HttpStatus.OK)
  async detalle(@Body() body: unknown): Promise<ValidarValorResult> {
    let dto: ValidarValorDto;
    try {
      dto = ValidarValorSchema.parse(body);
    } catch (error) {
      return this.validationError<ValidarValorResult>(
        error,
        { success: false, data: [], error: 'Parámetros inválidos' },
      );
    }
    return this.service.detalleCargo(dto);
  }

  /** Registra un cargo de notificación (SP @busc=2). */
  @Post('grabar')
  @HttpCode(HttpStatus.OK)
  async grabar(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<GrabarCargoResult> {
    let dto: GrabarCargoDto;
    try {
      dto = GrabarCargoSchema.parse(body);
    } catch (error) {
      return this.validationError<GrabarCargoResult>(
        error,
        { success: false, error: 'Parámetros inválidos' },
      );
    }
    const operador = req.user?.username || req.user?.sub || '';
    const estacion = os.hostname();
    return this.service.grabarCargo(dto, operador, estacion);
  }

  /** Sube el archivo del cargo al NAS y persiste ruta1/imagen1 (SP @busc=6). */
  @Post('subir-cargo')
  @AccessGuard('btnSubirCargo')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: NAS_UPLOAD_MAX_BYTES, files: 1 },
    }),
  )
  async subirCargo(
    @UploadedFile() file: NasUploadFile | undefined,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<SubirCargoResult> {
    const raw =
      body && typeof body === 'object'
        ? (body as Record<string, unknown>).cargo
        : undefined;
    let dto: GrabarCargoDto;
    try {
      dto = GrabarCargoSchema.parse(
        typeof raw === 'string' ? JSON.parse(raw) : {},
      );
    } catch (error) {
      return this.validationError<SubirCargoResult>(
        error,
        { success: false, error: 'Parámetros inválidos' },
      );
    }
    const operador = req.user?.username || req.user?.sub || '';
    const estacion = os.hostname();
    return this.service.subirCargoNotificacion(file, dto, operador, estacion);
  }

  /** Builds a validation-error envelope for Zod errors, mirroring siblings. */
  private validationError<T>(error: unknown, fallback: T): T {
    if (error instanceof z.ZodError) {
      return {
        ...fallback,
        error:
          error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
      } as T;
    }
    return fallback;
  }
}
