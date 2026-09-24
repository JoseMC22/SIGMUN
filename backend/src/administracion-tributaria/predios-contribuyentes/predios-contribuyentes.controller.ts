import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrediosContribuyentesService } from './predios-contribuyentes.service';
import {
  SearchPrediosContribuyentesSchema,
  SearchPrediosContribuyentesDto,
} from './dto/search-predios-contribuyentes.dto';
import {
  PredioContribuyenteRow,
  PaginatedResponse,
} from './dto/predios-contribuyentes.types';

@Controller('administracion-tributaria/predios-contribuyentes')
@UseGuards(JwtAuthGuard)
export class PrediosContribuyentesController {
  constructor(
    private readonly prediosContribuyentesService: PrediosContribuyentesService,
  ) {}

  @Post('search')
  async search(
    @Body() dto: SearchPrediosContribuyentesDto,
  ): Promise<{ success: true } & PaginatedResponse<PredioContribuyenteRow>> {
    let parsed: SearchPrediosContribuyentesDto;
    try {
      parsed = SearchPrediosContribuyentesSchema.parse(dto);
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
    const result = await this.prediosContribuyentesService.search(parsed);
    return { success: true, ...result };
  }
}