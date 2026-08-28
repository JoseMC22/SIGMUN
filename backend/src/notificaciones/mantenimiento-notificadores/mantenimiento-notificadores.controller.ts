import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { z } from 'zod';
import { MantenimientoNotificadoresService } from './mantenimiento-notificadores.service';
import {
  GuardarNotificadorSchema,
  ActualizarNotificadorSchema,
  ActivarEliminarNotificadorSchema,
} from './dto/mantenimiento-notificadores.dto';
import { MantenimientoResult } from './mantenimiento-notificadores.types';
import * as os from 'os';

@Controller('notificaciones/mantenimiento-notificadores')
@UseGuards(JwtAuthGuard)
export class MantenimientoNotificadoresController {
  constructor(private readonly service: MantenimientoNotificadoresService) {}

  @Get()
  async listar(): Promise<MantenimientoResult> {
    return this.service.listar();
  }

  @Post('guardar')
  @HttpCode(HttpStatus.OK)
  async guardar(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<MantenimientoResult> {
    let dto: z.infer<typeof GuardarNotificadorSchema>;
    try {
      dto = GuardarNotificadorSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error:
            error.issues.map((i) => i.message).join(', ') ||
            'Parámetros inválidos',
        };
      }
      return { success: false, error: 'Parámetros inválidos' };
    }

    const operador = (req.user as any)?.username || '';
    const estacion = os.hostname();
    return this.service.guardar(dto, operador, estacion);
  }

  @Post('actualizar')
  @HttpCode(HttpStatus.OK)
  async actualizar(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<MantenimientoResult> {
    let dto: z.infer<typeof ActualizarNotificadorSchema>;
    try {
      dto = ActualizarNotificadorSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error:
            error.issues.map((i) => i.message).join(', ') ||
            'Parámetros inválidos',
        };
      }
      return { success: false, error: 'Parámetros inválidos' };
    }

    const operador = (req.user as any)?.username || '';
    const estacion = os.hostname();
    return this.service.actualizar(dto, operador, estacion);
  }

  @Post('activar-eliminar')
  @HttpCode(HttpStatus.OK)
  async activarEliminar(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<MantenimientoResult> {
    let dto: z.infer<typeof ActivarEliminarNotificadorSchema>;
    try {
      dto = ActivarEliminarNotificadorSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error:
            error.issues.map((i) => i.message).join(', ') ||
            'Parámetros inválidos',
        };
      }
      return { success: false, error: 'Parámetros inválidos' };
    }

    const operador = (req.user as any)?.username || '';
    const estacion = os.hostname();
    return this.service.activarEliminar(dto, operador, estacion);
  }
}
