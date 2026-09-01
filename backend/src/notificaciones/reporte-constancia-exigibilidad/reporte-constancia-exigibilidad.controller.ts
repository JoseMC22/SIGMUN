import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteConstanciaExigibilidadService } from './reporte-constancia-exigibilidad.service';
import {
  SearchConstanciaExigibilidadSchema,
  SearchConstanciaExigibilidadDto,
} from './dto/search-constancia-exigibilidad.dto';
import {
  ConstanciaExigibilidadResult,
} from './reporte-constancia-exigibilidad.types';
import { z } from 'zod';

@Controller('notificaciones/reporte-constancia-exigibilidad')
@UseGuards(JwtAuthGuard)
export class ReporteConstanciaExigibilidadController {
  constructor(
    private readonly service: ReporteConstanciaExigibilidadService,
  ) {}

  /** Búsqueda del reporte (SP @opcion=5 con @codigo + @fdesde/@fhasta). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<ConstanciaExigibilidadResult> {
    let dto: SearchConstanciaExigibilidadDto;
    try {
      dto = SearchConstanciaExigibilidadSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: [],
          total: 0,
          error:
            error.issues.map((i) => i.message).join(', ') ||
            'Parámetros inválidos',
        };
      }
      return { success: false, data: [], total: 0, error: 'Parámetros inválidos' };
    }
    return this.service.search(dto);
  }
}
