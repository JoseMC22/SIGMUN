import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MantenimientoIngresosService } from './mantenimiento-ingresos.service';
import {
  SearchMantenimientoIngresosSchema,
  SearchMantenimientoIngresosDto,
} from './dto/search-mantenimiento-ingresos.dto';
import {
  MantenimientoIngresoRow,
  PaginatedResponse,
} from './dto/mantenimiento-ingresos.types';

@Controller('tesoreria/mantenimiento-ingresos')
@UseGuards(JwtAuthGuard)
export class MantenimientoIngresosController {
  constructor(
    private readonly mantenimientoIngresosService: MantenimientoIngresosService,
  ) {}

  @Post('search')
  async search(
    @Body() dto: SearchMantenimientoIngresosDto,
  ): Promise<{ success: true } & PaginatedResponse<MantenimientoIngresoRow>> {
    let parsed: SearchMantenimientoIngresosDto;
    try {
      parsed = SearchMantenimientoIngresosSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({
          success: false,
          error: messages || 'Datos de entrada inválidos.',
        });
      }
      throw new BadRequestException({
        success: false,
        error: 'Datos de entrada inválidos.',
      });
    }
    const result = await this.mantenimientoIngresosService.search(parsed);
    return { success: true, ...result };
  }
}
