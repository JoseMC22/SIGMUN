import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConstanciaExigibilidadService } from './constancia-exigibilidad.service';
import {
  EmitirConstanciaExigibilidadDto,
  EmitirConstanciaExigibilidadSchema,
} from './dto/emitir-constancia-exigibilidad.dto';
import {
  ImpresionConstanciaExigibilidadDto,
  ImpresionConstanciaExigibilidadSchema,
} from './dto/impresion-constancia-exigibilidad.dto';
import {
  ValidarConstanciaExigibilidadDto,
  ValidarConstanciaExigibilidadSchema,
} from './dto/validar-constancia-exigibilidad.dto';
import {
  EmitirConstanciaExigibilidadResult,
  ImpresionConstanciaExigibilidadResult,
  TipoValorComboResult,
  ValidarConstanciaExigibilidadResult,
} from './constancia-exigibilidad.types';

interface AuthRequest extends Request {
  user?: { username?: string; sub?: string };
}

@Controller('notificaciones/constancia-exigibilidad')
@UseGuards(JwtAuthGuard)
export class ConstanciaExigibilidadController {
  constructor(private readonly service: ConstanciaExigibilidadService) {}

  @Get('tipos-valor')
  async tiposValor(): Promise<TipoValorComboResult> {
    return this.service.listarTiposValor();
  }

  @Post('validar')
  @HttpCode(HttpStatus.OK)
  async validar(
    @Body() body: unknown,
  ): Promise<ValidarConstanciaExigibilidadResult> {
    let dto: ValidarConstanciaExigibilidadDto;
    try {
      dto = ValidarConstanciaExigibilidadSchema.parse(body);
    } catch (error) {
      return {
        success: false,
        data: [],
        total: 0,
        error: this.validationMessage(error),
      };
    }
    return this.service.validar(dto);
  }

  @Post('emitir')
  @HttpCode(HttpStatus.OK)
  async emitir(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<EmitirConstanciaExigibilidadResult> {
    let dto: EmitirConstanciaExigibilidadDto;
    try {
      dto = EmitirConstanciaExigibilidadSchema.parse(body);
    } catch (error) {
      return {
        success: false,
        data: [],
        total: 0,
        error: this.validationMessage(error),
      };
    }

    const operador = req.user?.username || req.user?.sub || '';
    return this.service.emitir(dto, operador);
  }

  @Post('impresion')
  @HttpCode(HttpStatus.OK)
  async impresion(
    @Body() body: unknown,
  ): Promise<ImpresionConstanciaExigibilidadResult> {
    let dto: ImpresionConstanciaExigibilidadDto;
    try {
      dto = ImpresionConstanciaExigibilidadSchema.parse(body);
    } catch (error) {
      return {
        success: false,
        data: [],
        total: 0,
        error: this.validationMessage(error),
      };
    }
    return this.service.impresion(dto);
  }

  private validationMessage(error: unknown): string {
    if (error instanceof z.ZodError) {
      return (
        error.issues.map((issue) => issue.message).join(', ') ||
        'Parámetros inválidos'
      );
    }
    return 'Parámetros inválidos';
  }
}
