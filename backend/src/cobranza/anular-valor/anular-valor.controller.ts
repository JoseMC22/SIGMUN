import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnularValorService } from './anular-valor.service';
import {
  SearchAnularValorSchema,
  SearchAnularValorDto,
} from './dto/search-anular-valor.dto';
import { AnularValorResult } from './anular-valor.types';
import { z } from 'zod';

@Controller('cobranza/anular-valor')
@UseGuards(JwtAuthGuard)
export class AnularValorController {
  constructor(private readonly service: AnularValorService) {}

  /** Listado de contribuyentes (fase 1; sin anulación). */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: unknown): Promise<AnularValorResult> {
    let dto: SearchAnularValorDto;
    try {
      dto = SearchAnularValorSchema.parse(body);
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
