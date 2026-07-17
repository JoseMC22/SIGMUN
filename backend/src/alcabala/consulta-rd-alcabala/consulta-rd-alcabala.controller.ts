import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConsultaRdAlcabalaService } from './consulta-rd-alcabala.service';
import {
  SearchRdAlcabalaSchema,
  SearchRdAlcabalaDto,
} from './dto/search-rd-alcabala.dto';
import { ConsultaRDResult } from './consulta-rd-alcabala.types';
import { z } from 'zod';

@Controller('alcabala/consulta-rd')
@UseGuards(JwtAuthGuard)
export class ConsultaRdAlcabalaController {
  constructor(private readonly service: ConsultaRdAlcabalaService) {}

  @Get()
  async search(@Query() query: Record<string, string>): Promise<ConsultaRDResult> {
    let dto: SearchRdAlcabalaDto;
    try {
      dto = SearchRdAlcabalaSchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: [],
          total: 0,
          page: 1,
          totalPages: 0,
          error: error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
        };
      }
      return {
        success: false,
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: 'Parámetros inválidos',
      };
    }
    return this.service.search(dto);
  }
}
