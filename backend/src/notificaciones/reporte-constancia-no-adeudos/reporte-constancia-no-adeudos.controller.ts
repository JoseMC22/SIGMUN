import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteConstanciaNoAdeudosService } from './reporte-constancia-no-adeudos.service';
import {
  SearchConstanciaNoAdeudosSchema,
  SearchConstanciaNoAdeudosDto,
} from './dto/search-constancia-no-adeudos.dto';
import { ConstanciaNoAdeudoResult } from './reporte-constancia-no-adeudos.types';
import { z } from 'zod';

@Controller('notificaciones/reporte-constancia-no-adeudos')
@UseGuards(JwtAuthGuard)
export class ReporteConstanciaNoAdeudosController {
  constructor(private readonly service: ReporteConstanciaNoAdeudosService) {}

  /** Búsqueda del reporte (SP Certificado.sp_certificado @BUSC='5'). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<ConstanciaNoAdeudoResult> {
    let dto: SearchConstanciaNoAdeudosDto;
    try {
      dto = SearchConstanciaNoAdeudosSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMsg =
          error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos';
        return {
          success: false,
          data: [],
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
          error: errorMsg,
        };
      }
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.search(dto);
  }
}
