import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteIngresosGerenciaService } from './reporte-ingresos-gerencia.service';
import {
  SearchReporteIngresosGerenciaSchema,
  SearchReporteIngresosGerenciaDto,
} from './dto/search-reporte-ingresos-gerencia.dto';
import {
  AreaOption,
  ReporteIngresosGerenciaResponse,
} from './dto/reporte-ingresos-gerencia.types';

@Controller('administracion-tributaria/reporte-ingresos-gerencia')
@UseGuards(JwtAuthGuard)
export class ReporteIngresosGerenciaController {
  constructor(
    private readonly reporteIngresosGerenciaService: ReporteIngresosGerenciaService,
  ) {}

  @Get('combos/areas')
  async getAreas(): Promise<{ success: true; data: AreaOption[] }> {
    const data = await this.reporteIngresosGerenciaService.getAreas();
    return { success: true, data };
  }

  @Get('combos/cajas')
  async getCajas(): Promise<{ success: true; data: AreaOption[] }> {
    const data = await this.reporteIngresosGerenciaService.getCajas();
    return { success: true, data };
  }


  @Post('search')
  async search(
    @Body() dto: SearchReporteIngresosGerenciaDto,
  ): Promise<{ success: true } & ReporteIngresosGerenciaResponse> {
    let parsed: SearchReporteIngresosGerenciaDto;
    try {
      parsed = SearchReporteIngresosGerenciaSchema.parse(dto);
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

    const result = await this.reporteIngresosGerenciaService.search(parsed);
    return {
      success: true,
      ...result,
    };
  }
}
