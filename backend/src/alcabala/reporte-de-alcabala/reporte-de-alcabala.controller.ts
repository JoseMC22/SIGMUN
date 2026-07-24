import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReporteDeAlcabalaService } from './reporte-de-alcabala.service';
import {
  SearchDeAlcabalaSchema,
} from './dto/search-de-alcabala.dto';
import {
  DeAlcabalaRow,
  PaginatedResponse,
} from './de-alcabala.types';
import { z } from 'zod';

@Controller('alcabala/reporte-de-alcabala')
@UseGuards(JwtAuthGuard)
export class ReporteDeAlcabalaController {
  constructor(
    private readonly reporteDeAlcabalaService: ReporteDeAlcabalaService,
  ) {}

  @Post('search')
  async search(
    @Body() body: Record<string, unknown>,
  ): Promise<PaginatedResponse<DeAlcabalaRow>> {
    console.log('[DJ-Alcabala] ← REQUEST BODY:', JSON.stringify(body));
    let parsed;
    try {
      parsed = SearchDeAlcabalaSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[DJ-Alcabala] ← Zod errors:', JSON.stringify(error.errors));
        return {
          data: [],
          total: 0,
          page: 1,
          pageSize: 15,
          totalPages: 0,
        };
      }
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      };
    }
    console.log('[DJ-Alcabala] ← PARSED DTO:', JSON.stringify(parsed));
    const result = await this.reporteDeAlcabalaService.search(parsed);
    console.log('[DJ-Alcabala] → RESPONSE:', JSON.stringify({
      total: result.total,
      page: result.page,
      dataCount: result.data.length,
      firstRow: result.data[0] ?? null,
    }));
    return result;
  }
}