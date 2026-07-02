import { Controller, Post, Get, Query, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccesosService } from './accesos.service';
import {
  SearchAccoSchema,
  SearchAccesoDto,
} from './dto/search-acceso.dto';
import {
  SaveAccoSchema,
  SaveAccesoDto,
} from './dto/save-acceso.dto';
import {
  AccesoRow,
  PaginatedResponse,
  MenuOption,
} from './dto/accesos.types';

@Controller('seguridad/accesos')
@UseGuards(JwtAuthGuard)
export class AccesosController {
  constructor(private readonly accesosService: AccesosService) {}

  @Post('search')
  async search(
    @Body() dto: SearchAccesoDto,
  ): Promise<PaginatedResponse<AccesoRow>> {
    const parsed = SearchAccoSchema.parse(dto);
    return this.accesosService.search(parsed);
  }

  // ── Menús ──────────────────────────────────────────────

  @Get('menus')
  async getMenus(): Promise<{ data: MenuOption[] }> {
    const data = await this.accesosService.getMenus();
    return { data };
  }

  // ── Módulos por menú ──────────────────────────────────

  @Get('modulos')
  async getModulos(
    @Query('menuId') menuId: string,
  ): Promise<{ data: MenuOption[] }> {
    const data = await this.accesosService.getModulos(menuId);
    return { data };
  }

  // ── Acceso por ID (@busc='3') ─────────────────────────

  @Get(':id')
  async getById(@Param('id') id: string): Promise<{ data: AccesoRow }> {
    const data = await this.accesosService.getById(id);
    if (!data) throw new NotFoundException(`Acceso ${id} no encontrado`);
    return { data };
  }

  // ── Guardar (@busc='1') ──────────────────────────────

  @Post()
  async save(@Body() dto: SaveAccesoDto): Promise<{ data: { id_acceso: string } }> {
    const parsed = SaveAccoSchema.parse(dto);
    const result = await this.accesosService.save(parsed);
    return { data: result };
  }
}
