import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteIngresosCajeroService } from './reporte-ingresos-cajero.service';
import {
  SearchReporteIngresosCajeroSchema,
  SearchReporteIngresosCajeroDto,
} from './dto/search-reporte-ingresos-cajero.dto';
import { ReporteIngresosCajeroResponse } from './dto/reporte-ingresos-cajero.types';

@Controller('administracion-tributaria/reporte-ingresos-cajero')
@UseGuards(JwtAuthGuard)
export class ReporteIngresosCajeroController {
  constructor(
    private readonly reporteIngresosCajeroService: ReporteIngresosCajeroService,
  ) {}

  @Post('search')
  async search(
    @Body() dto: SearchReporteIngresosCajeroDto,
  ): Promise<{ success: true } & ReporteIngresosCajeroResponse> {
    let parsed: SearchReporteIngresosCajeroDto;
    try {
      parsed = SearchReporteIngresosCajeroSchema.parse(dto);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((i) => i.message).join(', ');
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

    const result = await this.reporteIngresosCajeroService.search(parsed);
    return {
      success: true,
      ...result,
    };
  }
}
