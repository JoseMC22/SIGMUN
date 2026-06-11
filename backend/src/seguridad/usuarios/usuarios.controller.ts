import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsuariosService } from './usuarios.service';
import {
  SearchUsuarioSchema,
  SearchUsuarioDto,
} from './dto/search-usuario.dto';
import { UpdateUsuarioDto, CambiarClaveDto } from './dto/update-usuario.dto';
import {
  UsuarioRow,
  UsuarioDetalle,
  AreaOption,
  PerfilOption,
  TipoDocumentoOption,
  CajeroOption,
  PaginatedResponse,
} from './dto/usuarios.types';

@Controller('seguridad/usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('search')
  async search(
    @Body() dto: SearchUsuarioDto,
  ): Promise<PaginatedResponse<UsuarioRow>> {
    const parsed = SearchUsuarioSchema.parse(dto);
    return this.usuariosService.search(parsed);
  }

  @Get('areas')
  async getAreas(): Promise<{ data: AreaOption[] }> {
    const data = await this.usuariosService.getAreas();
    return { data };
  }

  @Get('perfiles')
  async getPerfiles(): Promise<{ data: PerfilOption[] }> {
    const data = await this.usuariosService.getPerfiles();
    return { data };
  }

  @Get('catalogos/tipos-documento')
  async getTiposDocumento(): Promise<{ data: TipoDocumentoOption[] }> {
    const data = await this.usuariosService.getTiposDocumento();
    return { data };
  }

  @Get('catalogos/cajeros')
  async getCajeros(): Promise<{ data: CajeroOption[] }> {
    const data = await this.usuariosService.getCajeros();
    return { data };
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<{ data: UsuarioDetalle } | { success: false; error: string }> {
    const data = await this.usuariosService.getUserDetail(id);
    if (!data) return { success: false, error: 'Usuario no encontrado' };
    return { data };
  }

  @Post('update')
  async update(@Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.updateUsuario(dto);
  }

  @Post('eliminar')
  async eliminar(@Body() body: { id_usuario: string }) {
    return this.usuariosService.eliminarUsuario(body.id_usuario);
  }

  @Post('catalogos/crear-caja')
  async crearCaja(@Body() body: { caja: string }) {
    return this.usuariosService.crearCaja(body.caja);
  }

  @Post('cambiar-clave')
  async cambiarClave(@Body() dto: CambiarClaveDto) {
    return this.usuariosService.cambiarClave(dto);
  }
}
