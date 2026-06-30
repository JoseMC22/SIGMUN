import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ModelosService } from './modelos.service';
import { SearchModeloSchema, SearchModeloDto } from './dto/search-modelo.dto';
import { SaveModeloDto } from './dto/save-modelo.dto';
import {
  ModeloRow,
  ModeloDetalle,
  CatalogoOption,
  PaginatedResponse,
} from './dto/modelos.types';

@Controller('impuesto-vehicular/modelos')
@UseGuards(JwtAuthGuard)
export class ModelosController {
  constructor(private readonly modelosService: ModelosService) {}

  @Post('search')
  async search(
    @Body() dto: SearchModeloDto,
  ): Promise<PaginatedResponse<ModeloRow>> {
    const parsed = SearchModeloSchema.parse(dto);
    return this.modelosService.search(parsed);
  }

  // Static routes must come BEFORE :id param route to avoid route conflict
  @Get('catalogos/marcas')
  async getMarcas(): Promise<{ data: CatalogoOption[] }> {
    const data = await this.modelosService.getMarcas();
    return { data };
  }

  @Get('catalogos/categorias')
  async getCategorias(): Promise<{ data: CatalogoOption[] }> {
    const data = await this.modelosService.getCategorias();
    return { data };
  }

  @Get(':id')
  async getDetail(
    @Param('id') id: string,
  ): Promise<{ data: ModeloDetalle } | { success: false; error: string }> {
    const data = await this.modelosService.getDetail(id);
    if (!data) return { success: false, error: 'Modelo no encontrado' };
    return { data };
  }

  @Post('save')
  async save(
    @Body() dto: SaveModeloDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.modelosService.save(dto);
  }

  @Post('eliminar')
  async eliminar(
    @Body() body: { id: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.modelosService.eliminar(body.id);
  }
}
