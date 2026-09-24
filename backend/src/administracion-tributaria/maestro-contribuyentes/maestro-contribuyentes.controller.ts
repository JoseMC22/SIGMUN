import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MaestroContribuyentesService } from './maestro-contribuyentes.service';
import {
  SearchMaestroContribuyentesSchema,
  SearchMaestroContribuyentesDto,
} from './dto/search-maestro-contribuyentes.dto';
import {
  ContribuyenteRow,
  PaginatedResponse,
} from './dto/maestro-contribuyentes.types';

@Controller('administracion-tributaria/maestro-contribuyentes')
@UseGuards(JwtAuthGuard)
export class MaestroContribuyentesController {
  constructor(
    private readonly maestroContribuyentesService: MaestroContribuyentesService,
  ) {}

  @Post('search')
  async search(
    @Body() dto: SearchMaestroContribuyentesDto,
  ): Promise<{ success: true } & PaginatedResponse<ContribuyenteRow>> {
    let parsed: SearchMaestroContribuyentesDto;
    try {
      parsed = SearchMaestroContribuyentesSchema.parse(dto);
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
    const result = await this.maestroContribuyentesService.search(parsed);
    return { success: true, ...result };
  }
}