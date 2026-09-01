import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import * as os from 'os';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CargosNotificacionesService } from './cargos-notificaciones.service';
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
  ValidarValorResult,
  GrabarCargoResult,
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
