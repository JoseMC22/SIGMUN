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
  MviaItem,
  BuscarContribuyenteResult,
  ValidarRepresentanteResult,
  GuardarContribuyenteResult,
} from './dto/declaracion-jurada.types';
import {
  GuardarContribuyenteSchema,
  GuardarContribuyenteDto,
} from './dto/guardar-contribuyente.dto';

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

  // ── Combos Datos Domicilio Fiscal ────────────────────────

  @Get('combos/tipos-interior')
  async getTiposInterior(): Promise<{ success: true; data: { value: string; label: string }[] }> {
    const data = await this.service.getTiposInterior();
    return { success: true, data };
  }

  @Get('combos/tipos-edificacion')
  async getTiposEdificacion(): Promise<{ success: true; data: { value: string; label: string }[] }> {
    const data = await this.service.getTiposEdificacion();
    return { success: true, data };
  }

  @Get('combos/tipos-ingreso')
  async getTiposIngreso(): Promise<{ success: true; data: { value: string; label: string }[] }> {
    const data = await this.service.getTiposIngreso();
    return { success: true, data };
  }

  @Get('combos/tipos-agrupamiento')
  async getTiposAgrupamiento(): Promise<{ success: true; data: { value: string; label: string }[] }> {
    const data = await this.service.getTiposAgrupamiento();
    return { success: true, data };
  }

  // ── Búsqueda de vías (modal Domicilio Fiscal) ────────────

  @Get('search-vias')
  async searchVias(
    @Query('nombre_via') nombreVia: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ): Promise<PaginatedResponse<MviaItem>> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(pageSize ?? '10', 10) || 10));
    return this.service.searchVias(nombreVia ?? '', pageNum, size);
  }

  // ── Buscar contribuyente por nº documento (modal Representante) ──

  @Get('buscar-contribuyente')
  async buscarContribuyente(
    @Query('num_doc') numDoc: string,
  ): Promise<{ success: true; data: BuscarContribuyenteResult } | { success: false; error: string }> {
    try {
      const data = await this.service.buscarContribuyentePorDoc(numDoc ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al buscar contribuyente.',
      };
    }
  }

  // ── Validar si requiere representante (modal Nuevo Contribuyente) ──

  @Get('validar-representante')
  async validarRepresentante(
    @Query('num_doc') numDoc: string,
  ): Promise<{ success: true; data: ValidarRepresentanteResult } | { success: false; error: string }> {
    try {
      const data = await this.service.validarRepresentante(numDoc ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al validar representante.',
      };
    }
  }

  // ── Validar si requiere representante por código (modal Representante) ──

  @Get('validar-representante-por-codigo')
  async validarRepresentantePorCodigo(
    @Query('codigo') codigo: string,
  ): Promise<{ success: true; data: ValidarRepresentanteResult } | { success: false; error: string }> {
    try {
      const data = await this.service.validarRepresentantePorCodigo(codigo ?? '');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al validar representante por código.',
      };
    }
  }

  // ── Guardar contribuyente (modal Nuevo Contribuyente) ──

  @Post('guardar')
  async guardar(
    @Body() dto: GuardarContribuyenteDto,
  ): Promise<{ success: true; data: GuardarContribuyenteResult } | { success: false; error: string }> {
    let parsed: GuardarContribuyenteDto;
    try {
      parsed = GuardarContribuyenteSchema.parse(dto);
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
    try {
      const data = await this.service.guardar(parsed);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al guardar contribuyente.',
      };
    }
  }
}
