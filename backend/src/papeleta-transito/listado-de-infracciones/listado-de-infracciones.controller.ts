import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ListadoDeInfraccionesService } from './listado-de-infracciones.service';
import {
  SearchInfraccionSchema,
  SearchInfraccionDto,
} from './dto/search-infraccion.dto';
import {
  InfraccionRow,
  PaginatedResponse,
} from './dto/listado-de-infracciones.types';

@Controller('papeleta-transito/listado-de-infracciones')
@UseGuards(JwtAuthGuard)
export class ListadoDeInfraccionesController {
  constructor(
    private readonly listadoDeInfraccionesService: ListadoDeInfraccionesService,
  ) {}

  @Post('search')
  async search(
    @Body() dto: SearchInfraccionDto,
  ): Promise<PaginatedResponse<InfraccionRow>> {
    const parsed = SearchInfraccionSchema.parse(dto);
    return this.listadoDeInfraccionesService.search(parsed);
  }
}
