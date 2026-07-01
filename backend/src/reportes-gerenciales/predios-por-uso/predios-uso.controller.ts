import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrediosUsoService } from './predios-uso.service';
import {
  SearchPredioUsoSchema,
  SearchPredioUsoDto,
} from './dto/search-predio-uso.dto';
import {
  PredioUsoRow,
  PaginatedResponse,
  SpTipoUsoRow,
} from './dto/predios-uso.types';

@Controller('reportes-gerenciales/predios-uso')
@UseGuards(JwtAuthGuard)
export class PrediosUsoController {
  constructor(private readonly prediosUsoService: PrediosUsoService) {}

  @Post('search')
  async search(
    @Body() dto: SearchPredioUsoDto,
  ): Promise<PaginatedResponse<PredioUsoRow>> {
    const parsed = SearchPredioUsoSchema.parse(dto);
    return this.prediosUsoService.search(parsed);
  }

  @Get('combos/tipos-uso')
  async getTiposUso(): Promise<{ success: true; data: SpTipoUsoRow[] }> {
    const data = await this.prediosUsoService.getTiposUso();
    return { success: true, data };
  }
}
