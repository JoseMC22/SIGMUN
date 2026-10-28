import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteInafectosService } from './reporte-inafectos.service';
import {
  SearchReporteInafectosSchema,
  SearchReporteInafectosDto,
} from './dto/search-reporte-inafectos.dto';
import {
  ReporteInafectosRow,
  AnnoOption,
  UsoOption,
  PaginatedResponse,
} from './dto/reporte-inafectos.types';

@Controller('administracion-tributaria/reporte-inafectos')
@UseGuards(JwtAuthGuard)
export class ReporteInafectosController {
  constructor(
    private readonly reporteInafectosService: ReporteInafectosService,
  ) {}

  @Get('combos/anios')
  async getAnios(): Promise<{ success: true; data: AnnoOption[] }> {
    const data = await this.reporteInafectosService.getAnios();
    return { success: true, data };
  }

  @Get('combos/usos')
  async getUsos(): Promise<{ success: true; data: UsoOption[] }> {
    const data = await this.reporteInafectosService.getUsos();
    return { success: true, data };
  }

  @Post('search')
  async search(
    @Body() dto: SearchReporteInafectosDto,
  ): Promise<{ success: true } & PaginatedResponse<ReporteInafectosRow>> {
    let parsed: SearchReporteInafectosDto;
    try {
      parsed = SearchReporteInafectosSchema.parse(dto);
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
    const result = await this.reporteInafectosService.search(parsed);
    return { success: true, ...result };
  }

  @Get('export')
  async exportAll(
    @Query('anno') anno: string,
    @Query('id_uso') id_uso?: string,
  ): Promise<{ success: true; data: ReporteInafectosRow[] }> {
    if (!anno) {
      throw new BadRequestException({
        success: false,
        error: 'El año es requerido para exportar.',
      });
    }
    const data = await this.reporteInafectosService.exportAll(anno, id_uso || '');
    return { success: true, data };
  }
}
