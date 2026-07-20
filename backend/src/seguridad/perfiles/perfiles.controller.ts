import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PerfilesService } from './perfiles.service';
import { SearchPerfilSchema, SearchPerfilDto } from './dto/search-perfil.dto';
import { SavePerfilSchema, SavePerfilDto } from './dto/save-perfil.dto';
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

  // ── Save / Update ─────────────────────────────────────────

  @Post('save')
  async save(@Body() dto: SavePerfilDto): Promise<{ data: { id: string } }> {
    const parsed = SavePerfilSchema.parse(dto);
    const data = await this.perfilesService.save(parsed);
    return { data };
  }

  // ── Delete ─────────────────────────────────────────────────

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.perfilesService.delete(id);
    return { success: true };
  }

  // ── Detail ────────────────────────────────────────────────

  @Get(':id')
  async getPerfilById(
    @Param('id') id: string,
  ): Promise<{ data: PerfilDetail }> {
    const data = await this.perfilesService.getPerfilById(id);
    return { data };
  }

  // ── Objetos por acceso (con permisos del perfil) ────────────

  @Get('accesos/:idAcceso/objetos/:idPerfil')
  async getObjetosByAcceso(
    @Param('idAcceso') idAcceso: string,
    @Param('idPerfil') idPerfil: string,
  ): Promise<{ data: any[] }> {
    const data = await this.perfilesService.getObjetosByAccesoConPermisos(
      idAcceso,
      idPerfil,
    );
    return { data };
  }

  // ── Toggle acceso permiso ──────────────────────────────────

  @Post('toggle-acceso')
  async toggleAcceso(
    @Body() body: { id_perfil: string; id_acceso: string; bacceso: string },
  ): Promise<{ success: boolean }> {
    await this.perfilesService.toggleAccesoPermiso(
      body.id_perfil,
      body.id_acceso,
      body.bacceso,
    );
    return { success: true };
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
