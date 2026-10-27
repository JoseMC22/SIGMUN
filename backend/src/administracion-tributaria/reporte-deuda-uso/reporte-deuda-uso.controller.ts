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
import { ReporteDeudaUsoService } from './reporte-deuda-uso.service';
import {
  SearchReporteDeudaUsoSchema,
  SearchReporteDeudaUsoDto,
} from './dto/search-reporte-deuda-uso.dto';
import {
  ReporteDeudaUsoRow,
  AnnoOption,
  UsoOption,
  PaginatedResponse,
} from './dto/reporte-deuda-uso.types';

@Controller('administracion-tributaria/reporte-deuda-uso')
@UseGuards(JwtAuthGuard)
export class ReporteDeudaUsoController {
  constructor(
    private readonly reporteDeudaUsoService: ReporteDeudaUsoService,
  ) {}

  @Get('combos/anios')
  async getAnios(): Promise<{ success: true; data: AnnoOption[] }> {
    const data = await this.reporteDeudaUsoService.getAnios();
    return { success: true, data };
  }

  @Get('combos/usos')
  async getUsos(): Promise<{ success: true; data: UsoOption[] }> {
    const data = await this.reporteDeudaUsoService.getUsos();
    return { success: true, data };
  }

  @Post('search')
  async search(
    @Body() dto: SearchReporteDeudaUsoDto,
  ): Promise<{ success: true } & PaginatedResponse<ReporteDeudaUsoRow>> {
    let parsed: SearchReporteDeudaUsoDto;
    try {
      parsed = SearchReporteDeudaUsoSchema.parse(dto);
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
    const result = await this.reporteDeudaUsoService.search(parsed);
    return { success: true, ...result };
  }

  @Get('export')
  async exportAll(
    @Query('anno') anno: string,
    @Query('id_uso') id_uso?: string,
  ): Promise<{ success: true; data: ReporteDeudaUsoRow[] }> {
    if (!anno) {
      throw new BadRequestException({
        success: false,
        error: 'El año es requerido para exportar.',
      });
    }
    const data = await this.reporteDeudaUsoService.exportAll(anno, id_uso || '');
    return { success: true, data };
  }
}
