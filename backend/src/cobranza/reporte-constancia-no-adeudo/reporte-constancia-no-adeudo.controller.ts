import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteConstanciaNoAdeudoService } from './reporte-constancia-no-adeudo.service';
import {
  SearchConstanciaNoAdeudoSchema,
  SearchConstanciaNoAdeudoDto,
} from './dto/search-constancia-no-adeudo.dto';
import { ConstanciaNoAdeudoResult } from './reporte-constancia-no-adeudo.types';
import { z } from 'zod';

@Controller('cobranza/reporte-constancia-no-adeudo')
@UseGuards(JwtAuthGuard)
export class ReporteConstanciaNoAdeudoController {
  constructor(
    private readonly service: ReporteConstanciaNoAdeudoService,
  ) {}

  /** Búsqueda del reporte (SP Certificado.sp_certificado @BUSC='5'). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<ConstanciaNoAdeudoResult> {
    let dto: SearchConstanciaNoAdeudoDto;
    try {
      dto = SearchConstanciaNoAdeudoSchema.parse(body);
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