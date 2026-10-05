import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteFraccCuotasImpagasService } from './reporte-fracc-cuotas-impagas.service';
import {
  SearchFraccCuotasImpagasSchema,
  SearchFraccCuotasImpagasDto,
} from './dto/search-fracc-cuotas-impagas.dto';
import { FraccCuotasImpagasResult } from './reporte-fracc-cuotas-impagas.types';
import { z } from 'zod';

@Controller('cobranza/reporte-fracc-cuotas-impagas')
@UseGuards(JwtAuthGuard)
export class ReporteFraccCuotasImpagasController {
  constructor(
    private readonly service: ReporteFraccCuotasImpagasService,
  ) {}

  /** Búsqueda del reporte (SP Rentas.Rpt_Rentas_General @BUSC=42). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<FraccCuotasImpagasResult> {
    let dto: SearchFraccCuotasImpagasDto;
    try {
      dto = SearchFraccCuotasImpagasSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMsg =
          error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos';
        return {
          success: false,
          data: [],
          total: 0,
          page: 1,
          pageSize: 15,
          totalPages: 0,
          error: errorMsg,
        };
      }
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.search(dto);
  }
}