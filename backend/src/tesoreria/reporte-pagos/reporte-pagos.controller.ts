import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportePagosService } from './reporte-pagos.service';
import {
  SearchReportePagosSchema,
  SearchReportePagosDto,
} from './dto/search-reporte-pagos.dto';

@Controller('tesoreria/reporte-pagos')
@UseGuards(JwtAuthGuard)
export class ReportePagosController {
  constructor(private readonly service: ReportePagosService) {}

  /** Búsqueda del "Parte Diario" (`Caja.sp_rptTesoreria` @buscar=9). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() dto: SearchReportePagosDto) {
    let parsed: SearchReportePagosDto;
    try {
      parsed = SearchReportePagosSchema.parse(dto);
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
    return this.service.search(parsed);
  }

  /** Reimpresión interna del recibo (replica los templates legacy). */
  @Get('recibo/:numIngr')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async recibo(
    @Param('numIngr') numIngr: string,
    @Query('tipo') tipo?: string,
    @Query('reimp') reimp?: string,
  ) {
    const html = await this.service.getReciboHtml(
      numIngr,
      tipo ?? '1',
      reimp === '1' || reimp === 'true',
    );
    return html;
  }
}
