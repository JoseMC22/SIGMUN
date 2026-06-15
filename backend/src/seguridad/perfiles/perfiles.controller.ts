import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PerfilesService } from './perfiles.service';
import {
  SearchPerfilSchema,
  SearchPerfilDto,
} from './dto/search-perfil.dto';
import {
  PerfilRow,
  PaginatedResponse,
  PerfilDetail,
  ModuloRow,
  AccesoRow,
} from './dto/perfiles.types';

@Controller('seguridad/perfiles')
@UseGuards(JwtAuthGuard)
export class PerfilesController {
  constructor(private readonly perfilesService: PerfilesService) {}

  @Post('search')
  async search(
    @Body() dto: SearchPerfilDto,
  ): Promise<PaginatedResponse<PerfilRow>> {
    const parsed = SearchPerfilSchema.parse(dto);
    return this.perfilesService.search(parsed);
  }

  // ── Detail ────────────────────────────────────────────────

  @Get(':id')
  async getPerfilById(
    @Param('id') id: string,
  ): Promise<{ data: PerfilDetail }> {
    const data = await this.perfilesService.getPerfilById(id);
    return { data };
  }

  // ── Módulos ───────────────────────────────────────────────

  @Get('catalogos/modulos')
  async getModulos(): Promise<{ data: ModuloRow[] }> {
    const data = await this.perfilesService.getModulos();
    return { data };
  }

  // ── Accesos por módulo (con permisos del perfil) ─────────

  @Get('modulos/:idModulo/accesos/:idPerfil')
  async getAccesosByModulo(
    @Param('idModulo') idModulo: string,
    @Param('idPerfil') idPerfil: string,
  ): Promise<{ data: AccesoRow[] }> {
    const data = await this.perfilesService.getAccesosByModuloConPermisos(
      idModulo,
      idPerfil,
    );
    return { data };
  }
}
