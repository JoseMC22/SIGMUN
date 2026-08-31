import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { z } from 'zod';
import { MantenimientoNotificadoresService } from './mantenimiento-notificadores.service';
import {
  GuardarNotificadorSchema,
  ActualizarNotificadorSchema,
  ActivarEliminarNotificadorSchema,
} from './dto/mantenimiento-notificadores.dto';
import { MantenimientoResult } from './mantenimiento-notificadores.types';

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
  async guardar(@Body() body: unknown): Promise<MantenimientoResult> {
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
    return this.service.guardar(dto);
  }

  @Post('actualizar')
  @HttpCode(HttpStatus.OK)
  async actualizar(@Body() body: unknown): Promise<MantenimientoResult> {
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
    return this.service.actualizar(dto);
  }

  @Post('activar-eliminar')
  @HttpCode(HttpStatus.OK)
  async activarEliminar(@Body() body: unknown): Promise<MantenimientoResult> {
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
    return this.service.activarEliminar(dto);
  }
}
