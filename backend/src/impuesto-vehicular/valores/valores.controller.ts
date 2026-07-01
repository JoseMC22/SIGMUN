import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ValoresService } from './valores.service';
import {
  SearchValorSchema,
  SearchValorDto,
} from './dto/search-valor.dto';
import { SaveValorDto } from './dto/save-valor.dto';
import {
  ValorRow,
  ValorDetalle,
  CatalogoOption,
  PaginatedResponse,
} from './dto/valores.types';

@Controller('impuesto-vehicular/valores')
@UseGuards(JwtAuthGuard)
export class ValoresController {
  constructor(private readonly valoresService: ValoresService) {}

  @Post('search')
  async search(
    @Body() dto: SearchValorDto,
  ): Promise<PaginatedResponse<ValorRow>> {
    const parsed = SearchValorSchema.parse(dto);
    return this.valoresService.search(parsed);
  }

  // Static routes must come BEFORE :id param route to avoid route conflict
  @Get('catalogos/categorias')
  async getCategorias(): Promise<{ data: CatalogoOption[] }> {
    const data = await this.valoresService.getCategorias();
    return { data };
  }

  @Get('catalogos/marcas')
  async getMarcas(): Promise<{ data: CatalogoOption[] }> {
    const data = await this.valoresService.getMarcas();
    return { data };
  }

  @Post('catalogos/modelos')
  async getModelosFiltrados(
    @Body() body: { id_categoria: string; id_marca: string },
  ): Promise<{ data: CatalogoOption[] }> {
    const data = await this.valoresService.getModelosFiltrados(
      body.id_categoria,
      body.id_marca,
    );
    return { data };
  }

  @Get('catalogos/anios-ejercicio')
  async getAniosEjercicio(): Promise<{ data: CatalogoOption[] }> {
    const data = await this.valoresService.getAniosEjercicio();
    return { data };
  }

  @Get('catalogos/anios')
  async getAnios(): Promise<{ data: CatalogoOption[] }> {
    const data = await this.valoresService.getAnios();
    return { data };
  }

  @Get(':id')
  async getDetail(
    @Param('id') id: string,
  ): Promise<{ data: ValorDetalle } | { success: false; error: string }> {
    const data = await this.valoresService.getDetail(id);
    if (!data) return { success: false, error: 'Valor no encontrado' };
    return { data };
  }

  @Post('save')
  async save(
    @Body() dto: SaveValorDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.valoresService.save(dto);
  }

  @Post('eliminar')
  async eliminar(
    @Body() body: { id: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.valoresService.eliminar(body.id);
  }
}
