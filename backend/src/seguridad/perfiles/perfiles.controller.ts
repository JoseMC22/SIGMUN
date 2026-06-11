import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PerfilesService } from './perfiles.service';
import {
  SearchPerfilSchema,
  SearchPerfilDto,
} from './dto/search-perfil.dto';
import {
  PerfilRow,
  PaginatedResponse,
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
}
