import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConsultaValoresService } from './consulta-valores.service';
import {
  SearchConsultaValoresSchema,
  SearchConsultaValoresDto,
} from './dto/search-consulta-valores.dto';
import { ConsultaValoresResult } from './consulta-valores.types';
import { z } from 'zod';

@Controller('cobranza/consulta-valores')
@UseGuards(JwtAuthGuard)
export class ConsultaValoresController {
  constructor(private readonly service: ConsultaValoresService) {}

  /** Búsqueda de valores (SP Rentas.SP_Consultadocu @msquery=1, COUNT @msquery=2). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<ConsultaValoresResult> {
    let dto: SearchConsultaValoresDto;
    try {
      dto = SearchConsultaValoresSchema.parse(body);
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
