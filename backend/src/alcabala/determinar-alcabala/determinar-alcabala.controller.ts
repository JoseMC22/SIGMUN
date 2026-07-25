import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeterminarAlcabalaService } from './determinar-alcabala.service';
import {
  SearchContribuyenteSchema,
  SearchContribuyenteDto,
} from './dto/search-contribuyente.dto';
import { ContribuyenteSearchResult, AlcabalasResult } from './determinar-alcabala.types';
import { z } from 'zod';

@Controller('alcabala/determinar-alcabala')
@UseGuards(JwtAuthGuard)
export class DeterminarAlcabalaController {
  constructor(private readonly service: DeterminarAlcabalaService) {}

  @Get('buscar-contribuyente')
  async searchContribuyente(
    @Query() query: Record<string, string>,
  ): Promise<ContribuyenteSearchResult> {
    let dto: SearchContribuyenteDto;
    try {
      dto = SearchContribuyenteSchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: [],
          total: 0,
          page: 1,
          pageSize: 15,
          totalPages: 0,
          error: error.issues.map((i) => i.message).join(', ') || 'Parámetros inválidos',
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
    return this.service.searchContribuyente(dto);
  }

  @Get('alcabalas/:codigo')
  async getAlcabalas(
    @Param('codigo') codigo: string,
  ): Promise<AlcabalasResult> {
    return this.service.getAlcabalasByContribuyente(codigo);
  }
}