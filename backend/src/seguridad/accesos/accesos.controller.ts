import { Controller, Post, Get, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccesosService } from './accesos.service';
import {
  SearchAccoSchema,
  SearchAccesoDto,
} from './dto/search-acceso.dto';
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
}
