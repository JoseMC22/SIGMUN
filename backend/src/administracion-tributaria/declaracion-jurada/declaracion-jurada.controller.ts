import { Controller, Post, Get, Query, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeclaracionJuradaService } from './declaracion-jurada.service';
import {
  SearchDeclaracionJuradaSchema,
  SearchDeclaracionJuradaDto,
} from './dto/search-declaracion-jurada.dto';
import {
  ContribuyenteListItem,
  ContribuyenteDireccionItem,
  ContribuyentePlacaItem,
  PaginatedResponse,
  TipoDocumentoOption,
  TipoContribuyenteOption,
  SubTipoContribuyenteOption,
  DistritoOption,
} from './dto/declaracion-jurada.types';

@Controller('declaracion-jurada')
@UseGuards(JwtAuthGuard)
export class DeclaracionJuradaController {
  constructor(private readonly service: DeclaracionJuradaService) {}

  @Post('search')
  async search(
    @Body() dto: SearchDeclaracionJuradaDto,
  ): Promise<PaginatedResponse<ContribuyenteListItem | ContribuyenteDireccionItem | ContribuyentePlacaItem>> {
    let parsed: SearchDeclaracionJuradaDto;
    try {
      parsed = SearchDeclaracionJuradaSchema.parse(dto);
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
    return this.service.search(parsed);
  }

  // ── Combos para el modal de registro ──────────────────────

  @Get('combos/tipos-documento')
  async getTiposDocumento(): Promise<{ success: true; data: TipoDocumentoOption[] }> {
    const data = await this.service.getTiposDocumento();
    return { success: true, data };
  }

  @Get('combos/tipos-contribuyente')
  async getTiposContribuyente(): Promise<{ success: true; data: TipoContribuyenteOption[] }> {
    const data = await this.service.getTiposContribuyente();
    return { success: true, data };
  }

  @Get('combos/subtipos-contribuyente')
  async getSubTiposContribuyente(
    @Query('idTipoContri') idTipoContri: string,
  ): Promise<{ success: true; data: SubTipoContribuyenteOption[] }> {
    const data = await this.service.getSubTiposContribuyente(idTipoContri ?? '');
    return { success: true, data };
  }

  @Get('combos/distritos')
  async getDistritos(): Promise<{ success: true; data: DistritoOption[] }> {
    const data = await this.service.getDistritos();
    return { success: true, data };
  }
}
