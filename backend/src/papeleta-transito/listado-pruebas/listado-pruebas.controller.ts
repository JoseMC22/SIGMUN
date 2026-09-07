import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ListadoPruebasService } from './listado-pruebas.service';
import {
  SearchInfraccionSchema,
  SearchInfraccionDto,
} from '../listado-de-infracciones/dto/search-infraccion.dto';
import {
  InfraccionRow,
  PaginatedResponse,
} from '../listado-de-infracciones/dto/listado-de-infracciones.types';

@Controller('papeleta-transito/listado-pruebas')
@UseGuards(JwtAuthGuard)
export class ListadoPruebasController {
  constructor(
    private readonly listadoPruebasService: ListadoPruebasService,
  ) {}

  @Post('search')
  async search(
    @Body() dto: SearchInfraccionDto,
  ): Promise<PaginatedResponse<InfraccionRow>> {
    const parsed = SearchInfraccionSchema.parse(dto);
    return this.listadoPruebasService.search(parsed);
  }
}
