import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteCargosService } from './reporte-cargos.service';
import {
  SearchReporteCargosSchema,
  SearchReporteCargosDto,
} from './dto/search-reporte-cargos.dto';
import {
  ReporteCargosResult,
  TipoValorResult,
} from './reporte-cargos.types';
import { z } from 'zod';

@Controller('notificaciones/reporte-cargos')
@UseGuards(JwtAuthGuard)
export class ReporteCargosController {
  constructor(private readonly service: ReporteCargosService) {}

  /** Combo de Tipos de Valor (Contenedor.TblTipo_valor, año en curso). */
  @Get('tipos-valor')
  async tiposValor(): Promise<TipoValorResult> {
    return this.service.listarTiposValor();
  }

  /** Búsqueda del reporte: modo tipo_valor (@busc=15) o rango de fechas (@busc=7). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<ReporteCargosResult> {
    let dto: SearchReporteCargosDto;
    try {
      dto = SearchReporteCargosSchema.parse(body);
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
